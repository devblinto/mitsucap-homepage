/* =========================================================
   Get a Quote page (/get-a-quote/) — quote form behaviour.
   - Accessible validation: errors under each field (aria-invalid +
     aria-describedby), summary in a role="alert" line by the Submit button,
     focus moves to the first invalid field.
   - Netlify Forms: posts the form (multipart, files included) with fetch and
     swaps the form for the success panel. Without JS the form posts natively
     (Netlify then redirects to the form's action, ?sent=1, which shows the panel).
   - Attachments: drag & drop or browse, up to 3 files (8 MB each), sent as
     attachment-1 … attachment-3 (Netlify keeps one file per field).
   - Progress card: highlights the step being filled in / scrolled to.
   ========================================================= */
(function () {
  "use strict";

  var form = document.getElementById("quote-form");
  if (!form) return;
  var success = document.getElementById("gaq-success");
  var status = document.getElementById("gaq-status");
  var submitBtn = form.querySelector(".gaq-submit__btn");

  var MAX_FILES = 3;
  var MAX_FILE_SIZE = 8 * 1024 * 1024;

  form.noValidate = true; // we show our own messages (native validation stays as the no-JS fallback)

  /* ---------- Success state ---------- */
  function showSuccess() {
    form.hidden = true;
    success.hidden = false;
    var layout = form.closest(".gaq__layout");
    if (layout) layout.classList.add("is-sent"); // the step progress card is no longer needed
    success.focus({ preventScroll: true });
    success.scrollIntoView({ block: "start" });
  }
  if (/[?&]sent=1\b/.test(window.location.search)) showSuccess();

  /* ---------- Helpers ---------- */
  function labelText(control) {
    var label;
    if (control.type === "radio") {
      label = control.closest("fieldset").querySelector("legend");
    } else if (control.type === "file") {
      label = document.getElementById("gaq-attachments-label");
    } else {
      label = form.querySelector('label[for="' + control.id + '"]');
    }
    return label ? label.textContent.replace(/\*/g, "").trim() : "This field";
  }
  function errorEl(control) {
    var ids = (control.closest("fieldset.gaq-choice") || control).getAttribute("aria-describedby") || "";
    var id = ids.split(" ").filter(function (x) { return /-error$/.test(x); })[0];
    return id ? document.getElementById(id) : null;
  }

  /* ---------- Validation rules ---------- */
  var RE_PHONE = /^[0-9+().\-\s]*$/;
  var RE_WEBSITE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i;
  var RE_MONEY = /^\$?\s*(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/;

  function validate(control) {
    var value = control.type === "file" ? "" : (control.value || "").trim();
    var name = labelText(control);

    if (control.type === "radio") {
      var group = form.querySelectorAll('input[name="' + control.name + '"]');
      var checked = Array.prototype.some.call(group, function (r) { return r.checked; });
      return checked || !control.required ? "" : "Please choose " + name + ".";
    }
    if (control.type === "file") return fileError;
    if (control.type === "date" && control.validity.badInput) return "Please enter a valid date.";
    if (control.required && !value) {
      if (control.dataset.requiredMsg) return control.dataset.requiredMsg;
      return control.tagName === "SELECT" ? "Please select " + name + "." : name + " is required.";
    }
    if (!value) return "";
    if (control.type === "email" && (control.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value))) {
      return "Please enter a valid email address (e.g. name@company.com).";
    }
    if (control.type === "tel" && (!RE_PHONE.test(value) || value.replace(/\D/g, "").length < 7)) {
      return "Please enter a valid phone number.";
    }
    if (control.dataset.validate === "website" && !RE_WEBSITE.test(value)) {
      return "Please enter a valid website address (e.g. www.company.com).";
    }
    if (control.dataset.validate === "money" && !RE_MONEY.test(value)) {
      return "Please enter an amount in dollars (e.g. 25,000).";
    }
    return "";
  }

  function setError(control, message) {
    var targets = control.type === "radio"
      ? form.querySelectorAll('input[name="' + control.name + '"]')
      : [control];
    Array.prototype.forEach.call(targets, function (el) {
      if (message) el.setAttribute("aria-invalid", "true");
      else el.removeAttribute("aria-invalid");
    });
    var el = errorEl(control);
    if (el) el.textContent = message;
  }

  function check(control) {
    var message = validate(control);
    setError(control, message);
    return !message;
  }

  // Controls to validate: one entry per radio group
  function controls() {
    var seen = {};
    return Array.prototype.filter.call(form.elements, function (el) {
      if (!el.name || el.type === "hidden" || el.closest(".gaq__hidden") || el.tagName === "BUTTON" || el.tagName === "FIELDSET") return false;
      if (el.type === "radio") {
        if (seen[el.name]) return false;
        seen[el.name] = true;
      }
      return true;
    });
  }

  // Live re-checks: on blur once a value was typed, and while a field shows an error
  form.addEventListener("focusout", function (e) {
    var el = e.target;
    if (!el.name || el.type === "file" || el.type === "radio") return;
    if ((el.value || "").trim() || el.getAttribute("aria-invalid") === "true") check(el);
  });
  form.addEventListener("input", function (e) {
    if (e.target.getAttribute("aria-invalid") === "true") check(e.target);
  });
  form.addEventListener("change", function (e) {
    var el = e.target;
    if (el.type === "radio" || el.tagName === "SELECT" || el.getAttribute("aria-invalid") === "true") check(el);
  });

  /* ---------- Attachments (drag & drop + browse) ---------- */
  var upload = form.querySelector(".gaq-upload");
  var fileInput = document.getElementById("gaq-attachments");
  var fileList = document.getElementById("gaq-attachments-list");
  var files = [];
  var fileError = "";
  var canSetFiles = (function () { try { return !!new DataTransfer(); } catch (e) { return false; } })();

  function formatSize(bytes) {
    return bytes < 1024 * 1024 ? Math.max(1, Math.round(bytes / 1024)) + " KB" : (bytes / 1024 / 1024).toFixed(1) + " MB";
  }
  function syncInput() {
    if (!canSetFiles) return;
    var dt = new DataTransfer();
    files.forEach(function (f) { dt.items.add(f); });
    fileInput.files = dt.files;
  }
  function renderFiles() {
    fileList.innerHTML = "";
    files.forEach(function (f, i) {
      var li = document.createElement("li");
      li.className = "gaq-upload__file";
      var name = document.createElement("span");
      name.className = "gaq-upload__name";
      name.textContent = f.name;
      var size = document.createElement("span");
      size.className = "gaq-upload__size";
      size.textContent = formatSize(f.size);
      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "gaq-upload__remove";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove " + f.name);
      remove.addEventListener("click", function () {
        files.splice(i, 1);
        fileError = "";
        syncInput();
        renderFiles();
        setError(fileInput, "");
        fileInput.focus();
      });
      li.appendChild(name);
      li.appendChild(size);
      li.appendChild(remove);
      fileList.appendChild(li);
    });
  }
  function addFiles(newFiles) {
    var problems = [];
    Array.prototype.forEach.call(newFiles, function (f) {
      if (f.size > MAX_FILE_SIZE) { problems.push("“" + f.name + "” is larger than 8 MB."); return; }
      if (files.length >= MAX_FILES) { problems.push("You can attach up to " + MAX_FILES + " files."); return; }
      files.push(f);
    });
    fileError = problems.filter(function (p, i) { return problems.indexOf(p) === i; }).join(" ");
    syncInput();
    renderFiles();
    setError(fileInput, fileError);
  }

  if (upload && fileInput) {
    fileInput.addEventListener("change", function () {
      if (!canSetFiles) { files = Array.prototype.slice.call(fileInput.files); renderFiles(); return; }
      var picked = Array.prototype.slice.call(fileInput.files);
      syncInput(); // restore the kept list first, then add the new picks
      addFiles(picked);
    });
    var zone = upload.querySelector(".gaq-upload__zone");
    var depth = 0;
    zone.addEventListener("dragenter", function (e) { e.preventDefault(); depth++; upload.classList.add("is-dragover"); });
    zone.addEventListener("dragover", function (e) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; });
    zone.addEventListener("dragleave", function () { if (--depth <= 0) { depth = 0; upload.classList.remove("is-dragover"); } });
    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      depth = 0;
      upload.classList.remove("is-dragover");
      if (e.dataTransfer && e.dataTransfer.files.length) {
        if (canSetFiles) addFiles(e.dataTransfer.files);
      }
    });
    // Dropping a file anywhere else on the page must not open it in the tab
    window.addEventListener("dragover", function (e) { if (!zone.contains(e.target)) e.preventDefault(); });
    window.addEventListener("drop", function (e) { if (!zone.contains(e.target)) e.preventDefault(); });
  }

  /* ---------- Submit (Netlify Forms via fetch) ---------- */
  var sending = false;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (sending) return;

    var invalid = controls().filter(function (el) { return !check(el); });
    if (invalid.length) {
      status.textContent = invalid.length === 1
        ? "Please correct the highlighted field."
        : "Please correct the " + invalid.length + " highlighted fields.";
      invalid[0].focus();
      return;
    }
    status.textContent = "";

    var data = new FormData(form);
    ["attachment-1", "attachment-2", "attachment-3"].forEach(function (n) { data.delete(n); });
    var toSend = canSetFiles ? files : Array.prototype.slice.call(fileInput.files, 0, MAX_FILES);
    toSend.forEach(function (f, i) { data.append("attachment-" + (i + 1), f, f.name); });

    sending = true;
    submitBtn.setAttribute("aria-disabled", "true");
    submitBtn.textContent = "Sending…";

    fetch("/", { method: "POST", body: data })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        showSuccess();
      })
      .catch(function () {
        status.textContent = "Sorry, your request could not be sent. Please try again, or call us at 281 751 7548.";
        submitBtn.focus();
      })
      .then(function () {
        sending = false;
        submitBtn.removeAttribute("aria-disabled");
        submitBtn.textContent = "Submit";
      });
  });

  /* ---------- Progress card: active step ---------- */
  var steps = Array.prototype.slice.call(form.querySelectorAll(".gaq-step"));
  var progressItems = Array.prototype.slice.call(document.querySelectorAll(".gaq-progress__step"));
  function setActive(index) {
    progressItems.forEach(function (li, i) {
      var link = li.querySelector("a");
      li.classList.toggle("is-active", i === index);
      if (i === index) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
  }
  form.addEventListener("focusin", function (e) {
    var i = steps.indexOf(e.target.closest(".gaq-step"));
    if (i > -1) setActive(i);
  });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(steps.indexOf(entry.target));
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    steps.forEach(function (s) { io.observe(s); });
  }
  // Step links: after the jump, start keyboard focus at that step
  progressItems.forEach(function (li, i) {
    li.querySelector("a").addEventListener("click", function () {
      setActive(i);
      setTimeout(function () { steps[i].focus({ preventScroll: true }); }, 0);
    });
  });
})();
