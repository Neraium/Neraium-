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
    const clearPreparedRequest = () => {
      feedback.replaceChildren();
      feedback.removeAttribute('data-state');
    };
    ['input', 'change', 'reset'].forEach((eventName) => {
      form.addEventListener(eventName, clearPreparedRequest);
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      clearPreparedRequest();
      const name = form.elements.namedItem('Name').value.trim();
      const organization = form.elements.namedItem('Organization').value.trim();
      const systemType = form.elements.namedItem('System type').value.trim();
      if (!name || !organization) {
        feedback.dataset.state = 'error';
        feedback.textContent = 'Please enter your name and organization.';
        feedback.focus();
        return;
      }

      const bodyLines = [
        'I would like to discuss a free historical evaluation.',
        `Name: ${name}`,
        `Organization: ${organization}`,
      ];
      if (systemType) bodyLines.push(`System type: ${systemType}`);

      const emailLink = document.createElement('a');
      emailLink.className = 'button secondary prepared-email-link';
      const recipient = form.getAttribute('action');
      const subject = encodeURIComponent('Neraium Historical Evaluation');
      const body = encodeURIComponent(bodyLines.join('\r\n\r\n'));
      emailLink.href = `${recipient}?subject=${subject}&body=${body}`;
      emailLink.textContent = 'Continue to your email app';

      const status = document.createElement('span');
      status.textContent = 'Your email draft is ready. Review it in your email app before sending.';
      feedback.dataset.state = 'success';
      feedback.append(status, emailLink);
      feedback.focus();
    });
  }
})();
