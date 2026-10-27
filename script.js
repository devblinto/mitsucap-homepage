/* =========================================================
   MitsuCap v3 — animations and interactions
   Same toolkit as v2 (GSAP + ScrollTrigger + SplitText, Lenis).

   How reveals work (all set from HTML attributes):
   - data-reveal-group           A trigger. Its reveals play once when its top
                                 reaches the bottom of the screen.
                                 data-reveal-group="load" plays on page load.
   - data-reveal="chars"         Heading: letters fade in from the centre out.
   - data-reveal="from-below"    Fade + slide in. Also from-above / from-left /
                                 from-right. data-reveal-at = start time (s),
                                 data-reveal-distance = slide distance (px).
   - data-reveal="stagger"       Children fade up one after another
                                 (own trigger).
   - data-count="20"             Number counts up from 0 (stat cards).

   Site header + mega menu (.site-header, all pages; markup in _partials/header.html,
   styles in assets/css/site.css): see startSiteHeader. Desktop dropdowns open on
   hover/click; tablet & mobile use a full-screen accordion menu (scroll locked,
   Lenis paused, focus trapped, Esc closes).

   Stat cards (.stat-card): each rises in as it scrolls into view and its
   number counts up; cards entering together play one after another.

   Core Values (.values) is a pinned horizontal scroll: section height = one
   screen + the row's overflow width; while pinned, scroll progress moves the
   card row sideways 1:1 and the active slide bar stretches out. The cards
   reveal like What Affects Rate (rise one after another, text slides up,
   icon pops).

   Industries (.industries__row) are auto-advancing tabs: each industry stays
   active for 6s while the line above it fills (linear), then the next one
   takes over (looping). Clicking an industry jumps to it.

   What Affects Rate (.rate__grid) and Core Values (.values__track): cards rise
   one after another; inside each,
   the icon pops, then the title and description slide up.

   Hero (.hero-scene) pins while a window grows out of the headline photo and
   reveals the dark hero (see startHeroScene).

   Program cards (.program-card) turn dark on hover (CSS only).

   Glass cards (Core Values, What Affects Rate) hover in CSS, modelled on
   riact.ai "Accelerate value generation": red rim flips in, red tint,
   red icon, and the description brightens.

   Grid backgrounds (.blink-grid on hero and footer) blink like
   concourse.ai: every 0.24–0.62s, 1–2 random squares light up, stay lit
   1.4–2.8s, and fade over 1.8s (CSS transition on .blink-cell).
   ========================================================= */

