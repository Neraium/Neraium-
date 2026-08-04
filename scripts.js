(() => {
  const gaMeta = document.querySelector('meta[name="ga4-measurement-id"]');
  const gaMeasurementId = gaMeta?.getAttribute('content')?.trim();
  if (gaMeasurementId && gaMeasurementId !== 'G-XXXXXXXXXX') {
    const gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`;
    document.head.appendChild(gaScript);
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', gaMeasurementId, { anonymize_ip: true });
  }

  const trackEvent = (name, payload = {}) => {
    window.dispatchEvent(new CustomEvent('neraium:analytics', { detail: { name, payload, ts: Date.now() } }));
    if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: name, ...payload });
    if (typeof window.gtag === 'function') window.gtag('event', name, payload);
  };

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const nav = document.getElementById('main-navigation');
  const toggleButton = document.querySelector('.nav-toggle');
  if (nav && toggleButton) {
    const setExpanded = (expanded) => {
      toggleButton.setAttribute('aria-expanded', String(expanded));
      toggleButton.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation');
    };
    toggleButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = nav.classList.toggle('open');
      setExpanded(isOpen);
    });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      nav.classList.remove('open');
      setExpanded(false);
    }));
    document.addEventListener('click', (event) => {
      if (!nav.classList.contains('open')) return;
      if (nav.contains(event.target) || toggleButton.contains(event.target)) return;
      nav.classList.remove('open');
      setExpanded(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        setExpanded(false);
        toggleButton.focus();
      }
    });
  }

  document.querySelectorAll('a.button, .nav a, [data-track]').forEach((element) => {
    element.addEventListener('click', () => trackEvent('cta_click', {
      label: element.getAttribute('data-track') || element.textContent.trim(),
      href: element.getAttribute('href') || '',
      path: window.location.pathname
    }));
  });

  const form = document.getElementById('contact-form');
  const feedback = document.getElementById('form-feedback');
  const started = document.getElementById('form-started-at');
  const honeypot = document.getElementById('company-website');
  if (form && feedback && started) {
    started.value = String(Date.now());
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const requiredIds = ['name', 'organization', 'role', 'email', 'facility', 'data'];
      const missing = requiredIds.some((id) => !document.getElementById(id)?.value.trim());
      const email = document.getElementById('email')?.value.trim() || '';
      if (missing) { feedback.textContent = 'Please complete the required practical scoping fields.'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { feedback.textContent = 'Please enter a valid email address.'; return; }
      const elapsed = Date.now() - Number(started.value || 0);
      if ((honeypot && honeypot.value.trim()) || elapsed < 2500) { feedback.textContent = 'Thanks. Your request was received.'; return; }
      feedback.textContent = 'Sending your request...';
      trackEvent('contact_submit_attempt', { path: window.location.pathname });
      try {
        const response = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() });
        if (!response.ok) throw new Error(`Form submission failed with ${response.status}`);
        form.reset();
        feedback.textContent = 'Thanks. Neraium received your request and will follow up.';
        trackEvent('contact_submit_success', { path: window.location.pathname });
      } catch (error) {
        feedback.innerHTML = 'The secure form could not be submitted in this environment. Please email <a href="mailto:craig@neraium.com">craig@neraium.com</a>.';
        trackEvent('contact_submit_error', { message: error.message });
      }
    });
  }
})();
