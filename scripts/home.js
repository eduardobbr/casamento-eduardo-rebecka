(function () {
  "use strict";

  const weddingDate = new Date("2026-07-24T18:40:00-03:00");

  const body = document.body;
  const sideNav = document.getElementById("sideNav");
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const sideLinks = Array.from(document.querySelectorAll(".side-link"));

  const countdownEls = {
    days: document.getElementById("days"),
    hours: document.getElementById("hours"),
    minutes: document.getElementById("minutes"),
    seconds: document.getElementById("seconds"),
  };

  const qrcodeEl = document.getElementById("qrcode");
  const pixKeyEl = document.getElementById("pixChave");
  const copyPixBtn = document.getElementById("copiarPixBtn");
  const pixFeedback = document.getElementById("mensagemCopiado");

  const rsvpForm = document.getElementById("rsvpForm");
  const confirmFeedback = document.getElementById("mensagemConfirmacao");
  const errorFeedback = document.getElementById("mensagemErro");

  function pad(value, length = 2) {
    return String(value).padStart(length, "0");
  }

  function showElement(el) {
    if (!el) return;
    el.classList.add("show");
  }

  function hideElement(el) {
    if (!el) return;
    el.classList.remove("show");
  }

  function initPetals() {
    const petalsRoot = document.querySelector(".petals");
    if (!petalsRoot) return;

    petalsRoot.innerHTML = "";
    const count = window.innerWidth < 768 ? 12 : 22;

    for (let i = 0; i < count; i++) {
      const petal = document.createElement("span");
      petal.className = "petal";
      petal.style.left = `${Math.random() * 100}%`;
      petal.style.animationDuration = `${10 + Math.random() * 10}s`;
      petal.style.animationDelay = `${Math.random() * 6}s`;
      petal.style.opacity = `${0.25 + Math.random() * 0.45}`;
      petal.style.setProperty("--drift", `${-120 + Math.random() * 240}px`);
      petalsRoot.appendChild(petal);
    }
  }

  function updateCountdown() {
    if (!countdownEls.days) return;

    const now = new Date();
    const diff = weddingDate.getTime() - now.getTime();

    if (diff <= 0) {
      countdownEls.days.textContent = "000";
      countdownEls.hours.textContent = "00";
      countdownEls.minutes.textContent = "00";
      countdownEls.seconds.textContent = "00";
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    countdownEls.days.textContent = pad(days, 3);
    countdownEls.hours.textContent = pad(hours, 2);
    countdownEls.minutes.textContent = pad(minutes, 2);
    countdownEls.seconds.textContent = pad(seconds, 2);
  }

  function initCountdown() {
    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  function initQRCode() {
    if (!qrcodeEl || !pixKeyEl || typeof QRCode === "undefined") return;

    qrcodeEl.innerHTML = "";

    new QRCode(qrcodeEl, {
      text: pixKeyEl.textContent.trim(),
      width: 188,
      height: 188,
      colorDark: "#111111",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });
  }

  async function copyPixKey() {
    if (!pixKeyEl) return;

    const value = pixKeyEl.textContent.trim();
    hideElement(pixFeedback);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const temp = document.createElement("textarea");
        temp.value = value;
        temp.setAttribute("readonly", "");
        temp.style.position = "absolute";
        temp.style.left = "-9999px";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }

      showElement(pixFeedback);
      setTimeout(() => hideElement(pixFeedback), 2500);
    } catch (error) {
      console.error("Erro ao copiar chave PIX:", error);
    }
  }

  function initPixCopy() {
    if (!copyPixBtn) return;
    copyPixBtn.addEventListener("click", copyPixKey);
  }

  function maskPhone(value) {
    return value
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/^(\d{2})(\d)/g, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  function initPhoneMask() {
    const phoneInput = document.getElementById("telefoneConvidado");
    if (!phoneInput) return;

    phoneInput.addEventListener("input", (e) => {
      e.target.value = maskPhone(e.target.value);
    });
  }

  function initRSVP() {
    if (!rsvpForm) return;

    rsvpForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      hideElement(confirmFeedback);
      hideElement(errorFeedback);

      const formData = new FormData(rsvpForm);
      const nome = String(formData.get("nomeConvidado") || "").trim();

      if (!nome) {
        if (errorFeedback) {
          errorFeedback.textContent = "Por favor, informe seu nome.";
        }
        showElement(errorFeedback);
        return;
      }

      try {
        await new Promise((resolve) => setTimeout(resolve, 600));

        if (confirmFeedback) {
          confirmFeedback.textContent = `Presença confirmada com sucesso. Obrigado, ${nome}!`;
        }

        showElement(confirmFeedback);
        hideElement(errorFeedback);
        rsvpForm.reset();
      } catch (error) {
        console.error("Erro ao enviar RSVP:", error);

        if (errorFeedback) {
          errorFeedback.textContent = "Ocorreu um erro ao enviar. Tente novamente.";
        }

        showElement(errorFeedback);
      }
    });
  }

  function initMobileMenu() {
    if (!mobileMenuToggle || !sideNav) return;

    mobileMenuToggle.addEventListener("click", function () {
      body.classList.toggle("menu-open");
    });

    document.addEventListener("click", function (event) {
      const clickedInsideNav = sideNav.contains(event.target);
      const clickedToggle = mobileMenuToggle.contains(event.target);

      if (!clickedInsideNav && !clickedToggle) {
        body.classList.remove("menu-open");
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        body.classList.remove("menu-open");
      }
    });
  }

  function initActiveMenu() {
    const sections = sideLinks
      .map((link) => {
        const href = link.getAttribute("href");
        if (!href || !href.startsWith("#")) return null;

        const section = document.querySelector(href);
        if (!section) return null;

        return { link, section };
      })
      .filter(Boolean);

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (!visibleEntries.length) return;

        const activeId = visibleEntries[0].target.id;

        sideLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${activeId}`);
        });
      },
      {
        threshold: [0.2, 0.4, 0.6],
        rootMargin: "-10% 0px -45% 0px",
      }
    );

    sections.forEach(({ section }) => observer.observe(section));

    sideLinks.forEach((link) => {
      link.addEventListener("click", function () {
        body.classList.remove("menu-open");
      });
    });
  }

  function initReveal() {
    const revealItems = document.querySelectorAll(
      ".reveal-up, .reveal-left, .reveal-right, .reveal-fade"
    );

    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("reveal-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    revealItems.forEach((item) => observer.observe(item));
  }

  function initResize() {
    window.addEventListener(
      "resize",
      function () {
        initPetals();
      },
      { passive: true }
    );
  }

  function init() {
    initPetals();
    initCountdown();
    initQRCode();
    initPixCopy();
    initPhoneMask();
    initRSVP();
    initMobileMenu();
    initActiveMenu();
    initReveal();
    initResize();
  }

  document.addEventListener("DOMContentLoaded", init);
})();