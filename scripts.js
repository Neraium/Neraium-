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

  toggleButton.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    setExpanded(isOpen);
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
})();
