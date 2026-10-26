/* Contact page (/contact/) — form validation + Netlify Forms AJAX submit.
   - The form is a Netlify form (data-netlify="true", honeypot "bot-field"): Netlify detects it at
     deploy time and stores submissions. Without JS the browser validates natively (required/type)
     and Netlify shows its default "thank you" page.
   - With JS: native validation is replaced by inline, accessible errors (aria-invalid +
     aria-describedby). After the fields pass, the form is POSTed (urlencoded) and the success
     panel is only shown if the POST succeeds. */
(function () {
  var form = document.getElementById("contact-form");
  if (!form) return;

  var success = document.getElementById("contact-success");
  var status = form.querySelector(".contact-form__status");
  var submit = form.querySelector('[type="submit"]');
  var fields = Array.prototype.slice.call(form.querySelectorAll("[data-error]"));
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  form.setAttribute("novalidate", "");

  function errorFor(field) {
    var value = field.value.trim();
    if (!value) return field.getAttribute("data-error");
    if (field.type === "email" && !EMAIL.test(value)) return field.getAttribute("data-error-format");
    if (field.type === "tel") {
      var digits = value.replace(/\D/g, "");
      if (digits.length < 7 || digits.length > 15 || /[^\d\s()+.\-x]/i.test(value)) return field.getAttribute("data-error-format");
    }
    return "";
  }

  function show(field, message) {
    var el = document.getElementById(field.getAttribute("aria-describedby"));
    if (message) {
      field.setAttribute("aria-invalid", "true");
      if (el) { el.textContent = message; el.hidden = false; }
    } else {
      field.removeAttribute("aria-invalid");
      if (el) { el.textContent = ""; el.hidden = true; }
    }
  }

  function check(field) {
    var message = errorFor(field);
    show(field, message);
    return !message;
  }

  // Re-check a field live once it has been flagged, and on blur once the user has typed in it.
  fields.forEach(function (field) {
    var evt = field.tagName === "SELECT" ? "change" : "input";
    field.addEventListener(evt, function () {
      if (field.getAttribute("aria-invalid") === "true") check(field);
    });
    field.addEventListener("blur", function () {
      if (field.value.trim() || field.getAttribute("aria-invalid") === "true") check(field);
    });
  });

  function setStatus(html, isError) {
    status.innerHTML = html;
    status.classList.toggle("is-error", !!isError);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (form.getAttribute("aria-busy") === "true") return;

    var firstInvalid = null;
    fields.forEach(function (field) {
      if (!check(field) && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) {
      setStatus("Please correct the highlighted fields.", true);
      firstInvalid.focus();
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();   // error messages change the page height
      return;
    }

    setStatus("Sending…", false);
    form.setAttribute("aria-busy", "true");
    submit.setAttribute("aria-busy", "true");
    submit.disabled = true;

    var body = new URLSearchParams(new FormData(form)).toString();
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        form.reset();
        setStatus("", false);
        form.hidden = true;
        success.hidden = false;
        success.focus();
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      })
      .catch(function () {
        setStatus('Sorry, your message could not be sent. Please try again or e-mail <a href="mailto:info@mitsucap.com">info@mitsucap.com</a>.', true);
      })
      .then(function () {
        form.removeAttribute("aria-busy");
        submit.removeAttribute("aria-busy");
        submit.disabled = false;
      });
  });
})();
