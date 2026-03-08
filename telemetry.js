// telemetry.js
(function () {
  const form = document.querySelector('.contact-form');
  if (!form) return;

  form.addEventListener('click', (event) => {
    if (event.target.matches('button')) {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(form).entries());
      console.log('Neraium contact request', payload);
      alert('Demo request captured. Wire this button to your API or CRM endpoint.');
    }
  });
})();