(() => {
  const gaMeta = document.querySelector('meta[name="ga4-measurement-id"]');
  const gaMeasurementId = gaMeta?.getAttribute("content")?.trim();
  if (gaMeasurementId && gaMeasurementId !== "G-XXXXXXXXXX") {
    const gaScript = document.createElement("script");
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`;
    document.head.appendChild(gaScript);
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", gaMeasurementId, { anonymize_ip: true });
  }

  const analyticsState = {
    maxScrollBucket: 0
  };

  const trackEvent = (name, payload = {}) => {
    const detail = { name, payload, ts: Date.now() };
    window.dispatchEvent(new CustomEvent("neraium:analytics", { detail }));
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: name, ...payload });
    }
    if (typeof window.gtag === "function") {
      window.gtag("event", name, payload);
    }
    if (window.console && window.console.debug) {
      window.console.debug("[analytics]", name, payload);
    }
  };

  const year = document.getElementById("year");
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  const nav = document.getElementById("main-navigation");
  const toggleButton = document.querySelector(".nav-toggle");

  if (nav && toggleButton) {
    const setExpanded = (isExpanded) => {
      toggleButton.setAttribute("aria-expanded", String(isExpanded));
      toggleButton.setAttribute("aria-label", isExpanded ? "Close navigation" : "Open navigation");
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
      if (window.innerWidth > 980 && nav.classList.contains("open")) {
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
  }

  document.querySelectorAll("a.button, .nav a, [data-track]").forEach((el) => {
    el.addEventListener("click", () => {
      const label = el.getAttribute("data-track") || el.textContent.trim();
      trackEvent("cta_click", {
        label,
        href: el.getAttribute("href") || "",
        path: window.location.pathname
      });
    });
  });

  const onScrollDepth = () => {
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop || 0;
    const max = Math.max(doc.scrollHeight - window.innerHeight, 1);
    const pct = Math.min(100, Math.round((scrollTop / max) * 100));
    const bucket = Math.floor(pct / 25) * 25;
    if (bucket > analyticsState.maxScrollBucket && bucket > 0) {
      analyticsState.maxScrollBucket = bucket;
      trackEvent("scroll_depth", { bucket, path: window.location.pathname });
    }
  };
  window.addEventListener("scroll", onScrollDepth, { passive: true });
  onScrollDepth();

  const mobileStickyCta = document.querySelector(".mobile-sticky-cta");
  const pageHero = document.querySelector(".page-hero");
  if (mobileStickyCta && pageHero) {
    const setMobileStickyVisibility = (isVisible) => {
      mobileStickyCta.classList.toggle("is-visible", isVisible);
      mobileStickyCta.setAttribute("aria-hidden", String(!isVisible));
      if (isVisible) {
        mobileStickyCta.removeAttribute("tabindex");
      } else {
        mobileStickyCta.setAttribute("tabindex", "-1");
      }
    };

    setMobileStickyVisibility(false);
    if ("IntersectionObserver" in window) {
      const heroObserver = new IntersectionObserver(([entry]) => {
        setMobileStickyVisibility(!entry.isIntersecting);
      });
      heroObserver.observe(pageHero);
    }
  }

  const contactForm = document.getElementById("contact-form");
  const formFeedback = document.getElementById("form-feedback");
  const formStartedAt = document.getElementById("form-started-at");
  const honeypot = document.getElementById("company-website");
  if (contactForm && formFeedback && formStartedAt) {
    const stepOne = contactForm.querySelector('[data-step="1"]');
    const stepTwo = contactForm.querySelector('[data-step="2"]');
    const nextButton = document.getElementById("contact-next");
    const backButton = document.getElementById("contact-back");

    formStartedAt.value = String(Date.now());

    const setFeedback = (message) => {
      formFeedback.innerHTML = message;
    };

    const showStep = (stepNumber) => {
      if (!stepOne || !stepTwo) {
        return;
      }
      const isStepOne = stepNumber === 1;
      stepOne.hidden = !isStepOne;
      stepTwo.hidden = isStepOne;
      stepOne.classList.toggle("is-active", isStepOne);
      stepTwo.classList.toggle("is-active", !isStepOne);
      setFeedback("");
      trackEvent("contact_step_view", { step: stepNumber });
    };

    if (nextButton) {
      nextButton.addEventListener("click", () => {
        const fullName = document.getElementById("name")?.value.trim() || "";
        const workEmail = document.getElementById("email")?.value.trim() || "";
        const company = document.getElementById("company")?.value.trim() || "";
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!fullName || !workEmail || !company) {
          setFeedback("Please complete name, email, and company to continue.");
          return;
        }
        if (!emailPattern.test(workEmail)) {
          setFeedback("Please enter a valid work email address.");
          return;
        }
        trackEvent("contact_step_1_complete", { path: window.location.pathname });
        showStep(2);
      });
    }

    if (backButton) {
      backButton.addEventListener("click", () => {
        showStep(1);
      });
    }

    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const fullName = document.getElementById("name")?.value.trim() || "";
      const workEmail = document.getElementById("email")?.value.trim() || "";
      const company = document.getElementById("company")?.value.trim() || "";
      const stack = document.getElementById("stack")?.value.trim() || "Not provided";
      const priority = document.getElementById("priority")?.value.trim() || "";

      if (!fullName || !workEmail || !company || !priority) {
        setFeedback("Please complete all required fields before sending your request.");
        return;
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(workEmail)) {
        setFeedback("Please enter a valid work email address.");
        return;
      }

      const elapsedMs = Date.now() - Number(formStartedAt.value || 0);
      if ((honeypot && honeypot.value.trim() !== "") || elapsedMs < 3000) {
        setFeedback("Thanks. Your request was received.");
        return;
      }

      setFeedback("Sending your request...");
      trackEvent("contact_submit_attempt", { path: window.location.pathname });
      const payload = new URLSearchParams({
        "form-name": "pilot-request",
        form_started_at: formStartedAt.value,
        company_website: honeypot?.value || "",
        "Full Name": fullName,
        "Work Email": workEmail,
        Company: company,
        "Telemetry Stack": stack,
        "Priority Risk": priority
      });

      try {
        const response = await fetch("/", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: payload.toString()
        });

        if (!response.ok) {
          throw new Error("Form submit failed");
        }

        contactForm.reset();
        formStartedAt.value = String(Date.now());
        setFeedback("Thanks, your pilot request is in. We typically reply within 1 business day.");
        trackEvent("contact_submit_success", { path: window.location.pathname });
      } catch (_err) {
        setFeedback("Submission did not go through. Please try again or email <a href=\"mailto:craig@neraium.com\">craig@neraium.com</a> directly.");
        trackEvent("contact_submit_error", { path: window.location.pathname });
      }
    });
  }

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
      icon.textContent = willOpen ? "\u2212" : "+";
    });
  });
})();
