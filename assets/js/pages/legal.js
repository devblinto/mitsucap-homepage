/* ---------------------------------------------------------------
   Legal pages (/terms-of-use/, /privacy-policy/, /declaration/) — load after /script.js.
   Markup and classes: see /assets/css/pages/legal.css.

   - "On This Page": highlights the section in view; on phones it is a
     collapsible bar (closes again after a link is chosen).
   - Accordion (.legal-accordion, phones only): first section open, others
     closed with hidden="until-found" so find-in-page still reaches them;
     "Expand All" / "Collapse All"; a contents link opens its section.
     Tablet and desktop always show every section.
   --------------------------------------------------------------- */
(function () {
  const phone = window.matchMedia("(max-width: 767px)");

  // ---- Contents card ----
  const toc = document.querySelector(".legal-toc");
  const tocToggle = toc && toc.querySelector(".legal-toc__toggle");
  const tocLinks = toc ? [...toc.querySelectorAll(".legal-toc__link")] : [];
  const setToc = (open) => {
    if (!toc) return;
    toc.classList.toggle("is-open", open);
    tocToggle.setAttribute("aria-expanded", String(open));
  };
  if (tocToggle) tocToggle.addEventListener("click", () => { if (phone.matches) setToc(!toc.classList.contains("is-open")); });

  // Highlight the last section whose top has passed the upper third of the screen
  const targets = tocLinks.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
  let ticking = false;
  const spy = () => {
    ticking = false;
    const line = window.innerHeight * 0.33;
    let current = targets[0];
    for (const t of targets) if (t.getBoundingClientRect().top <= line) current = t;
    tocLinks.forEach((a) => a.classList.toggle("is-active", current && a.hash === "#" + current.id));
  };
  if (targets.length) {
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
    window.addEventListener("resize", spy);
    spy();
  }

  // ---- Accordion ----
  const accordion = document.querySelector(".legal-accordion");
  const items = accordion ? [...accordion.querySelectorAll(".legal-item")] : [];
  const allBtn = accordion && accordion.querySelector(".legal-accordion__all");
  const headerOf = (item) => item.querySelector(".legal-item__header");
  const bodyOf = (item) => item.querySelector(".legal-item__body");

  function setItem(item, open) {
    item.classList.toggle("is-open", open);
    headerOf(item).setAttribute("aria-expanded", String(open));
    const body = bodyOf(item);
    if (open) body.removeAttribute("hidden");
    else body.setAttribute("hidden", "until-found");
  }
  function syncAllButton() {
    if (!allBtn) return;
    const allOpen = items.every((i) => i.classList.contains("is-open"));
    allBtn.textContent = allOpen ? "Collapse All" : "Expand All";
    allBtn.setAttribute("aria-expanded", String(allOpen));
  }
  function applyMode() {
    if (!items.length) return;
    items.forEach((item, i) => {
      const header = headerOf(item);
      if (phone.matches) {
        header.disabled = false;
        bodyOf(item).id ||= `${item.id || "legal-item-" + i}-body`;
        header.setAttribute("aria-controls", bodyOf(item).id);
        setItem(item, i === 0);
      } else {
        header.disabled = true; // plain heading on tablet/desktop
        header.removeAttribute("aria-controls");
        item.classList.add("is-open");
        bodyOf(item).removeAttribute("hidden");
      }
    });
    syncAllButton();
  }

  items.forEach((item) => {
    headerOf(item).addEventListener("click", () => {
      if (!phone.matches) return;
      setItem(item, !item.classList.contains("is-open"));
      syncAllButton();
    });
    // Find-in-page reached hidden="until-found" text: keep the state in sync
    bodyOf(item).addEventListener("beforematch", () => { setItem(item, true); syncAllButton(); });
  });
  if (allBtn) allBtn.addEventListener("click", () => {
    const open = !items.every((i) => i.classList.contains("is-open"));
    items.forEach((i) => setItem(i, open));
    syncAllButton();
  });

  // A contents link (or any #link) to a closed section opens it before script.js scrolls there
  const openFor = (hash) => {
    if (!phone.matches || !hash) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    const item = target && target.closest(".legal-item");
    if (item && !item.classList.contains("is-open")) { setItem(item, true); syncAllButton(); }
  };
  document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener("click", () => {
    openFor(a.hash);
    if (toc && toc.contains(a) && phone.matches) setToc(false);
  }));

  applyMode();
  openFor(location.hash);
  phone.addEventListener("change", () => { applyMode(); setToc(false); });
})();
