<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Neraium | Technical</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css" />
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
          <h1>Statistical foundations for system-level interpretation</h1>
          <p class="lead">
            Neraium analyzes infrastructure behavior through multivariate statistical geometry and deterministic
            interpretation rules. It is designed to surface meaningful system change while refusing weak conclusions.
          </p>
          <div class="hero-actions">
            <a href="#methods" class="btn btn-primary">Core Methods</a>
            <a href="#constraints" class="btn btn-secondary">Interpretation Rules</a>
          </div>
        </div>

        <div class="panel code-panel">
<pre>// Compute multivariate deviation
let diff = sensorVector - meanVector;
let invCov = invert(covarianceMatrix);
let distance = Math.sqrt(diffᵀ * invCov * diff);

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

    <section class="section band" id="methods">
      <div class="container">
        <div class="section-head">
          <div class="eyebrow">Core Methods</div>
          <h2>How the platform models behavior</h2>
          <p>
            Neraium does not depend on isolated thresholding or purely black-box forecasting. It models system
            structure directly through relationships between variables.
          </p>
        </div>

        <div class="grid-3">
          <div class="card">
            <h3>Mahalanobis Distance</h3>
            <p>
              Measures system deviation in a multivariate space so correlated signals are treated as a system rather
              than as isolated points.
            </p>
          </div>
          <div class="card">
            <h3>Covariance Modeling</h3>
            <p>
              Builds a representation of how telemetry variables move together, allowing the platform to detect
              structural changes in behavior.
            </p>
          </div>
          <div class="card">
            <h3>Adaptive Baselines</h3>
            <p>
              Maintains operational relevance by refreshing the expected system structure from recent valid behavior.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="constraints">
      <div class="container">
        <div class="section-head">
          <div class="eyebrow">Interpretation Constraints</div>
          <h2>Detection is not enough</h2>
          <p>
            Candidate signals must pass deterministic constraints before an interpretation is admitted. The system is
            designed to suppress ambiguity rather than translate it into false certainty.
          </p>
        </div>

        <div class="grid-3">
          <div class="card">
            <h3>Physical Validity</h3>
            <p>
              Signals must remain within plausible physical interpretation boundaries or they are treated as invalid
              for operational reasoning.
            </p>
          </div>
          <div class="card">
            <h3>Temporal Persistence</h3>
            <p>
              Deviation must persist long enough to indicate meaningful structural change rather than transient noise.
            </p>
          </div>
          <div class="card">
            <h3>Multi-Sensor Agreement</h3>
            <p>
              Interpretable signals require corroboration across related telemetry rather than relying on one channel
              alone.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="section band">
      <div class="container">
        <div class="section-head">
          <div class="eyebrow">Evidence Logic</div>
          <h2>Every outcome becomes part of the record</h2>
          <p>
            Neraium records what was admitted, suppressed, or voided along with the system context and applied logic.
            This makes interpretation traceable and reviewable after the fact.
          </p>
        </div>

        <div class="grid-3">
          <div class="card">
            <h3>Admitted Signals</h3>
            <p>Signals that satisfy both deviation and interpretability thresholds are preserved as operational evidence.</p>
          </div>
          <div class="card">
            <h3>Suppressed Signals</h3>
            <p>Candidate deviations that fail physical or logical constraints are recorded without being surfaced as valid interpretations.</p>
          </div>
          <div class="card">
            <h3>Void Outcomes</h3>
            <p>Conditions that do not exceed relevant thresholds are treated as non-events and still remain structurally accounted for.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="cta">
      <div class="container">
        <div class="panel">
          <div class="eyebrow">Next Step</div>
          <h2>See how technical logic becomes governance discipline</h2>
          <p>
            Explore the operational principles and system boundaries that keep Neraium interpretable, auditable,
            and strictly read-only.
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