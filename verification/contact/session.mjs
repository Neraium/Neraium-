const sequence = ['success', 'replay', 'failure', 'recovery', 'capture', 'expiry', 'validation', 'rate-limit'];
const expected = { success:200, replay:400, failure:502, recovery:200, expiry:400, validation:400 };
const response = (body, status = 200) => Response.json(body, { status });
const validHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

// Separate Worker/class/namespace. The production v1/v2 migration ledger is never reused.
export class IsolatedVerificationSession {
  constructor(state) { this.storage = state.storage; this.now = () => Date.now(); }

  async fetch(request) {
    if (request.method !== 'POST') return response({ error:'Not found.' },404);
    let data;
    try { data = await request.json(); } catch { return response({ error:'Rejected.' },400); }
    const operation = new URL(request.url).pathname;
    const result = await this.storage.transaction(async tx => {
      let session = await tx.get('session');
      const now = this.now();
      if (operation === '/init') {
        if (!data || !/^[a-f0-9]{32}$/.test(data.id ?? '') || (!Number.isFinite(data.issued_at) || !Number.isFinite(data.expires_at))
          || data.issued_at > now || data.expires_at <= now || data.expires_at - data.issued_at > 1200000
          || data.expires_at <= data.issued_at || typeof data.hostname !== 'string' || !validHash(data.subject_sha256)) return response({error:'Rejected.'},400);
        if (session) {
          if (session.id !== data.id || session.expires_at !== data.expires_at || session.subject_sha256 !== data.subject_sha256 || session.hostname !== data.hostname || session.revoked || session.expires_at <= now) return response({error:'Unavailable.'},404);
          return response({ready:true});
        }
        session = { id:data.id, issued_at:data.issued_at, expires_at:data.expires_at, hostname:data.hostname,
          subject_sha256:data.subject_sha256, started_at:new Date(now).toISOString(), step:0,
          consumed:false, revoked:false, used:[], results:[], attempts:[], rate_limit_statuses:[] };
        await tx.put('session',session);
        return response({ready:true});
      }
      if (!session || session.revoked || session.expires_at <= now) return response({error:'Unavailable.'},404);
      if (operation === '/consume') {
        if (session.consumed) return response({error:'Unavailable.'},409);
        session.consumed = true;
      } else if (operation === '/revoke') {
        session.revoked = true;
      } else if (operation === '/state') {
        if (!session.consumed) return response({error:'Unavailable.'},404);
        return response(this.snapshot(session));
      } else if (operation === '/capture') {
        if (!session.consumed || session.inflight || sequence[session.step] !== 'capture' || !validHash(data.hash) || session.used.includes(data.hash)) return response({error:'Capture requires a fresh unused token at the capture step.'},409);
        session.capture = { hash:data.hash, at:now };
        session.step++;
      } else if (operation === '/begin') {
        if (!session.consumed || session.inflight || sequence[session.step] !== data.scenario || !validHash(data.hash)) return response({error:'Complete the expected step; concurrent tests are rejected.'},409);
        if (data.scenario === 'replay') {
          if (data.hash !== session.success_hash) return response({error:'Replay must use the exact successful token.'},409);
        } else if (data.scenario === 'expiry') {
          if (session.capture?.attempted) return response({error:'The captured token has already been attempted. Start a new session for genuine unused-token expiry.'},409);
          if (data.hash !== session.capture?.hash || now - session.capture.at < 310000) return response({error:'Keep the captured token unused for at least 310 seconds.'},409);
          session.capture.attempted = true;
        } else if (session.used.includes(data.hash)) return response({error:'Use a fresh unused challenge token.'},409);
        const lease = crypto.randomUUID();
        session.inflight = { lease, scenario:data.scenario, hash:data.hash };
        if (data.scenario !== 'replay') session.used.push(data.hash);
        await tx.put('session',session);
        return response({lease});
      } else if (operation === '/finish') {
        if (!session.inflight || data.lease !== session.inflight.lease) return response({error:'Unknown attempt.'},409);
        const { scenario, hash } = session.inflight;
        delete session.inflight;
        const observed = { scenario, http_status:data.status, observed_at:new Date(now).toISOString(),
          challenge_checked:data.challenge_checked === true, challenge_valid:data.challenge_valid === true,
          duplicate_or_expired:data.duplicate_or_expired === true,
          provider_success:typeof data.provider_success === 'boolean' ? data.provider_success : null,
          context_matches:typeof data.context_matches === 'boolean' ? data.context_matches : null };
        const validStatus = Number.isInteger(data.status) && data.status >= 100 && data.status <= 599;
        let passed = validStatus && data.status === expected[scenario];
        if (['success','failure','recovery'].includes(scenario)) passed &&= observed.challenge_checked && observed.challenge_valid;
        if (scenario === 'replay') passed &&= observed.challenge_checked && !observed.challenge_valid && observed.provider_success === false && observed.duplicate_or_expired;
        if (scenario === 'expiry') {
          observed.captured_at = new Date(session.capture.at).toISOString();
          observed.captured_age_seconds = Math.floor((now - session.capture.at) / 1000);
          passed &&= observed.challenge_checked && !observed.challenge_valid && observed.provider_success === false && observed.duplicate_or_expired && observed.captured_age_seconds >= 310;
        }
        if (scenario === 'validation') passed &&= !observed.challenge_checked && !observed.challenge_valid;
        if (scenario === 'rate-limit') {
          session.rate_limit_statuses = Array.isArray(data.statuses) ? data.statuses.filter(s=>Number.isInteger(s)&&s>=100&&s<=599).slice(0,8) : [];
          passed = session.rate_limit_statuses.includes(429);
        }
        if (session.attempts.length >= 40) { session.revoked = true; await tx.put('session',session); return response({error:'Attempt limit reached.'},429); }
        session.attempts.push({ ...observed, passed });
        if (passed) {
          if (scenario === 'success') session.success_hash = hash;
          if (scenario !== 'rate-limit') session.results.push(observed);
          session.step++;
          if (session.step === sequence.length) session.completed_at = new Date(now).toISOString();
        }
      } else return response({error:'Not found.'},404);
      await tx.put('session',session);
      return response(this.snapshot(session));
    });
    if (operation === '/init' && result.ok) await this.storage.setAlarm(data.expires_at);
    return result;
  }

  snapshot(session) {
    return { schema:'neraium.isolated-contact-verifier.v1', candidate_only:true,
      human_attestation:'Required separately from the real operator; this service cannot attest human participation.',
      session_id:session.id, hostname:session.hostname, subject_sha256:session.subject_sha256, started_at:session.started_at,
      expires_at:new Date(session.expires_at).toISOString(), completed_at:session.completed_at ?? null,
      next_step:sequence[session.step] ?? null, scenario_checks_complete:session.step === sequence.length,
      results:session.results, attempts:session.attempts, rate_limit_statuses:session.rate_limit_statuses,
      limitations:['Separate origin, widget, limiter and storage; not a production delivery test.',
        'Not accepted by the existing production activation guard; no evidence is promoted automatically.'] };
  }

  async alarm() { await this.storage.deleteAll(); }
}
