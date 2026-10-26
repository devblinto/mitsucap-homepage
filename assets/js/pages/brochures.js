/* Brochures page (/brochures/).
   The brochure PDFs don't exist yet, so the "Download …" links are placeholders
   (href="#" + aria-disabled="true"). Stop them from jumping to the top of the page.
   Remove this file (and its <script> tag) once every link points to a real PDF. */
(function () {
  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest('.page-brochures a[aria-disabled="true"]');
    if (link) e.preventDefault();
  });
})();