(function () {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Scrollbar width for the CSS --gutter, so the 1200px content column is truly centred
  const setScrollbar = () => {
    if (root.classList.contains("lenis-stopped")) return; // scroll lock hides the scrollbar
    const w = `${Math.max(0, window.innerWidth - root.clientWidth)}px`;
    if (root.style.getPropertyValue("--scrollbar") !== w) root.style.setProperty("--scrollbar", w);
  };
  setScrollbar();
  window.addEventListener("resize", setScrollbar);

  // Smooth scrolling (Lenis)
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new Lenis({
      lerp: 0.07,           // lower = slower, softer glide (Lenis default 0.1)
      wheelMultiplier: 0.8, // each wheel step moves the page a bit less
      smoothWheel: true,
    });
    if (window.gsap) {
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  // Scroll to a page position, gliding with Lenis when it's on
  const scrollToY = (y) => (lenis ? lenis.scrollTo(y, { duration: 1.2 }) : window.scrollTo({ top: y, behavior: "smooth" }));
  const scrollPos = () => (lenis ? lenis.scroll : window.scrollY);

  // One scroll loop for every scroll-driven effect: with Lenis the jobs run inside
  // its own frame (no extra lag); without it, at most once per animation frame.
  const scrollJobs = [];
  const runScrollJobs = () => { for (const job of scrollJobs) job(); };
  let scrollQueued = false;
  const queueScrollJobs = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => { scrollQueued = false; runScrollJobs(); });
  };
  if (lenis) lenis.on("scroll", runScrollJobs);
  else window.addEventListener("scroll", queueScrollJobs, { passive: true });

  // Measurements are cached and only redone when the layout can change
  const measureJobs = [];
  const remeasure = () => { for (const job of measureJobs) job(); runScrollJobs(); };
  let resizeTimer;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(remeasure, 120); });

  // Same-page anchor links glide to their target, including full-path links like
  // /industries-served/#medical while already on that page. The target's
  // scroll-margin-top is kept as the gap above it.
  const anchorTarget = (hash) => {
    if (!hash || hash === "#") return null;
    try { return document.getElementById(decodeURIComponent(hash.slice(1))); } catch (_) { return null; }
  };
  const anchorY = (target) => scrollPos() + target.getBoundingClientRect().top - (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href*='#']");
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname) return;
    const target = anchorTarget(url.hash);
    if (!target) return;
    e.preventDefault();
    scrollToY(anchorY(target));
    history.pushState(null, "", url.hash);
  });
  // Arriving with a #hash: settle on the target once pinned sections have measured
  window.addEventListener("load", () => {
    const target = anchorTarget(location.hash);
    if (!target) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const y = anchorY(target);
      if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
    }));
  });
  window.addEventListener("load", remeasure);
  if (document.fonts) document.fonts.ready.then(remeasure);

  // Page position of an element, ignoring transforms (offset chain)
  const offsetWithin = (el, ancestor) => {
    let x = 0, y = 0;
    for (let n = el; n && n !== ancestor; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
    return { x, y };
  };
  const pageTop = (el) => el.getBoundingClientRect().top + window.scrollY;

  // Logo marquees (light + dark hero): duplicate each set so the loop is seamless.
  // Both start in the same frame, so the two strips stay in step.
  function startMarquee() {
    document.querySelectorAll(".associations__marquee").forEach((marquee) => {
      const set = marquee.querySelector(".associations__set");
      const clone = set.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      marquee.appendChild(clone);
      marquee.classList.add("is-running");
      // Pause while off screen (saves work during the rest of the page). Both hero strips
      // watch the hero stage, so they always pause/resume together and stay in step.
      const target = marquee.closest(".hero-stage") || marquee;
      new IntersectionObserver(([entry]) => marquee.classList.toggle("is-paused", !entry.isIntersecting)).observe(target);
    });
  }

  // Site header + mega menu (shared by every page; markup in _partials/header.html).
  // Desktop (≥1200px): hovering a top item opens its dropdown (short close delay so the
  //   pointer can travel to the panel); clicking/Enter/Space toggles it; ↓ opens it and
  //   focuses the first link; Esc closes and returns focus; clicking outside or tabbing
  //   away closes it. Wide panels are shifted back inside the page margins.
  // Tablet & mobile: ☰ opens .site-nav as a full-screen dialog (scroll locked, Lenis
  //   paused, focus kept inside, Esc / close button / any link closes it). Top items
  //   become accordion sections; one is open at a time.
  function startSiteHeader(header) {
    const nav = header.querySelector(".site-nav");
    const toggle = header.querySelector(".site-header__toggle");
    const closeBtn = header.querySelector(".site-nav__close");
    const items = [...header.querySelectorAll(".site-nav__item")];
    if (!nav) return;
    const desktop = window.matchMedia("(min-width: 1200px)");
    const HOVER_CLOSE_DELAY = 180;
    let openItem = null;
    let closeTimer = 0;
    let menuOpen = false;
    let openedAt = 0; // scroll position when a desktop dropdown opened

    const triggerOf = (item) => item.querySelector(".site-nav__trigger");
    const megaOf = (item) => item.querySelector(".mega");

    // Keep a wide dropdown inside the page margins (desktop only)
    function placePanel(item) {
      const mega = megaOf(item);
      mega.style.setProperty("--mega-shift", "0px");
      if (!desktop.matches) return;
      const gutter = parseFloat(getComputedStyle(header).paddingRight) || 0;
      const itemLeft = item.getBoundingClientRect().left;
      const left = itemLeft + mega.offsetLeft;
      const maxLeft = document.documentElement.clientWidth - gutter - mega.offsetWidth;
      const shift = Math.min(0, maxLeft - left);
      mega.style.setProperty("--mega-shift", `${Math.round(shift)}px`);
    }

    function openSection(item) {
      clearTimeout(closeTimer);
      if (openItem && openItem !== item) closeSection(openItem);
      openItem = item;
      openedAt = scrollPos();
      if (desktop.matches) placePanel(item);
      item.classList.add("is-open");
      triggerOf(item).setAttribute("aria-expanded", "true");
    }
    function closeSection(item) {
      if (!item) return;
      item.classList.remove("is-open");
      triggerOf(item).setAttribute("aria-expanded", "false");
      if (openItem === item) openItem = null;
    }

    items.forEach((item) => {
      const trigger = triggerOf(item);
      trigger.addEventListener("click", (e) => {
        // A desktop mouse click on an item the pointer already opened keeps it open
        const hoverOpened = desktop.matches && e.pointerType === "mouse";
        if (item.classList.contains("is-open") && !hoverOpened) closeSection(item);
        else openSection(item);
      });
      trigger.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown" && desktop.matches) {
          e.preventDefault();
          openSection(item);
          const first = item.querySelector(".mega__link");
          if (first) first.focus();
        }
      });
      // Desktop hover (mouse only; touch uses click)
      item.addEventListener("pointerenter", (e) => {
        if (!desktop.matches || e.pointerType !== "mouse") return;
        openSection(item);
      });
      item.addEventListener("pointerleave", (e) => {
        if (!desktop.matches || e.pointerType !== "mouse") return;
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => closeSection(item), HOVER_CLOSE_DELAY);
      });
      // Tabbing out of a desktop dropdown closes it
      item.addEventListener("focusout", (e) => {
        if (!desktop.matches) return;
        if (!item.contains(e.relatedTarget)) closeSection(item);
      });
    });

    document.addEventListener("click", (e) => {
      if (desktop.matches && openItem && !openItem.contains(e.target)) closeSection(openItem);
    });

    // Scrolling the page away (>60px) closes a desktop dropdown (the homepage hero
    // reveal would otherwise slide over it)
    scrollJobs.push(() => {
      if (openItem && desktop.matches && Math.abs(scrollPos() - openedAt) > 60) closeSection(openItem);
    });

    // ---- Tablet & mobile overlay ----
    const focusables = () => [...nav.querySelectorAll("a[href], button:not([disabled])")]
      .filter((el) => el.offsetParent !== null || el === closeBtn);

    function openMenu() {
      menuOpen = true;
      nav.classList.add("is-open");
      nav.setAttribute("role", "dialog");
      nav.setAttribute("aria-modal", "true");
      toggle.setAttribute("aria-expanded", "true");
      root.classList.add("menu-open");
      if (lenis) lenis.stop();
      // wait a moment for visibility to switch on before moving focus
      setTimeout(() => { if (menuOpen && closeBtn) closeBtn.focus(); }, 30);
    }
    function closeMenu(returnFocus = true) {
      if (!menuOpen) return;
      menuOpen = false;
      nav.classList.remove("is-open");
      nav.removeAttribute("role");
      nav.removeAttribute("aria-modal");
      toggle.setAttribute("aria-expanded", "false");
      root.classList.remove("menu-open");
      if (lenis) lenis.start();
      if (openItem) closeSection(openItem);
      if (returnFocus) toggle.focus();
    }
    if (toggle) toggle.addEventListener("click", openMenu);
    if (closeBtn) closeBtn.addEventListener("click", () => closeMenu());
    nav.querySelectorAll("a[href]").forEach((a) => a.addEventListener("click", () => {
      closeMenu(false);
      if (desktop.matches && openItem) closeSection(openItem);
    }));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (menuOpen) { closeMenu(); return; }
        if (openItem) {
          const trigger = triggerOf(openItem);
          closeSection(openItem);
          trigger.focus();
        }
        return;
      }
      // Focus trap inside the open overlay
      if (e.key === "Tab" && menuOpen) {
        const list = focusables();
        if (!list.length) return;
        const first = list[0], last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Switching between desktop and tablet layouts resets everything
    desktop.addEventListener("change", () => {
      closeMenu(false);
      if (openItem) closeSection(openItem);
    });
  }
  document.querySelectorAll(".site-header").forEach(startSiteHeader);

  // Hero scroll scene (modelled on theclimatepledge.com).
  // While the stage is pinned, a rounded window grows from the headline photo to
  // the full screen and reveals the dark hero. The photo inside the window is
  // re-fitted every frame to cover it, so the thumbnail itself seems to expand.
  function startHeroScene(scene) {
    const stage = scene.querySelector(".hero-stage");
    const light = scene.querySelector(".hero");
    const dark = scene.querySelector(".hero-dark");
    const photo = dark.querySelector(".hero-dark__photo");
    const shade = dark.querySelector(".hero-dark__shade");
    const content = dark.querySelector(".hero-dark__content");
    const thumb = light.querySelector(".hero__title-img");
    const IW = 1672, IH = 941; // photo's natural size
    const DRIFT = 60;          // light hero drifts up this far
    const TRAVEL = 1.4;        // reveal takes 1.4 screens of scrolling
    const FOLLOW = 0.14;       // how quickly the reveal catches up with the scroll (per 60fps frame)
    let travel = 0, sceneTop = 0, W = 0, H = 0;
    let thumbBox = { x: 0, y: 0, w: 0, h: 0 }; // thumbnail position in the stage, without transforms
    let target = 0;   // progress from the scroll position
    let shown = -1;   // progress currently drawn (glides towards target)
    let rafId = 0, lastTime = 0;

    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const range = (p, a, b) => clamp01((p - a) / (b - a));
    const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2; // gentle start and finish
    const smooth = (t) => t * t * (3 - 2 * t);                     // smoothstep for fades
    const r2 = (v) => Math.round(v * 100) / 100;

    // Decode the big photo up front so the first frame of the reveal doesn't hitch
    if (photo.decode) photo.decode().catch(() => {});

    // The reveal is desktop-only: the tablet and mobile designs show the light hero alone
    const desktop = window.matchMedia("(min-width: 1200px)");
    desktop.addEventListener("change", () => remeasure());

    function measure() {
      if (!desktop.matches) {
        travel = 0;
        scene.style.height = "";
        shown = -1;
        render(0);
        return;
      }
      travel = Math.round(window.innerHeight * TRAVEL);
      scene.style.height = stage.offsetHeight + travel + "px";
      sceneTop = pageTop(scene);
      W = stage.clientWidth;
      H = stage.clientHeight;
      const o = offsetWithin(thumb, stage);
      thumbBox = { x: o.x, y: o.y, w: thumb.offsetWidth, h: thumb.offsetHeight };
      if (shown >= 0) render(shown); // redraw at the new size
    }

    // Scroll sets the target; the drawn progress glides after it every frame
    function update() {
      target = travel > 0 ? clamp01((scrollPos() - sceneTop) / travel) : 0;
      if (shown < 0) { shown = target; render(shown); return; } // first paint: no glide
      if (!rafId && target !== shown) { lastTime = 0; rafId = requestAnimationFrame(glide); }
    }

    function glide(now) {
      const dt = lastTime ? Math.min(64, now - lastTime) : 16.7;
      lastTime = now;
      const f = 1 - Math.pow(1 - FOLLOW, dt / 16.7); // same feel at 60Hz and 120Hz
      shown += (target - shown) * f;
      if (Math.abs(target - shown) < 0.0004) shown = target;
      render(shown);
      rafId = shown !== target ? requestAnimationFrame(glide) : 0;
    }

    function render(p) {
      if (p <= 0) {
        dark.style.visibility = "hidden";
        light.style.transform = "";
        return;
      }
      dark.style.visibility = "visible";
      const e = easeInOutSine(p);
      const k = 1 - e;

      // Light hero drifts up a little, as on the reference
      const drift = -DRIFT * e;
      light.style.transform = `translate3d(0, ${r2(drift)}px, 0)`;

      // Window: from the thumbnail's box (6px corners) to the whole stage
      const top = (thumbBox.y + drift) * k;
      const left = thumbBox.x * k;
      const right = (W - thumbBox.x - thumbBox.w) * k;
      const bottom = (H - thumbBox.y - drift - thumbBox.h) * k;
      dark.style.clipPath = `inset(${r2(top)}px ${r2(right)}px ${r2(bottom)}px ${r2(left)}px round ${r2(6 * k)}px)`;

      // Photo covers the window exactly (object-fit: cover, centred)
      const w = W - left - right, h = H - top - bottom;
      const scale = Math.max(w / IW, h / IH);
      const x = left + w / 2 - (IW * scale) / 2;
      const y = top + h / 2 - (IH * scale) / 2;
      photo.style.transform = `translate3d(${r2(x)}px, ${r2(y)}px, 0) scale(${scale.toFixed(4)})`;

      // Shade darkens as the window opens; dark-hero text fades up in the second half
      shade.style.opacity = smooth(range(p, 0.1, 0.8)).toFixed(3);
      const c = smooth(range(p, 0.45, 0.9));
      content.style.opacity = c.toFixed(3);
      content.style.transform = `translate3d(0, ${r2((1 - c) * 40)}px, 0)`;
    }

    measure();
    measureJobs.push(measure);
    scrollJobs.push(update);
    update();
  }

  if (!reduceMotion) document.querySelectorAll(".hero-scene").forEach(startHeroScene);

  // Blinking grid squares (concourse.ai pattern). The <span>s inside a grid are
  // the squares shaded in the design: they start lit, then join the blinking.
  function startBlinkGrid(grid) {
    const size = parseFloat(grid.dataset.cell);
    const offsetX = parseFloat(grid.dataset.offsetX) || 0;
    const offsetY = parseFloat(grid.dataset.offsetY) || 0;
    const line = parseFloat(grid.dataset.line) || 0; // keep the grid line visible
    const rand = (min, range) => min + range * Math.random();
    let cells = [];
    let visible = false;
    let tickTimer = null;

    function build() {
      const w = grid.clientWidth;
      const h = grid.clientHeight;
      // Below 1200px the hero grid is pinned to the left (as in the tablet/mobile Figma frames)
      const smallX = parseFloat(grid.dataset.smallAnchorX);
      const anchorX = !Number.isNaN(smallX) && w < 1200
        ? smallX
        : (grid.dataset.anchor === "center" ? w / 2 : 0) + offsetX;
      const x0 = anchorX - Math.ceil(anchorX / size) * size; // first column edge (≤ 0)
      const y0 = offsetY - Math.ceil(offsetY / size) * size;
      const cols = Math.ceil((w - x0) / size);
      const rows = Math.ceil((h - y0) / size);

      // Squares lit in the design become the starting state
      const seeds = [...grid.querySelectorAll(":scope > span")].map((s) => {
        const i = Math.round((s.offsetLeft - x0) / size);
        const j = Math.round((s.offsetTop - y0) / size);
        s.remove();
        return j * cols + i;
      });

      grid.querySelectorAll(".blink-cell").forEach((c) => c.remove());
      const frag = document.createDocumentFragment();
      cells = [];
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const c = document.createElement("span");
          c.className = "blink-cell";
          c.style.cssText = `left:${x0 + i * size}px;top:${y0 + j * size}px;width:${size - line}px;height:${size - line}px`;
          frag.appendChild(c);
          cells.push(c);
        }
      }
      grid.appendChild(frag);

      seeds.forEach((idx) => {
        const c = cells[idx];
        if (!c) return;
        c.style.transition = "none"; // show lit immediately on load…
        c.classList.add("is-lit");
        void c.offsetWidth;          // …then restore the 1.8s fade for later changes
        c.style.transition = "";
        setTimeout(() => c.classList.remove("is-lit"), rand(1400, 1400));
      });
    }

    function tick() {
      if (!visible || !cells.length) { tickTimer = null; return; }
      const count = 1 + Math.floor(2 * Math.random());
      for (let k = 0; k < count; k++) {
        const c = cells[Math.floor(Math.random() * cells.length)];
        c.classList.add("is-lit");
        setTimeout(() => c.classList.remove("is-lit"), rand(1400, 1400));
      }
      tickTimer = setTimeout(tick, rand(240, 380));
    }

    build();

    // Only blink while the grid is on screen
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !tickTimer) tickTimer = setTimeout(tick, 200);
    }).observe(grid);

    // Rebuild when the width changes (fluid layout)
    let lastWidth = grid.clientWidth;
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (grid.clientWidth !== lastWidth) { lastWidth = grid.clientWidth; build(); }
      }, 150);
    });
  }

  if (!reduceMotion) document.querySelectorAll(".blink-grid").forEach(startBlinkGrid);

  // Core Values: pinned horizontal scroll
  function startValuesScroll(section) {
    const pin = section.querySelector(".values__pin");
    const viewport = section.querySelector(".values__viewport");
    const track = section.querySelector(".values__track");
    const dots = [...section.querySelectorAll(".values__bars button")];
    let maxScroll = 0;
    let sectionTop = 0;
    let activeDot = -1;
    let lastProgress = -1;

    // Bars jump to the start / middle / end of the row
    dots.forEach((dot, i) => dot.addEventListener("click", () => {
      if (section.classList.contains("is-static")) {
        viewport.scrollTo({ left: (i / (dots.length - 1)) * (viewport.scrollWidth - viewport.clientWidth), behavior: "smooth" });
        return;
      }
      scrollToY(sectionTop + (i / (dots.length - 1)) * maxScroll);
    }));

    // The bar nearest the scroll position is active (it stretches in CSS)
    function setProgress(progress) {
      const active = Math.round(progress * (dots.length - 1));
      if (active !== activeDot) {
        activeDot = active;
        dots.forEach((d, i) => d.classList.toggle("is-active", i === active));
      }
    }

    // Swipe mode (tablet & mobile, or reduced motion): a native sideways-scrolling
    // row that snaps to cards; the bars follow the swipe.
    const desktop = window.matchMedia("(min-width: 1200px)");
    const isStatic = () => reduceMotion || !desktop.matches;
    function onSwipe() {
      if (!section.classList.contains("is-static")) return;
      const max = viewport.scrollWidth - viewport.clientWidth;
      setProgress(max > 0 ? viewport.scrollLeft / max : 0);
    }
    viewport.addEventListener("scroll", onSwipe, { passive: true });
    desktop.addEventListener("change", () => remeasure());

    // How far the row must travel so the last card ends at the right page margin
    function measure() {
      if (isStatic()) {
        section.classList.add("is-static");
        section.style.height = "";
        track.style.transform = "";
        maxScroll = 0;
        activeDot = -1;
        onSwipe();
        return;
      }
      section.classList.remove("is-static");
      const rowWidth = track.scrollWidth; // includes the right margin
      maxScroll = Math.max(0, rowWidth - viewport.clientWidth);
      section.style.height = pin.offsetHeight + maxScroll + "px";
      sectionTop = pageTop(section);
      lastProgress = -1; // force a redraw
    }

    function update() {
      if (section.classList.contains("is-static")) return;
      const travelled = scrollPos() - sectionTop; // px scrolled into the section
      const progress = maxScroll > 0 ? Math.min(1, Math.max(0, travelled / maxScroll)) : 0;
      if (progress === lastProgress) return;
      lastProgress = progress;
      track.style.transform = `translate3d(${(-progress * maxScroll).toFixed(2)}px, 0, 0)`;
      setProgress(progress);
    }

    measure();
    measureJobs.push(measure);
    scrollJobs.push(update);
    update();
  }

  document.querySelectorAll(".values").forEach(startValuesScroll);

  // Industries: timed tabs
  function startIndustryTabs(row) {
    const DURATION = 6000; // ms per industry
    const items = [...row.querySelectorAll(".industries__item")];
    const bars = items.map((li) => li.querySelector(".industries__progress"));
    const images = [...row.querySelectorAll(".industries__img")];
    let active = 0;
    let elapsed = 0;      // time spent on the current industry
    let last = null;      // previous animation frame time
    let rafId = 0;        // the timer only runs while the section is on screen

    function go(i) {
      active = i;
      elapsed = 0;
      items.forEach((li, k) => {
        li.classList.toggle("is-active", k === i);
        li.querySelector(".industries__btn").setAttribute("aria-expanded", k === i ? "true" : "false");
      });
      images.forEach((img, k) => img.classList.toggle("is-active", k === i));
      // Timer line grows with scaleX (GPU) instead of width (layout)
      bars.forEach((bar, k) => { bar.style.transform = `scaleX(${k === i && reduceMotion ? 1 : 0})`; });
    }

    function frame(now) {
      if (last !== null) {
        elapsed += now - last;
        const t = Math.min(1, elapsed / DURATION);
        bars[active].style.transform = `scaleX(${t.toFixed(4)})`;
        if (t >= 1) go((active + 1) % items.length);
      }
      last = now;
      rafId = requestAnimationFrame(frame);
    }

    items.forEach((li, i) => li.querySelector(".industries__btn").addEventListener("click", () => go(i)));
    go(0);

    if (!reduceMotion) {
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !rafId) { last = null; rafId = requestAnimationFrame(frame); }
        else if (!entry.isIntersecting && rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      }, { threshold: 0.25 }).observe(row);
    }
  }

  document.querySelectorAll(".industries__row").forEach(startIndustryTabs);

  if (reduceMotion || !window.gsap || !window.ScrollTrigger || !window.SplitText) {
    root.classList.remove("anim");
    if (!reduceMotion) startMarquee();
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);
  if (lenis) lenis.on("scroll", ScrollTrigger.update);

  // Reveal timings: a touch longer than v2 with a softer, longer-tailed ease-out
  // (power3/expo-style) so things glide to rest instead of stopping short
  const T = {
    chars: { at: 0.3, duration: 0.9, ease: "power2.out", stagger: { amount: 0.6, from: "center" } },
    slide: { at: 0.55, duration: 1.1, ease: "power3.out", distance: 50 },
    stagger: { at: 0.3, duration: 1.1, ease: "power3.out", distance: 60, amount: 0.6 },
  };
  gsap.defaults({ overwrite: "auto" });

  const DIRECTIONS = {
    "from-below": (d) => ({ y: d }),
    "from-above": (d) => ({ y: -d }),
    "from-right": (d) => ({ x: d }),
    "from-left": (d) => ({ x: -d }),
  };

  const num = (el, name, fallback) => {
    const v = parseFloat(el.getAttribute(name));
    return Number.isNaN(v) ? fallback : v;
  };

  const scrollTriggerFor = (trigger) => ({
    trigger,
    start: "top bottom",
    toggleActions: "play none none none", // plays once, never reverses
  });

  // Add one reveal target to a timeline
  function addReveal(tl, el) {
    const type = el.getAttribute("data-reveal");

    if (type === "chars") {
      const split = new SplitText(el, { type: "words,chars" });
      gsap.set(el, { visibility: "visible" });
      tl.from(split.chars, {
        opacity: 0,
        duration: T.chars.duration,
        ease: T.chars.ease,
        stagger: T.chars.stagger,
      }, num(el, "data-reveal-at", T.chars.at));
      return;
    }

    const dir = DIRECTIONS[type];
    if (!dir) return;
    tl.from(el, {
      autoAlpha: 0,
      ...dir(num(el, "data-reveal-distance", T.slide.distance)),
      duration: T.slide.duration,
      ease: T.slide.ease,
    }, num(el, "data-reveal-at", T.slide.at));
  }

  function buildGroups() {
    document.querySelectorAll("[data-reveal-group]").forEach((group) => {
      const onLoad = group.getAttribute("data-reveal-group") === "load";
      const tl = gsap.timeline(onLoad ? {} : { scrollTrigger: scrollTriggerFor(group) });

      const targets = [...group.querySelectorAll("[data-reveal]")];
      if (group.hasAttribute("data-reveal")) targets.unshift(group);
      targets
        .filter((el) => el.getAttribute("data-reveal") !== "stagger")
        .forEach((el) => addReveal(tl, el));
    });
  }

  function buildStaggers() {
    document.querySelectorAll('[data-reveal="stagger"]').forEach((list) => {
      gsap.timeline({ scrollTrigger: scrollTriggerFor(list) }).from(list.children, {
        autoAlpha: 0,
        y: num(list, "data-reveal-distance", T.stagger.distance),
        duration: T.stagger.duration,
        ease: T.stagger.ease,
        stagger: { amount: T.stagger.amount },
      }, num(list, "data-reveal-at", T.stagger.at));
    });
  }

  // Stat cards: each card rises in, then its number counts up from 0.
  // Cards that enter together still play one after another.
  function buildStatCards() {
    let nextStart = 0;
    document.querySelectorAll(".stat-card").forEach((card) => {
      const el = card.querySelector("[data-count]");
      const end = parseFloat(el.dataset.count);
      const counter = { value: 0 };
      el.textContent = "0";
      const text = card.querySelectorAll(".stat-card__label, .stat-card__text");
      gsap.set(card, { visibility: "visible" });
      const tl = gsap.timeline({ paused: true })
        .from(card, { autoAlpha: 0, y: 60, duration: 1, ease: "power3.out" }, 0)
        .to(counter, {
          value: end,
          duration: 2,
          ease: "power2.out",
          onUpdate: () => { el.textContent = Math.round(counter.value); },
        }, 0.25)
        .from(text, { autoAlpha: 0, y: 20, duration: 0.8, ease: "power2.out", stagger: 0.12 }, 0.35);
      ScrollTrigger.create({
        trigger: card,
        start: "top bottom",
        onEnter: () => {
          const now = gsap.ticker.time;
          const wait = Math.max(0, nextStart - now);
          nextStart = now + wait + 0.2;
          gsap.delayedCall(wait, () => tl.play());
        },
      });
    });
  }

  // What Affects Rate and Core Values: cards rise one after another; inside
  // each, the title and description slide up and the icon pops.
  function buildCardReveal(gridSel, prefix, gap) {
    const grid = document.querySelector(gridSel);
    if (!grid) return;
    const cards = [...grid.querySelectorAll(`.${prefix}`)];
    const tl = gsap.timeline({ scrollTrigger: scrollTriggerFor(grid) });

    cards.forEach((card, i) => {
      const at = 0.25 + i * gap; // gap = delay between cards
      const icon = card.querySelector(`.${prefix}__icon`);
      const text = card.querySelectorAll(`.${prefix}__title, .${prefix}__name, .${prefix}__desc`);
      tl.from(card, { autoAlpha: 0, y: 60, duration: T.stagger.duration, ease: T.stagger.ease }, at);
      tl.from(text, { autoAlpha: 0, y: 24, duration: 0.7, ease: "power2.out", stagger: 0.1 }, at + 0.3);
      tl.from(icon, { autoAlpha: 0, scale: 0.6, duration: 0.8, ease: "back.out(1.4)" }, at + 0.45);
    });
  }

  // Wait for Gilroy so letters are split at their final widths
  document.fonts.ready.then(() => {
    buildGroups();
    buildStaggers();
    buildStatCards();
    buildCardReveal(".rate__grid", "rate-card", 0.15);
    buildCardReveal(".values__track", "value-card", 0.12);
    startMarquee();
    window.__animReady = true;
    root.classList.remove("anim");
  });

  // Images can shift layout once loaded; recalculate trigger positions
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
