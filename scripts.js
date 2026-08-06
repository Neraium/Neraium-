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
    window.matchMedia('(min-width: 981px)').addEventListener('change', (event) => {
      if (!event.matches) return;
      nav.classList.remove('open');
      setExpanded(false);
    });
  }

  const form = document.getElementById('contact-form');
  const feedback = document.getElementById('form-feedback');
  if (form && feedback) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      feedback.replaceChildren();
      const requiredIds = ['name', 'email', 'organization', 'facility', 'review-question'];
      const missing = requiredIds.some((id) => !document.getElementById(id)?.value.trim());
      const email = document.getElementById('email')?.value.trim() || '';
      if (missing) { feedback.textContent = 'Please complete the required practical scoping fields.'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { feedback.textContent = 'Please enter a valid email address.'; return; }

      const value = (id) => document.getElementById(id)?.value.trim() || '';
      const body = [
        `Name: ${value('name')}`,
        `Work email: ${email}`,
        `Organization: ${value('organization')}`,
        `System or facility type: ${value('facility')}`,
        `Review question: ${value('review-question')}`,
        value('role') ? `Role: ${value('role')}` : '',
        value('preferred-contact') ? `Preferred contact method: ${value('preferred-contact')}` : '',
        value('data') ? `Time horizon or data availability: ${value('data')}` : '',
      ].filter(Boolean).join('\n\n');
      const emailLink = document.createElement('a');
      emailLink.className = 'button secondary prepared-email-link';
      emailLink.href = `mailto:craig@neraium.com?subject=${encodeURIComponent('Neraium Historical Evaluation')}&body=${encodeURIComponent(body)}`;
      emailLink.textContent = 'Open the prepared email';
      const status = document.createElement('span');
      status.textContent = 'Your request is ready. Review it in your email application, then choose send.';
      feedback.append(status, emailLink);
      feedback.focus();
    });
  }
})();
