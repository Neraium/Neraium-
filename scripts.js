(() => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const header = document.querySelector('.site-header');
  if (header) {
    let pending = false;
    const updateHeader = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 16);
      pending = false;
    };
    updateHeader();
    window.addEventListener('scroll', () => {
      if (!pending) { pending = true; requestAnimationFrame(updateHeader); }
    }, { passive: true });
  }

  const nav = document.getElementById('main-navigation');
  const toggleButton = document.querySelector('.nav-toggle');
  if (nav && toggleButton) {
    const headerAction = document.querySelector('.header-action');
    if (headerAction) {
      const mobileAction = headerAction.cloneNode(true);
      mobileAction.classList.remove('header-action');
      mobileAction.classList.add('nav-contact');
      nav.appendChild(mobileAction);
    }
    const pathname = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
    const activePath = ['/water-wastewater', '/hospitality', '/infrastructure'].includes(pathname) ? '/applications' : pathname;
    nav.querySelectorAll('a').forEach(link => {
      if (link.getAttribute('href') === activePath) link.setAttribute('aria-current', 'page');
    });
    const mobileViewport = window.matchMedia('(max-width: 1120px)');
    const background = document.querySelectorAll('main, footer, .skip-link');
    const setExpanded = (expanded) => {
      nav.classList.toggle('open', expanded);
      toggleButton.setAttribute('aria-expanded', String(expanded));
      toggleButton.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation');
      document.body.classList.toggle('navigation-open', expanded);
      document.documentElement.classList.toggle('navigation-open', expanded);
      background.forEach(element => { element.inert = expanded; });
    };
    toggleButton.addEventListener('click', (event) => {
      const expanded = toggleButton.getAttribute('aria-expanded') !== 'true';
      setExpanded(expanded);
      if (expanded && event.detail === 0) nav.querySelector('a')?.focus({ preventScroll: true });
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setExpanded(false)));
    document.addEventListener('click', (event) => {
      if (nav.classList.contains('open') && !header.contains(event.target)) setExpanded(false);
    });
    document.addEventListener('keydown', (event) => {
      if (!nav.classList.contains('open')) return;
      if (event.key === 'Escape') { setExpanded(false); toggleButton.focus({ preventScroll: true }); }
      if (event.key === 'Tab') {
        const focusable = [...header.querySelectorAll('a, button')].filter(element => element.getClientRects().length);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus({ preventScroll: true }); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus({ preventScroll: true }); }
      }
    });
    mobileViewport.addEventListener('change', () => setExpanded(false));
  }

  const printButton = document.querySelector('[data-print-brief]');
  if (printButton) printButton.addEventListener('click', () => window.print());

  const form = document.getElementById('contact-form');
  const feedback = document.getElementById('form-feedback');
  if (!form || !feedback) return;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  let online = false;
  let token = '';
  let widget;
  const showStatus = (state, message) => {
    feedback.replaceChildren();
    feedback.dataset.state = state;
    feedback.textContent = message;
    feedback.focus();
  };
  const context = { 'water-wastewater': 'Municipal water / wastewater', hospitality: 'Hospitality / resort infrastructure', infrastructure: 'Broader infrastructure' };
  const industry = new URLSearchParams(window.location.search).get('industry');
  if (Object.hasOwn(context, industry)) document.getElementById('facility').value = context[industry];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  fetch('/api/contact-config', { signal: controller.signal, cache: 'no-store' })
    .then(async (response) => response.ok ? response.json() : { enabled: false })
    .then((config) => {
      if (config.enabled !== true || typeof config.siteKey !== 'string' || !config.siteKey.trim()) {
        document.getElementById('intake-description').textContent = 'Online submission is currently unavailable. Please email craig@neraium.com.';
        return;
      }
      online = true;
      button.textContent = 'Send evaluation request';
      document.getElementById('intake-description').textContent = 'Send a business inquiry directly to Neraium.';
      document.getElementById('form-transparency').firstChild.textContent = 'Your inquiry is processed through Cloudflare and sent to Neraium by email. See our ';
      const challenge = document.getElementById('contact-challenge');
      challenge.hidden = false;
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => {
        try {
          widget = window.turnstile.render(challenge, {
            sitekey: config.siteKey, action: 'evaluation', theme: 'dark', size: challenge.clientWidth < 300 ? 'compact' : 'flexible',
            callback: (value) => { token = value; },
            'expired-callback': () => { token = ''; },
            'timeout-callback': () => { token = ''; },
            'error-callback': () => { token = ''; showStatus('error', 'Security verification is unavailable. Please retry or email craig@neraium.com.'); },
          });
        } catch {
          online = false;
          showStatus('error', 'Security verification could not start. Please reload or email craig@neraium.com.');
        }
      };
      script.onerror = () => showStatus('error', 'Security verification could not load. Please email craig@neraium.com.');
      document.head.appendChild(script);
    }).catch(() => {
      document.getElementById('intake-description').textContent = 'Online submission could not be checked. Please retry or email craig@neraium.com.';
    })
    .finally(() => { clearTimeout(timeout); button.disabled = false; });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.getAttribute('aria-busy') === 'true') return;
    if (!online) {
      showStatus('error', 'Online submission is unavailable. Your details have not been sent. Please email craig@neraium.com.');
      return;
    }
    if (!form.reportValidity()) return;
    const value = (id) => document.getElementById(id)?.value.trim() || '';
    const keys = ['name', 'email', 'organization', 'facility', 'review-question', 'role', 'preferred-contact'];
    const data = Object.fromEntries(keys.map(key => [key, value(key)]));
    if (['name','email','organization','facility'].some(key => !data[key])) {
      showStatus('error', 'Please complete the required fields.'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      showStatus('error', 'Please enter a valid work email address.'); return;
    }
    if (value('website')) { showStatus('error', 'The request could not be accepted. Please email Neraium directly.'); return; }
    if (online && !token) { showStatus('error', 'Please complete the security verification before sending.'); return; }
    const idleLabel = 'Send evaluation request';
    form.setAttribute('aria-busy', 'true');
    button.disabled = true;
    button.textContent = 'Sending request…';
    try {
      const response = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, website: '', token }), signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok || result.accepted !== true) {
        const messages = { 400: 'Please check the fields and complete a new security verification.', 429: 'Too many requests. Please wait a minute before trying again.', 503: 'Online submission is unavailable. Please email craig@neraium.com.' };
        const error = new Error(messages[response.status] || 'Submission could not be confirmed. Please email craig@neraium.com.');
        error.publicMessage = true;
        throw error;
      }
      showStatus('success', 'Your request has been accepted for email delivery. This does not confirm inbox receipt.');
      form.reset();
    } catch (error) {
      const message = error.name === 'TimeoutError' || error.name === 'AbortError' ? 'Delivery could not be confirmed. Please email craig@neraium.com before retrying.' : 'Submission could not be confirmed. Please retry or email craig@neraium.com.';
      // Only display a known server response; never interpolate arbitrary HTML.
      showStatus('error', error.publicMessage ? error.message : message);
    } finally {
      token = '';
      form.removeAttribute('aria-busy');
      button.disabled = false;
      button.textContent = idleLabel;
      if (online && window.turnstile && widget !== undefined) {
        try { window.turnstile.reset(widget); } catch {
          online = false;
          if (feedback.dataset.state !== 'success') showStatus('error', 'Security verification could not be restarted. Your details are preserved. Please reload or email craig@neraium.com.');
        }
      }
    }
  });
})();
