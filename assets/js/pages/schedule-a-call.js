/* Schedule a Call page (/schedule-a-call/) — appointment calendar.
   - Renders the month grid into #cal-days (Sun–Sat), prev/next month navigation
     (current month up to MONTHS_AHEAD ahead).
   - Bookable days: Mon–Fri, not in the past, with at least one time slot left.
     "Today" and "now" are taken in Central Time (America/Chicago), the timezone the
     slots are shown in; on today's date, slots that have already started are disabled.
   - Pick a date, then a time slot (buttons with aria-pressed). Keyboard: Tab into the
     grid, arrows move by day/week, Home/End = start/end of week, PageUp/PageDown = month.
   - Submit posts the Netlify form "schedule-a-call" (hidden inputs date / date-iso /
     time / timezone) with fetch and swaps the card to a confirmation state.
   No external booking service. */
(function () {
  var page = document.querySelector(".page-schedule-a-call");
  var form = document.getElementById("booking-form");
  if (!page || !form) return;

  var MONTHS_AHEAD = 6;
  var TZ = "America/Chicago";

  var daysEl = document.getElementById("cal-days");
  var monthEl = document.getElementById("cal-month");
  var prevBtn = page.querySelector("[data-cal-prev]");
  var nextBtn = page.querySelector("[data-cal-next]");
  var slotsDay = document.getElementById("slots-day");
  var slotBtns = Array.prototype.slice.call(page.querySelectorAll(".slot"));
  var statusEl = document.getElementById("booking-status");
  var dateInput = document.getElementById("booking-date-input");
  var dateIsoInput = document.getElementById("booking-date-iso-input");
  var timeInput = document.getElementById("booking-time-input");
  var submitBtn = form.querySelector('[type="submit"]');
  var done = document.getElementById("booking-done");
  var doneWhen = document.getElementById("booking-done-when");
  var againBtn = document.getElementById("booking-again");

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Slot start hour (24h) from its label, e.g. "1:00 PM" -> 13
  slotBtns.forEach(function (b) {
    var m = /^(\d+):(\d+)\s*(AM|PM)$/i.exec(b.getAttribute("data-time"));
    var h = parseInt(m[1], 10) % 12 + (m[3].toUpperCase() === "PM" ? 12 : 0);
    b._hour = h + parseInt(m[2], 10) / 60;
  });

  // ----- "now" in Central Time -----
  function nowCT() {
    try {
      var parts = {};
      new Intl.DateTimeFormat("en-US", {
        timeZone: TZ, year: "numeric", month: "numeric", day: "numeric",
        hour: "numeric", minute: "numeric", hourCycle: "h23"
      }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
      return {
        date: new Date(+parts.year, +parts.month - 1, +parts.day),
        hour: (+parts.hour % 24) + (+parts.minute) / 60
      };
    } catch (e) {
      var n = new Date();
      return { date: new Date(n.getFullYear(), n.getMonth(), n.getDate()), hour: n.getHours() + n.getMinutes() / 60 };
    }
  }

  var now = nowCT();
  var today = now.date;
  var minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  var maxMonth = new Date(today.getFullYear(), today.getMonth() + MONTHS_AHEAD, 1);
  var lastDay = new Date(maxMonth.getFullYear(), maxMonth.getMonth() + 1, 0);

  var view = new Date(minMonth);   // first day of the month on screen
  var selDate = null;              // selected Date (local midnight)
  var selTime = null;              // selected slot label, e.g. "10:00 AM"

  function sameDay(a, b) { return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function longDate(d) { return WEEKDAYS[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + d.getDate(); }

  function slotOpen(d, btn) { return !sameDay(d, today) || btn._hour > now.hour; }
  function isBookable(d) {
    if (d < today || d > lastDay) return false;
    var wd = d.getDay();
    if (wd === 0 || wd === 6) return false;
    return slotBtns.some(function (b) { return slotOpen(d, b); });
  }
  function firstBookable(from, step) {
    if (step > 0 && from < today) from = today;
    for (var d = from, i = 0; i < 400; i++, d = addDays(d, step)) {
      if (d < today || d > lastDay) return null;
      if (isBookable(d)) return d;
    }
    return null;
  }

  // ----- Rendering -----
  function render() {
    var y = view.getFullYear(), m = view.getMonth();
    monthEl.textContent = MONTHS[m] + " " + y;
    prevBtn.disabled = view <= minMonth;
    nextBtn.disabled = view >= maxMonth;

    // roving tabindex target: selected day if visible, else first bookable day of this month
    var focusDay = selDate && selDate.getMonth() === m && selDate.getFullYear() === y ? selDate : null;
    if (!focusDay) {
      var f = firstBookable(new Date(Math.max(new Date(y, m, 1), today)), 1);
      if (f && f.getMonth() === m) focusDay = f;
    }

    var frag = document.createDocumentFragment();
    var lead = new Date(y, m, 1).getDay();
    for (var i = 0; i < lead; i++) {
      var blank = document.createElement("span");
      blank.className = "cal__blank";
      blank.setAttribute("aria-hidden", "true");
      frag.appendChild(blank);
    }
    var count = new Date(y, m + 1, 0).getDate();
    for (var day = 1; day <= count; day++) {
      var d = new Date(y, m, day);
      var b = document.createElement("button");
      b.type = "button";
      b.className = "cal__day";
      b.textContent = day;
      b.setAttribute("data-date", iso(d));
      b.setAttribute("aria-label", longDate(d) + ", " + y + (sameDay(d, today) ? " (today)" : ""));
      b.setAttribute("aria-pressed", sameDay(d, selDate) ? "true" : "false");
      if (!isBookable(d)) b.disabled = true;
      b.tabIndex = sameDay(d, focusDay) ? 0 : -1;
      frag.appendChild(b);
    }
    daysEl.textContent = "";
    daysEl.appendChild(frag);
    refreshLayout();
  }

  function renderSlots() {
    slotsDay.textContent = selDate ? longDate(selDate) : "Choose a date";
    slotBtns.forEach(function (b) {
      var open = !!selDate && slotOpen(selDate, b);
      b.disabled = !open;
      b.setAttribute("aria-pressed", open && b.getAttribute("data-time") === selTime ? "true" : "false");
    });
    dateInput.value = selDate ? longDate(selDate) + ", " + selDate.getFullYear() : "";
    dateIsoInput.value = selDate ? iso(selDate) : "";
    timeInput.value = selTime || "";
  }

  var refreshTimer;
  function refreshLayout() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }, 150);
  }

  function selectDate(d) {
    selDate = d;
    // keep the chosen time if it is still available on the new date
    if (selTime) {
      var still = slotBtns.some(function (b) { return b.getAttribute("data-time") === selTime && slotOpen(d, b); });
      if (!still) selTime = null;
    }
    setStatus("");
    renderSlots();
    Array.prototype.forEach.call(daysEl.querySelectorAll(".cal__day"), function (b) {
      var on = b.getAttribute("data-date") === iso(d);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
  }

  function setStatus(msg) { statusEl.textContent = msg; }

  function focusDate(d) {
    var month = new Date(d.getFullYear(), d.getMonth(), 1);
    if (month < minMonth || month > maxMonth) return;
    if (month.getTime() !== view.getTime()) { view = month; render(); }
    var btn = daysEl.querySelector('[data-date="' + iso(d) + '"]');
    if (!btn || btn.disabled) return;
    Array.prototype.forEach.call(daysEl.querySelectorAll(".cal__day"), function (b) { b.tabIndex = b === btn ? 0 : -1; });
    btn.focus();
  }

  // ----- Events -----
  prevBtn.addEventListener("click", function () {
    if (view <= minMonth) return;
    view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
    render();
  });
  nextBtn.addEventListener("click", function () {
    if (view >= maxMonth) return;
    view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    render();
  });

  daysEl.addEventListener("click", function (e) {
    var b = e.target.closest(".cal__day");
    if (!b || b.disabled) return;
    var p = b.getAttribute("data-date").split("-");
    selectDate(new Date(+p[0], +p[1] - 1, +p[2]));
  });

  daysEl.addEventListener("keydown", function (e) {
    var b = e.target.closest(".cal__day");
    if (!b) return;
    var p = b.getAttribute("data-date").split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    var target = null;
    switch (e.key) {
      case "ArrowLeft": target = firstBookable(addDays(d, -1), -1); break;
      case "ArrowRight": target = firstBookable(addDays(d, 1), 1); break;
      case "ArrowUp": target = firstBookable(addDays(d, -7), -1); break;
      case "ArrowDown": target = firstBookable(addDays(d, 7), 1); break;
      case "Home": target = firstBookable(addDays(d, -d.getDay()), 1); break;
      case "End": target = firstBookable(addDays(d, 6 - d.getDay()), -1); break;
      case "PageUp": target = firstBookable(new Date(d.getFullYear(), d.getMonth() - 1, d.getDate()), 1); break;
      case "PageDown": target = firstBookable(new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()), 1); break;
      default: return;
    }
    e.preventDefault();
    if (target) focusDate(target);
  });

  slotBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.disabled) return;
      selTime = b.getAttribute("data-time");
      setStatus("");
      renderSlots();
    });
  });

  function showDone(on) {
    form.hidden = on;
    done.hidden = !on;
    refreshLayout();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!selDate) { setStatus("Please choose a date."); return; }
    if (!selTime) {
      setStatus("Please choose a time slot.");
      var first = slotBtns.filter(function (b) { return !b.disabled; })[0];
      if (first) first.focus();
      return;
    }
    renderSlots();
    submitBtn.disabled = true;
    setStatus("");
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(new FormData(form)).toString()
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      doneWhen.textContent = longDate(selDate) + ", " + selDate.getFullYear() + " at " + selTime;
      showDone(true);
      done.focus();
    }).catch(function () {
      setStatus("Sorry, your booking could not be sent. Please try again or call us at 281 751 7548.");
    }).then(function () {
      submitBtn.disabled = false;
    });
  });

  againBtn.addEventListener("click", function () {
    selTime = null;
    renderSlots();
    showDone(false);
    var btn = daysEl.querySelector('.cal__day[tabindex="0"]');
    if (btn) btn.focus();
  });

  // ----- Init: first bookable weekday selected, its month on screen -----
  var start = firstBookable(today, 1);
  if (start) view = new Date(start.getFullYear(), start.getMonth(), 1);
  render();
  if (start) selectDate(start); else renderSlots();
})();
