/* ---------------------------------------------------------------
   Article pages (Blog & News detail) — load after /script.js and legal.js.
   Share buttons: links with data-share="linkedin|x|facebook" get this page's
   URL; buttons with data-share-copy copy it to the clipboard and show
   "Link copied" (the HTML hrefs are the no-JS fallback).
   --------------------------------------------------------------- */
(function () {
  const url = location.origin + location.pathname;
  const enc = encodeURIComponent(url);
  const title = encodeURIComponent((document.querySelector("h1") || document).textContent.trim());
  const shareUrls = {
    linkedin: "https://www.linkedin.com/sharing/share-offsite/?url=" + enc,
    x: "https://twitter.com/intent/tweet?url=" + enc + "&text=" + title,
    facebook: "https://www.facebook.com/sharer/sharer.php?u=" + enc,
  };
  document.querySelectorAll("a[data-share]").forEach((a) => {
    if (shareUrls[a.dataset.share]) a.href = shareUrls[a.dataset.share];
  });

  const status = document.querySelector("[data-share-status]");
  // Copy inside the click (works without clipboard permission); Clipboard API as the fallback
  const copy = (text) => {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(field);
    field.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    field.remove();
    if (ok) return Promise.resolve();
    return navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject();
  };

  document.querySelectorAll("[data-share-copy]").forEach((btn) => {
    let timer;
    const show = (label) => {
      btn.setAttribute("data-copied-label", label);
      btn.classList.add("is-copied");
      if (status) status.textContent = label;
      clearTimeout(timer);
      timer = setTimeout(() => {
        btn.classList.remove("is-copied");
        if (status) status.textContent = "";
      }, 2000);
    };
    btn.addEventListener("click", () => {
      copy(url).then(() => show("Link copied"), () => show("Couldn’t copy the link"));
    });
  });
})();
