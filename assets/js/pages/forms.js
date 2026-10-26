/* =========================================================
   Forms page (/forms/) — 3-step "Download Forms" card.
   Step 1 (form choice + your details) is plain HTML; this script turns the card into
   a 3-step flow without page reloads:
     1 Your details → validate (form choice + 4 required fields) → 2
     2 Agreement   → consent checkbox enables "Agree and Continue" → 3
     3 Download    → shows the chosen form; "Download another form" restarts at 1
   The stepper reflects the state (done = red check, active = red number,
   upcoming = outlined) and focus moves to the card heading on every step change.
   Nothing is sent anywhere: the details stay in the page.
   ========================================================= */
(function () {
  const card = document.querySelector("[data-forms]");
  if (!card) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const title = card.querySelector("#forms-title");
  const status = card.querySelector("[data-forms-status]");
  const steps = Array.from(card.querySelectorAll("[data-forms-step]"));
  const stepperItems = Array.from(card.querySelectorAll("[data-forms-stepper]"));
  const form = card.querySelector('form[data-forms-step="1"]');
  const radios = Array.from(form.querySelectorAll('input[name="form"]'));
  const choiceError = form.querySelector("#forms-choice-error");
  const consent = card.querySelector("[data-forms-consent]");
  const agreeBtn = card.querySelector("[data-forms-agree]");
  const downloadLink = card.querySelector("[data-forms-download]");
  const nameSlots = card.querySelectorAll("[data-forms-name]");
  const fileSlot = card.querySelector("[data-forms-file]");
  const STEP_NAMES = ["Your details", "Agreement", "Download"];
  let current = 1;

  form.noValidate = true; // our own messages replace the browser bubbles

  /* ---------- Validation ---------- */
  const fields = [
    { input: form.querySelector("#forms-name"), empty: "Please enter your name." },
    { input: form.querySelector("#forms-company"), empty: "Please enter your company name." },
    { input: form.querySelector("#forms-email"), empty: "Please enter your email address.", invalid: "Please enter a valid email address." },
    { input: form.querySelector("#forms-phone"), empty: "Please enter your phone number.", invalid: "Please enter a valid phone number." },
  ];
  const PHONE = /^[+()\-.\s\d]{7,}$/;

  const setError = (el, input, message) => {
    el.textContent = message || "";
    el.hidden = !message;
    if (input) {
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
  };

  const checkField = (f) => {
    const value = f.input.value.trim();
    let message = "";
    if (!value) message = f.empty;
    else if (f.input.type === "email" && !f.input.checkValidity()) message = f.invalid;
    else if (f.input.type === "tel" && (!PHONE.test(value) || value.replace(/\D/g, "").length < 7)) message = f.invalid;
    setError(f.input.closest(".forms-field").querySelector(".forms-error"), f.input, message);
    return !message;
  };

  const checkChoice = () => {
    const ok = radios.some((r) => r.checked);
    setError(choiceError, null, ok ? "" : "Please select a form.");
    radios.forEach((r) => {
      if (r.disabled) return;
      if (ok) r.removeAttribute("aria-invalid");
      else r.setAttribute("aria-invalid", "true");
    });
    return ok;
  };

  // Re-check a field once it has been flagged, so the message clears while typing
  fields.forEach((f) => {
    f.input.addEventListener("input", () => { if (f.input.getAttribute("aria-invalid") === "true") checkField(f); });
    f.input.addEventListener("blur", () => { if (f.input.value.trim()) checkField(f); });
  });
  radios.forEach((r) => r.addEventListener("change", () => { if (!choiceError.hidden) checkChoice(); }));

  /* ---------- Selected form → steps 2 and 3 ---------- */
  const fillSelection = () => {
    const radio = radios.find((r) => r.checked);
    if (!radio) return;
    const name = radio.closest(".forms-option").querySelector(".forms-option__name").textContent.trim();
    nameSlots.forEach((el) => { el.textContent = name; });
    const file = radio.dataset.file || "";
    fileSlot.textContent = file ? "  ·  " + file : "";
    // TODO: data-href is empty until the PDFs exist; then the button links straight to the file.
    const href = radio.dataset.href || "";
    downloadLink.setAttribute("href", href || "#");
    if (href) downloadLink.removeAttribute("aria-disabled");
    else downloadLink.setAttribute("aria-disabled", "true");
  };

  downloadLink.addEventListener("click", (e) => {
    if (downloadLink.getAttribute("href") === "#") e.preventDefault(); // no PDF yet
  });

  /* ---------- Step switching ---------- */
  const goTo = (n, { focus = true } = {}) => {
    current = n;
    steps.forEach((s) => {
      const on = Number(s.dataset.formsStep) === n;
      s.hidden = !on;
      s.classList.remove("is-entering");
      if (on && focus && !reduceMotion) {
        void s.offsetWidth; // restart the fade-in
        s.classList.add("is-entering");
      }
    });
    stepperItems.forEach((li) => {
      const i = Number(li.dataset.formsStepper);
      li.classList.toggle("is-done", i < n);
      li.classList.toggle("is-active", i === n);
      if (i === n) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });
    status.textContent = " – Step " + n + " of 3: " + STEP_NAMES[n - 1];

    if (!focus) return;
    title.focus({ preventScroll: true });
    // Bring the card heading back into view if the step change left it above the screen
    const top = title.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.6) {
      window.scrollTo({ top: window.scrollY + top - 32, behavior: reduceMotion ? "auto" : "smooth" });
    }
  };

  steps.forEach((s) => s.addEventListener("animationend", () => s.classList.remove("is-entering")));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const choiceOk = checkChoice();
    const fieldResults = fields.map(checkField);
    if (!choiceOk) {
      (radios.find((r) => !r.disabled) || radios[0]).focus();
      return;
    }
    const firstBad = fields.find((f, i) => !fieldResults[i]);
    if (firstBad) {
      firstBad.input.focus();
      return;
    }
    fillSelection();
    goTo(2);
  });

  consent.addEventListener("change", () => { agreeBtn.disabled = !consent.checked; });
  agreeBtn.addEventListener("click", () => { if (consent.checked) goTo(3); });

  card.querySelectorAll("[data-forms-goto]").forEach((btn) => {
    btn.addEventListener("click", () => goTo(Number(btn.dataset.formsGoto)));
  });

  // "Download another form": back to step 1 with the choice and consent cleared
  // (the contact details are kept so they don't have to be typed again).
  card.querySelector("[data-forms-restart]").addEventListener("click", () => {
    radios.forEach((r) => { r.checked = false; });
    consent.checked = false;
    agreeBtn.disabled = true;
    goTo(1);
  });

  // Initial state (no focus move on load)
  agreeBtn.disabled = !consent.checked;
  goTo(1, { focus: false });
})();
