(() => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const nav = document.getElementById('main-navigation');
  const toggleButton = document.querySelector('.nav-toggle');
  if (nav && toggleButton) {
    const headerAction = document.querySelector('.header-action');
    if (headerAction) {
      const mobileAction = headerAction.cloneNode(true);
      mobileAction.classList.remove('header-action');
      mobileAction.classList.add('nav-contact');
      if (/^\/contact(?:\.html)?\/?$/.test(window.location.pathname)) {
        mobileAction.setAttribute('aria-current', 'page');
      }
      nav.appendChild(mobileAction);
    }

    const setExpanded = (expanded) => {
      toggleButton.setAttribute('aria-expanded', String(expanded));
      toggleButton.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation');
    };
    toggleButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = nav.classList.toggle('open');
      setExpanded(isOpen);
      if (isOpen && event.detail === 0) nav.querySelector('a')?.focus();
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
    window.matchMedia('(min-width: 1121px)').addEventListener('change', (event) => {
      if (!event.matches) return;
      nav.classList.remove('open');
      setExpanded(false);
    });
  }

  const printButton = document.querySelector('[data-print-brief]');
  if (printButton) printButton.addEventListener('click', () => window.print());

  const form = document.getElementById('contact-form');
  const feedback = document.getElementById('form-feedback');
  if (!form || !feedback) return;
  const button = form.querySelector('button[type="submit"]');
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
      if (!config.enabled || typeof config.siteKey !== 'string') return;
      online = true;
      button.textContent = 'Send evaluation request';
      document.getElementById('intake-description').textContent = 'Send a business inquiry directly to Neraium.';
      document.getElementById('form-transparency').textContent = 'Your inquiry is processed through Cloudflare and sent to Neraium by email. Please review our privacy information before sending.';
      const challenge = document.getElementById('contact-challenge');
      challenge.hidden = false;
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => {
        widget = window.turnstile.render(challenge, {
          sitekey: config.siteKey, action: 'evaluation', theme: 'dark', size: 'flexible',
          callback: (value) => { token = value; },
          'expired-callback': () => { token = ''; },
          'error-callback': () => { token = ''; showStatus('error', 'Security verification is unavailable. Please retry or email craig@neraium.com.'); },
        });
      };
      script.onerror = () => showStatus('error', 'Security verification could not load. Please email craig@neraium.com.');
      document.head.appendChild(script);
    }).catch(() => { /* Static hosts retain the disclosed email-draft path. */ })
    .finally(() => clearTimeout(timeout));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.getAttribute('aria-busy') === 'true') return;
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
    const idleLabel = online ? 'Send evaluation request' : 'Prepare email request';
    form.setAttribute('aria-busy', 'true');
    button.disabled = true;
    button.textContent = online ? 'Sending request…' : 'Preparing request…';
    try {
      if (online) {
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
      } else {
        showStatus('success', 'Your email draft is ready. Review it in your email application, then choose send.');
        const emailLink = document.createElement('a');
        emailLink.className = 'button secondary prepared-email-link';
        emailLink.href = `mailto:craig@neraium.com?subject=${encodeURIComponent('Neraium Evaluation Request')}&body=${encodeURIComponent(Object.entries(data).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join('\n\n'))}`;
        emailLink.textContent = 'Open the prepared email';
        feedback.appendChild(emailLink);
      }
    } catch (error) {
      const message = error.name === 'TimeoutError' || error.name === 'AbortError' ? 'Delivery could not be confirmed. Please email craig@neraium.com before retrying.' : 'Submission could not be confirmed. Please retry or email craig@neraium.com.';
      // Only display a known server response; never interpolate arbitrary HTML.
      showStatus('error', error.publicMessage ? error.message : message);
    } finally {
      if (online && window.turnstile && widget !== undefined) { token = ''; window.turnstile.reset(widget); }
      form.removeAttribute('aria-busy');
      button.disabled = false;
      button.textContent = idleLabel;
    }
  });
})();
