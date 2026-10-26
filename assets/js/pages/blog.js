/* Blog — /blog/
   Topic filter chips (client-side, aria-pressed) and the "Load More Articles" placeholder.
   Loaded after /script.js. */
(function () {
  "use strict";

  var section = document.querySelector(".page-blog .blog-latest");
  if (!section) return;

  var buttons = Array.prototype.slice.call(section.querySelectorAll(".blog-filter"));
  var cards = Array.prototype.slice.call(section.querySelectorAll(".blog-card"));
  var status = section.querySelector("[data-blog-status]");
  var empty = section.querySelector("[data-blog-empty]");

  function applyFilter(button) {
    var topic = button.getAttribute("data-filter");
    var shown = 0;

    buttons.forEach(function (b) { b.setAttribute("aria-pressed", b === button ? "true" : "false"); });
    cards.forEach(function (card) {
      var match = topic === "all" || card.getAttribute("data-topic") === topic;
      card.hidden = !match;
      if (match) shown += 1;
    });

    if (empty) empty.hidden = shown > 0;
    if (status) {
      status.textContent = (topic === "all" ? "Showing all articles" : "Showing " + button.textContent.trim() + " articles") +
        " (" + shown + ")";
    }

    // The page got shorter/taller: let ScrollTrigger recalculate the later reveal positions.
    if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === "function") {
      window.ScrollTrigger.refresh();
    }
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (button.getAttribute("aria-pressed") === "true") return;
      applyFilter(button);
    });
  });

  // TODO: "Load More Articles" — load the next page of posts once real blog posts exist.
  var more = section.querySelector("[data-blog-more]");
  if (more) {
    more.addEventListener("click", function () { /* no-op until real posts exist */ });
  }
})();
