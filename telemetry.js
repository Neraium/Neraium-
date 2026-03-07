<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Neraium | Technical</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
    rel="stylesheet"
  />
  <style>
    :root {
      --bg: #0a0c10;
      --bg-2: #10151c;
      --bg-3: #151b24;
      --card: #111722;
      --border: #202938;
      --text: #e8edf2;
      --muted: #91a0b3;
      --accent: #00d4ff;
      --accent-2: #4b7cff;
      --max: 1200px;
      --radius: 14px;
      --shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      background:
        radial-gradient(circle at top, rgba(0, 212, 255, 0.08), transparent 30%),
        var(--bg);
      color: var(--text);
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.6;
    }

    a { color: inherit; text-decoration: none; }

    .container {
      width: min(var(--max), calc(100% - 40px));
      margin: 0 auto;
    }

    .section { padding: 96px 0; }

    .eyebrow {
      display: inline-block;
      font-size: 12px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 700;
      margin-bottom: 16px;
    }

    h1, h2, h3 {
      line-height: 1.08;
      letter-spacing: -0.03em;
    }

    h1 { font-size: clamp(2.4rem, 5vw, 4.2rem); font-weight: 800; }
    h2 { font-size: clamp(2rem, 4vw, 3rem); font-weight: 750; }
    h3 { font-size: 1.05rem; font-weight: 650; }

    p.lead {
      font-size: clamp(1.02rem, 2vw, 1.16rem);
      color: var(--muted);
      max-width: 760px;
    }

    p.body {
      color: var(--muted);
      font-size: 0.97rem;
    }

    .nav {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: rgba(10, 12, 16, 0.82);
      backdrop-filter: blur(14px);
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }

    .nav-inner {
      min-height: 72px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 14px 0;
    }

    .brand {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.04em;
      white-space: nowrap;
    }

    .brand span { color: var(--accent); }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 22px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .nav-links a {
      color: var(--muted);
      font-size: 0.95rem;
      font-weight: 500;
      transition: color 0.2s ease;
    }

    .nav-links a:hover,
    .nav-links a.active {
      color: var(--text);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 46px;
      padding: 0 20px;
      border-radius: 999px;
      border: 1px solid transparent;
      font-weight: 650;
      font-size: 0.95rem;
      transition: transform 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
    }

    .btn:hover { transform: translateY(-1px); }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent), #75e7ff);
      color: #071017;
      box-shadow: 0 10px 30px rgba(0,212,255,0.18);
    }

    .btn-secondary {
      border-color: var(--border);
      color: var(--text);
      background: rgba(255,255,255,0.02);
    }

    .hero {
      padding: 72px 0 76px;
    }

    .hero-grid {
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      gap: 32px;
      align-items: center;
    }

    .hero-actions {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      margin-top: 22px;
    }

    .panel {
      background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015));
      border: 1px solid var(--border);
      border-radius: 20px;
      box-shadow: var(--shadow);
    }

    .code-panel {
      padding: 22px;
    }

    pre {
      overflow-x: auto;
      border-radius: 14px;
      background: var(--bg-3);
      border: 1px solid rgba(255,255,255,0.04);
      padding: 18px;
      color: #c7d6e6;
      font-size: 0.9rem;
      line-height: 1.65;
    }

    .section-head {
      margin-bottom: 40px;
    }

    .section-head h2 {
      margin-bottom: 14px;
    }

    .section-head p {
      max-width: 760px;
      color: var(--muted);
    }

    .band {
      background: var(--bg-2);
      border-top: 1px solid rgba(255,255,255,0.03);
      border-bottom: 1px solid rgba(255,255,255,0.03);
    }

    .grid-3,
    .grid-2 {
      display: grid;
      gap: 22px;
    }

    .grid-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .grid-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .card:hover {
      transform: translateY(-2px);
      border-color: rgba(0,212,255,0.2);
    }

    .card h3 {
      margin-bottom: 10px;
    }

    .card p {
      color: var(--muted);
      font-size: 0.95rem;
    }

    .cta {
      text-align: center;
      padding: 96px 0;
    }

    .cta .panel {
      padding: 42px 28px;
      background:
        radial-gradient(circle at top, rgba(0,212,255,0.08), transparent 40%),
        linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015));
    }

    .cta h2 {
      margin-bottom: 14px;
    }

    .cta p {
      max-width: 720px;
      margin: 0 auto 26px;
      color: var(--muted);
    }

    .footer {
      border-top: 1px solid rgba(255,255,255,0.04);
      padding: 28px 0 40px;
    }

    .footer-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }

    .footer-links {
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
      color: var(--muted);
      font-size: 0.92rem;
    }

    .footer-copy {
      color: var(--muted);
      font-size: 0.9rem;
    }

    @media (max-width: 980px) {
      .hero-grid,
      .grid-3,
      .grid-2 {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .nav-inner {
        align-items: flex-start;
        flex-direction: column;
      }

      .nav-links {
        width: 100%;
        gap: 14px;
      }

      .hero-actions {
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }

      .section {
        padding: 76px 0;
      }

      .code-panel,
      .cta .panel {
        padding: 22px;
      }
    }
  </style>
</head>
<body>
  <nav class="nav">
    <div class="container nav-inner">
      <a href="index.html" class="brand">Nera<span>ium</span></a>
      <div class="nav-links">
        <a href="index.html">Home</a>
        <a href="platform.html">Platform</a>
        <a href="technical.html" class="active">Technical</a>
        <a href="governance.html">Governance</a>
        <a href="index.html#contact" class="btn btn-primary">Request Pilot</a>
      </div>
    </div>
  </nav>

  <main>
    <section class="hero">
      <div class="container hero-grid">
        <div>
          <div class="eyebrow">Technical</div>
          <h1>Under the hood of structured infrastructure interpretation</h1>
          <p class="lead">
            Neraium combines multivariate statistical geometry, deterministic interpretation rules,
            and evidence-first output design to surface meaningful system deviation without relying on opaque prediction alone.
          </p>
          <div class="hero-actions">
            <a href="#geometry" class="btn btn-primary">Signal Geometry</a>
            <a href="#gate" class="btn btn-secondary">Interpretation Rules</a>
          </div>
        </div>

        <div class="panel code-panel">
<pre>// Compute multivariate deviation
let diff = sensorVector - meanVector;
let invCov = invert(covarianceMatrix);
let distance = Math.sqrt(diff^T * invCov * diff);

// Apply interpretation constraints
if (distance > threshold) {
  if (passesPersistence &&
      passesCorrelation &&
      withinPhysicalLimits) {
    admit();
  } else {
    suppress();
  }
} else {
  voidResult();
}</pre>
        </div>
      </div>
    </section>

    <section class="section band" id="geometry">
      <div class="container">
        <div class="section-head">
          <div class="eyebrow">Statistics</div>
          <h2>Multivariate geometry</h2>
          <p>
            Neraium evaluates the shape of the system, not just single signals in isolation. It uses covariance-aware
            methods to determine when a system’s overall behaviour has structurally shifted.
          </p>
        </div>

        <div class="grid-3">
          <div class="card">
            <h3>Covariance Modeling</h3>
            <p>Telemetry is transformed into relationships between signals so the platform understands how system variables move together.</p>
          </div>
          <div class="card">
            <h3>Mahalanobis Distance</h3>
            <p>Deviation is measured in a multivariate space that accounts for correlation, not just absolute magnitude.</p>
          </div>
          <div class="card">
            <h3>Adaptive Baselines</h3>
            <p>Recent operational windows refresh the baseline so the system remains useful in dynamic environments without ignoring drift.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="gate">
      <div class="container">
        <div class="section-head">
          <div class="eyebrow">Governance Logic</div>
          <h2>Deterministic interpretation constraints</h2>
          <p>
            Detection alone is insufficient. Neraium forces candidate signals through strict admissibility rules
            before any interpretation is surfaced to an operator.
          </p>
        </div>

        <div class="grid-3">
          <div class="card">
            <h3>Physical Boundaries</h3>
            <p>Signals must stay within the realm of physically valid interpretation or they are treated as instrumentation or data-quality issues.</p>
          </div>
          <div class="card">
            <h3>Temporal Persistence</h3>
            <p>Short-lived excursions are filtered out so only meaningful deviations with persistence move forward.</p>
          </div>
          <div class="card">
            <h3>Multi-Sensor Agreement</h3>
            <p>Interpretations require corroboration across related signals, reducing false positives caused by isolated anomalies.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section band">
      <div class="container">
        <div class="section-head">
          <div class="eyebrow">Evidence</div>
          <h2>Auditable records by default</h2>
          <p>
            Every interpretation decision is logged with context, constraints, and outcome so later reviewers can understand
            not just what happened, but why it was surfaced or suppressed.
          </p>
        </div>

        <div class="grid-3">
          <div class="card">
            <h3>Secure Ledger</h3>
            <p>Evaluation outcomes are stored in an append-only structure designed for traceability and review.</p>
          </div>
          <div class="card">
            <h3>Context Preservation</h3>
            <p>Baseline state, drift magnitude, timestamps, and interpretation logic are kept together in one defensible record.</p>
          </div>
          <div class="card">
            <h3>Post-Event Traceability</h3>
            <p>Operators, auditors, and investigators can reconstruct the exact reasoning path behind surfaced intelligence.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <div class="eyebrow">Deployment</div>
          <h2>Built for edge operation</h2>
          <p>
            Neraium runs as a non-intrusive read-only layer, close to the operational environment, so insight remains available
            even when cloud connectivity is limited or unavailable.
          </p>
        </div>

        <div class="grid-2">
          <div class="card">
            <h3>Edge Processing</h3>
            <p>Telemetry is processed locally to reduce dependency on constant upstream connectivity and preserve operational continuity.</p>
          </div>
          <div class="card">
            <h3>Non-Intrusive Role</h3>
            <p>The platform does not issue commands or alter system behavior. It interprets and documents, leaving authority with operators.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="cta">
      <div class="container">
        <div class="panel">
          <div class="eyebrow">Next Step</div>
          <h2>See how technical logic meets governance</h2>
          <p>
            Explore the operating boundaries and governance framework that keep Neraium disciplined, auditable, and strictly read-only.
          </p>
          <a href="governance.html" class="btn btn-primary">Go to Governance</a>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="container footer-inner">
      <div class="brand">Nera<span>ium</span></div>
      <div class="footer-links">
        <a href="index.html">Home</a>
        <a href="platform.html">Platform</a>
        <a href="technical.html">Technical</a>
        <a href="governance.html">Governance</a>
      </div>
      <div class="footer-copy">© 2026 Neraium. All rights reserved.</div>
    </div>
  </footer>
</body>
</html>