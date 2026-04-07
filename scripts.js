(() => {
  const year = document.getElementById("year");
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  const nav = document.getElementById("main-navigation");
  const toggleButton = document.querySelector(".nav-toggle");

  if (!nav || !toggleButton) {
    return;
  }

  const setExpanded = (isExpanded) => {
    toggleButton.setAttribute("aria-expanded", String(isExpanded));
  };

  toggleButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = nav.classList.toggle("open");
    setExpanded(isOpen);
  });

  document.addEventListener("click", (e) => {
    if (!nav.classList.contains("open")) {
      return;
    }
    if (toggleButton.contains(e.target) || nav.contains(e.target)) {
      return;
    }
    nav.classList.remove("open");
    setExpanded(false);
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      setExpanded(false);
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 640 && nav.classList.contains("open")) {
      nav.classList.remove("open");
      setExpanded(false);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      nav.classList.remove("open");
      setExpanded(false);
      toggleButton.focus();
    }
  });

  const faqList = document.querySelector("[data-faq-list]");
  if (!faqList) {
    return;
  }

  faqList.querySelectorAll(".faq-item").forEach((item) => {
    const trigger = item.querySelector(".faq-trigger");
    const panel = item.querySelector(".faq-panel");
    const icon = item.querySelector(".faq-icon");
    if (!trigger || !panel || !icon) {
      return;
    }

    trigger.addEventListener("click", () => {
      const willOpen = trigger.getAttribute("aria-expanded") !== "true";
      trigger.setAttribute("aria-expanded", String(willOpen));
      panel.hidden = !willOpen;
      icon.textContent = willOpen ? "−" : "+";
    });
  });
})();
