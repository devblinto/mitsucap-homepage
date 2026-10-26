/* News page (/news/).
   1. Filter chips (All / News / Insights / Guides) show or hide the article cards by
      their data-type, set aria-pressed, and announce the result in the status line.
   2. "Read" cursor: on devices with a mouse (and without reduced motion) a dark
      "Read" circle follows the pointer inside the hovered card (Figma 2649:957).
   3. Placeholder links / buttons: article pages and "Load More" don't exist yet
      (TODO), so href="#" and the aria-disabled button do nothing. */
(function () {
  var page = document.querySelector(".page-news");
  if (!page) return;
  var list = page.querySelector(".news-list");
  if (!list) return;

  var items = [].slice.call(list.querySelectorAll(".news-list__item"));
  var cards = [].slice.call(list.querySelectorAll(".news-card"));
  var filters = [].slice.call(page.querySelectorAll(".news-filter"));
  var status = page.querySelector("[data-news-status]");

  /* ---------- 1. Filters ---------- */
  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var type = btn.getAttribute("data-filter");
      filters.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
      var shown = 0;
      items.forEach(function (item) {
        var show = type === "all" || item.getAttribute("data-type") === type;
        item.hidden = !show;
        if (show) shown++;
      });
      if (status) status.textContent = "Showing " + shown + (shown === 1 ? " article" : " articles");
      // Cards moved: let the scroll-reveal triggers re-measure
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    });
  });

  /* ---------- 3. Placeholder links / Load More (TODO: real article pages) ---------- */
  cards.forEach(function (card) {
    card.addEventListener("click", function (e) {
      if (card.getAttribute("href") === "#") e.preventDefault();
    });
  });

  /* ---------- 2. "Read" cursor ---------- */
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!finePointer.matches || reduceMotion.matches) return;
  list.classList.add("has-read-cursor");

  var active = null;          // hovered card
  var cursor = null;          // its .news-card__cursor
  var pointer = { x: 0, y: 0 }; // last pointer position (viewport)
  var pos = { x: 0, y: 0 };     // eased cursor position (card coordinates)
  var rafId = 0;

  function target() {
    var r = active.getBoundingClientRect();
    return { x: pointer.x - r.left, y: pointer.y - r.top };
  }
  function place() {
    cursor.style.transform = "translate3d(" + pos.x.toFixed(1) + "px," + pos.y.toFixed(1) + "px,0)";
  }
  // Ease towards the pointer every frame (also keeps it under the pointer while the page scrolls)
  function frame() {
    if (!active) { rafId = 0; return; }
    var t = target();
    pos.x += (t.x - pos.x) * 0.22;
    pos.y += (t.y - pos.y) * 0.22;
    place();
    rafId = requestAnimationFrame(frame);
  }

  cards.forEach(function (card) {
    card.addEventListener("pointerenter", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      active = card;
      cursor = card.querySelector(".news-card__cursor");
      pointer.x = e.clientX; pointer.y = e.clientY;
      pos = target();      // appear right under the pointer
      place();
      card.classList.add("is-cursor");
      if (!rafId) rafId = requestAnimationFrame(frame);
    });
    card.addEventListener("pointermove", function (e) {
      pointer.x = e.clientX; pointer.y = e.clientY;
    });
    card.addEventListener("pointerleave", function () {
      card.classList.remove("is-cursor");
      if (active === card) active = null;
    });
  });
})();
