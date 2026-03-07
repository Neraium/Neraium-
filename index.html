<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Neraium Technical - Under the Hood</title>
  <!-- Import Inter font for consistent typography -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
  <style>
    /* Base reset and colour variables */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    :root {
      --bg: #0a0c10;
      --bg2: #0f1319;
      --accent: #00d4ff;
      --accent2: #0066ff;
      --text: #e8edf2;
      --muted: #8892a0;
      --border: #1e2530;
      --card: #111620;
    }
    html {
      scroll-behaviour: smooth;
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 16px;
      line-height: 1.6;
    }
    a {
      color: inherit;
      text-decoration: none;
    }
    /* Navigation bar */
    nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      background: rgba(10, 12, 16, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
    }
    .nav-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 32px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .nav-logo {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .nav-logo span {
      color: var(--accent);
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 36px;
      font-size: 14px;
    }
    .nav-links a {
      color: var(--muted);
      transition: color 0.2s;
    }
    .nav-links a:hover {
      color: var(--text);
    }
    .btn-nav {
      background: var(--accent);
      color: #0a0c10 !important;
      font-weight: 600;
      font-size: 13px;
      padding: 9px 20px;
      border-radius: 6px;
    }
    /* Button styles */
    .btn-primary {
      display: inline-block;
      background: var(--accent);
      color: #0a0c10;
      font-weight: 600;
      font-size: 14px;
      padding: 13px 28px;
      border-radius: 6px;
      border: none;
      transition: opacity 0.2s;
      cursor: pointer;
    }
    .btn-primary:hover {
      opacity: 0.85;
    }
    .btn-ghost {
      display: inline-block;
      background: transparent;
      color: var(--text);
      font-size: 14px;
      font-weight: 500;
      padding: 13px 28px;
      border-radius: 6px;
      border: 1px solid var(--border);
      transition: border-color 0.2s, color 0.2s;
    }
    .btn-ghost:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    /* Layout helpers */
    section {
      padding: 100px 32px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .section-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 2px;
      color: var(--accent);
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .section-title {
      font-size: 36px;
      font-weight: 700;
      letter-spacing: -1px;
      line-height: 1.2;
      margin-bottom: 16px;
    }
    .section-sub {
      font-size: 17px;
      color: var(--muted);
      max-width: 640px;
      line-height: 1.7;
    }
    /* Hero section */
    .hero {
      padding: 150px 32px 120px;
      min-height: 90vh;
      display: flex;
      align-items: center;
      border-bottom: 1px solid var(--border);
      background: radial-gradient(
        ellipse 70% 60% at 60% 50%,
        rgba(0, 212, 255, 0.06) 0%,
        transparent 70%
      );
    }
    .hero-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 64px;
      align-items: center;
    }
    /* Card and grid style */
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 24px;
      transition: border-color 0.2s;
    }
    .card:hover {
      border-color: rgba(0, 212, 255, 0.4);
    }
    .card h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .card p {
      font-size: 14px;
      color: var(--muted);
      line-height: 1.65;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 32px;
    }
    @media (max-width: 768px) {
      .hero-grid {
        grid-template-columns: 1fr;
        gap: 40px;
      }
      nav .nav-links {
        gap: 24px;
      }
    }
    /* Footer */
    footer {
      border-top: 1px solid var(--border);
      padding: 40px 32px;
    }
    .footer-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
    }
    .footer-logo {
      font-size: 16px;
      font-weight: 700;
    }
    .footer-logo span {
      color: var(--accent);
    }
    .footer-links {
      display: flex;
      gap: 24px;
      font-size: 13px;
    }
    .footer-links a {
      color: var(--muted);
      transition: color 0.2s;
    }
    .footer-links a:hover {
      color: var(--text);
    }
    .footer-copy {
      font-size: 13px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <!-- Navigation bar -->
  <nav>
    <div class="nav-inner">
      <a href="index.html" class="nav-logo">Nera<span>ium</span></a>
      <div class="nav-links">
        <a href="index.html">Home</a>
        <a href="platform.html">Platform</a>
        <a href="technical.html" style="color: var(--text);">Technical</a>
        <a href="governance.html">Governance</a>
        <a href="contact.html" class="btn-nav">Request Pilot</a>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <header class="hero" id="technical-overview">
    <div class="container hero-grid">
      <div>
        <div class="section-label">Technical</div>
        <h1
          style="font-size: 52px; font-weight: 700; letter-spacing: -1.5px; line-height: 1.1; margin-bottom: 24px;"
        >
          Under the Hood
        </h1>
        <p
          style="font-size: 18px; color: var(--muted); line-height: 1.75; margin-bottom: 36px; max-width: 480px;"
        >
          Explore how Neraium blends multivariate statistics with deterministic governance to produce reliable
          infrastructure intelligence. This page dives into the technical foundations that power our platform.
        </p>
        <div style="display: flex; gap: 16px;">
          <a href="#geometry" class="btn-primary">Signal Geometry</a>
          <a href="#gate" class="btn-ghost">Interpretation Rules</a>
        </div>
      </div>
      <!-- Illustrative code block or graphic placeholder -->
      <div style="background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 28px;">
        <div
          style="font-size: 11px; font-weight: 600; letter-spacing: 1.5px; color: var(--accent); text-transform: uppercase; margin-bottom: 16px;"
        >
          Sample Algorithm
        </div>
        <!-- Small code-like block to illustrate drift calculation (pseudo-code) -->
        <pre style="font-size: 12px; color: var(--muted); background: var(--bg2); padding: 12px; border-radius: 6px; overflow-x: auto;">
// Compute Mahalanobis distance
let diff = sensorVector - meanVector;
let invCov = invert(covarianceMatrix);
let distance = Math.sqrt(diff^T * invCov * diff);

// Evaluate against drift threshold
if (distance > threshold) {
  // Check interpretation constraints
  if (passesPersistence & passesCorrelation & withinPhysicalLimits) {
    admit();
  } else {
    suppress();
  }
} else {
  voidResult();
}
        </pre>
      </div>
    </div>
  </header>

  <!-- Statistical Geometry Section -->
  <section id="geometry" style="background: var(--bg2);">
    <div class="container">
      <div style="text-align: center; margin-bottom: 48px;">
        <div class="section-label">Statistics</div>
        <h2 class="section-title">Multivariate Geometry</h2>
        <p class="section-sub" style="margin: 0 auto; max-width: 700px;">
          Neraium models system behaviour using covariance matrices and Mahalanobis distance, enabling it to detect subtle drift in multivariate sensor data without relying on prior failure examples. By examining the shape of the sensor space rather than individual thresholds, the platform recognises when the entire system begins to deform.
        </p>
      </div>
      <div class="grid-3">
        <div class="card">
          <h3>Covariance Modelling</h3>
          <p>
            Continuous streams of telemetry are transformed into covariance structures that describe how sensors co‑vary. This enables detection of shifts in the underlying geometry of the system.
          </p>
        </div>
        <div class="card">
          <h3>Mahalanobis Distance</h3>
          <p>
            Distances are computed in the multivariate space, taking correlations into account. Deviations beyond a normalised threshold signal the onset of system drift.
          </p>
        </div>
        <div class="card">
          <h3>Baseline Adaptation</h3>
          <p>
            Baselines are refreshed using recent operational windows, allowing the model to remain sensitive to long-term changes while filtering out transient noise.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Interpretation Governance Section -->
  <section id="gate" style="background: var(--bg);">
    <div class="container">
      <div style="text-align: center; margin-bottom: 48px;">
        <div class="section-label">Governance</div>
        <h2 class="section-title">Deterministic Constraints</h2>
        <p class="section-sub" style="margin: 0 auto; max-width: 700px;">
          Detection alone is not enough. Neraium evaluates every candidate deviation against a set of non‑negotiable rules to decide whether an interpretation should be admitted or suppressed. These rules codify engineering doctrine so that signals remain defensible.
        </p>
      </div>
      <div class="grid-3">
        <div class="card">
          <h3>Physical Boundaries</h3>
          <p>
            Deviations must respect known physical limits; out-of-bounds signals are treated as instrumentation errors.
          </p>
        </div>
        <div class="card">
          <h3>Temporal Persistence</h3>
          <p>
            Signals must persist over a meaningful time horizon to be considered, eliminating transient noise and single-point anomalies.
          </p>
        </div>
        <div class="card">
          <h3>Multi‑Sensor Correlation</h3>
          <p>
            Deviations require corroboration across multiple sensors; uncorrelated excursions are suppressed until they satisfy correlation thresholds.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Evidence Logging Section -->
  <section style="background: var(--bg2);">
    <div class="container">
      <div style="text-align: center; margin-bottom: 48px;">
        <div class="section-label">Evidence</div>
        <h2 class="section-title">Auditable Records</h2>
        <p class="section-sub" style="margin: 0 auto; max-width: 700px;">
          Every decision within Neraium is captured through the Evidence Vault, creating a verifiable chain of custody. Whether a deviation is admitted, suppressed or voided, the system logs the divergence, applied criteria and final disposition for later review.
        </p>
      </div>
      <div class="grid-3">
        <div class="card">
          <h3>Secure Ledger</h3>
          <p>
            Records are stored in an append‑only ledger with cryptographic integrity guarantees, ensuring tamper‑evident audit trails.
          </p>
        </div>
        <div class="card">
          <h3>Contextual Data</h3>
          <p>
            The system captures baseline parameters, drift magnitude, evaluation time and decision criteria to provide full context for each entry.
          </p>
        </div>
        <div class="card">
          <h3>Traceability</h3>
          <p>
            Operators and regulators can trace back through the chain to understand why and when specific interpretations were made.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Edge Deployment Section -->
  <section style="background: var(--bg);">
    <div class="container">
      <div class="grid-2" style="gap: 48px; align-items: flex-start;">
        <div>
          <div class="section-label">Deployment</div>
          <h2 class="section-title">Edge Processing</h2>
          <p class="section-sub">
            Neraium runs at the edge, ingesting and analysing telemetry locally without continuous cloud connectivity. This ensures continuous operation during network outages and preserves sensitive data within your infrastructure.
          </p>
        </div>
        <div>
          <div class="section-label">Role</div>
          <h2 class="section-title">Non‑Intrusive Operation</h2>
          <p class="section-sub">
            The platform is strictly read-only. It never issues commands or modifies control loops. It simply interprets behaviour and produces guidance that operators can decide to act upon.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section style="background: linear-gradient(135deg, rgba(0, 212, 255, 0.06) 0%, rgba(0, 102, 255, 0.06) 100%); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);">
    <div class="container" style="text-align: center;">
      <div class="section-label">Next Steps</div>
      <h2 class="section-title" style="margin: 0 auto 16px;">Ready to dive deeper?</h2>
      <p
        style="font-size: 17px; color: var(--muted); margin-bottom: 36px; max-width: 700px; margin-left: auto; margin-right: auto;"
      >
        Reach out to discuss how Neraium can integrate with your infrastructure and provide actionable insights grounded in sound engineering. We work with teams to scope, deploy and evaluate pilot installations.
      </p>
      <a href="contact.html" class="btn-primary" style="font-size: 15px; padding: 15px 36px;">Contact Us</a>
    </div>
  </section>

  <!-- Footer -->
  <footer>
    <div class="footer-inner">
      <div class="footer-logo">Nera<span>ium</span></div>
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