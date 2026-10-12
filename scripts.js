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
  if (form && feedback) {
    // Only recognized public market labels can initialize this editable field.
    const sectors = {
      water: { facility: 'Municipal water / wastewater', context: 'Water & wastewater evaluation. Start with one pumping, treatment, lift, or distribution system.' },
      hospitality: { facility: 'Las Vegas hospitality / resort infrastructure', context: 'Hospitality evaluation. Start with one cooling, HVAC, or domestic water system.' },
    };
    const sectorKey = new URLSearchParams(window.location.search).get('sector');
    const sector = Object.hasOwn(sectors, sectorKey) ? sectors[sectorKey] : null;
    const facility = document.getElementById('facility');
    const sectorContext = document.getElementById('sector-context');
    if (sector && facility && sectorContext) {
      if (!facility.value) facility.value = sector.facility;
      sectorContext.textContent = sector.context;
      sectorContext.hidden = false;
    }
    form.addEventListener('input', () => {
      feedback.replaceChildren();
      feedback.removeAttribute('data-state');
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      feedback.replaceChildren();
      feedback.removeAttribute('data-state');
      const requiredIds = ['name', 'email', 'organization', 'facility', 'review-question'];
      const missing = requiredIds.some((id) => !document.getElementById(id)?.value.trim());
      const email = document.getElementById('email')?.value.trim() || '';
      if (missing) {
        feedback.dataset.state = 'error';
        feedback.textContent = 'Please complete the required practical scoping fields.';
        feedback.focus();
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        feedback.dataset.state = 'error';
        feedback.textContent = 'Please enter a valid work email address.';
        feedback.focus();
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      const idleLabel = submitButton?.dataset.idleLabel || submitButton?.textContent || 'Prepare Evaluation Request';
      const loadingLabel = submitButton?.dataset.loadingLabel || 'Preparing request...';
      form.setAttribute('aria-busy', 'true');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = loadingLabel;
      }

      window.requestAnimationFrame(() => {
        try {
          const value = (id) => document.getElementById(id)?.value.trim() || '';
          const body = [
            `Name: ${value('name')}`,
            `Work email: ${email}`,
            `Organization: ${value('organization')}`,
            `System or facility type: ${value('facility')}`,
            `Review question: ${value('review-question')}`,
            value('role') ? `Role: ${value('role')}` : '',
            value('preferred-contact') ? `Preferred contact method: ${value('preferred-contact')}` : '',
          ].filter(Boolean).join('\n\n');
          const emailLink = document.createElement('a');
          emailLink.className = 'button secondary prepared-email-link';
          emailLink.href = `mailto:craig@neraium.com?subject=${encodeURIComponent('Neraium Historical Evaluation')}&body=${encodeURIComponent(body)}`;
          emailLink.textContent = 'Open the prepared email';
          const status = document.createElement('span');
          status.textContent = 'Your email draft is ready. Review it in your email application, then choose send.';
          feedback.dataset.state = 'success';
          const fallback = document.createElement('details');
          fallback.className = 'email-fallback';
          const summary = document.createElement('summary');
          summary.textContent = 'No email application? Copy the request';
          const instructions = document.createElement('p');
          instructions.textContent = 'Send the text below to craig@neraium.com with the subject “Neraium Historical Evaluation”. This website has not sent your request.';
          const draft = document.createElement('textarea');
          draft.id = 'prepared-request';
          draft.readOnly = true;
          draft.rows = 8;
          draft.value = body;
          draft.setAttribute('aria-label', 'Prepared evaluation request to copy');
          const select = document.createElement('button');
          select.type = 'button';
          select.className = 'button secondary';
          select.textContent = 'Select request text';
          select.addEventListener('click', () => { draft.focus(); draft.select(); });
          fallback.append(summary, instructions, draft, select);
          feedback.append(status, emailLink, fallback);
        } catch {
          feedback.dataset.state = 'error';
          feedback.textContent = 'The request could not be prepared. Please email craig@neraium.com directly.';
        } finally {
          form.removeAttribute('aria-busy');
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = idleLabel;
          }
          feedback.focus();
        }
      });
    });
  }
})();
