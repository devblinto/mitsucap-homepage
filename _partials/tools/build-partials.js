/* ---------------------------------------------------------------
   Shared-partial build (dev tool, not part of the site).
   Stamps the single source of a shared component into every page so
   pages stay plain static HTML (no JS needed to show them).

     node _partials/tools/build-partials.js           update every page
     node _partials/tools/build-partials.js --check   exit 1 if a page is out of date

   Partials: _partials/<name>.html (its leading <!-- … --> doc comment is dropped).
   In a page the copy sits between
     <!-- @include footer --> … <!-- /@include footer -->
   A page that still has a hand-copied <footer class="footer"> gets the markers added.
   The link to the page itself is marked aria-current="page".
   --------------------------------------------------------------- */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const PARTIALS = ["footer"];
const CHECK = process.argv.includes("--check");

const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", ".claude", ".netlify", "node_modules"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === "index.html") pages.push(p);
  }
})(ROOT);
// Netlify serves /404.html for any missing URL
if (fs.existsSync(path.join(ROOT, "404.html"))) pages.push(path.join(ROOT, "404.html"));

const source = {};
for (const name of PARTIALS) {
  const raw = fs.readFileSync(path.join(ROOT, "_partials", name + ".html"), "utf8").replace(/\r\n/g, "\n");
  source[name] = raw.replace(/^\s*<!--[\s\S]*?-->\s*/, "").trimEnd();
}

const indent = (text, pad) => text.split("\n").map((l) => (l ? pad + l : l)).join("\n");
const urlOf = (file) => {
  if (path.basename(file) !== "index.html") return "/" + path.relative(ROOT, file).split(path.sep).join("/");
  const rel = path.relative(ROOT, path.dirname(file)).split(path.sep).join("/");
  return rel ? `/${rel}/` : "/";
};

let changed = 0;
const stale = [];
for (const file of pages) {
  const before = fs.readFileSync(file, "utf8");
  const eol = before.includes("\r\n") ? "\r\n" : "\n";
  let html = before.replace(/\r\n/g, "\n");
  for (const name of PARTIALS) {
    const url = urlOf(file);
    let body = source[name].replace(`href="${url}">`, `href="${url}" aria-current="page">`);
    const marked = new RegExp(`([ \\t]*)<!-- @include ${name} -->[\\s\\S]*?<!-- /@include ${name} -->`);
    const legacy = new RegExp(`([ \\t]*)<footer class="footer"[\\s\\S]*?</footer>`);
    const re = marked.test(html) ? marked : name === "footer" && legacy.test(html) ? legacy : null;
    if (!re) continue;
    html = html.replace(re, (m, pad) => `${pad}<!-- @include ${name} -->\n${indent(body, pad)}\n${pad}<!-- /@include ${name} -->`);
  }
  html = html.replace(/\n/g, eol);
  if (html !== before) {
    if (CHECK) stale.push(path.relative(ROOT, file));
    else { fs.writeFileSync(file, html); changed++; }
  }
}

if (CHECK) {
  if (stale.length) { console.log("Out of date:\n  " + stale.join("\n  ")); process.exit(1); }
  console.log(`All ${pages.length} pages are up to date.`);
} else {
  console.log(`Updated ${changed} of ${pages.length} pages.`);
}
