/* ---------------------------------------------------------------
   Local WebP converter (dev tool, not part of the site).
   No dependencies: Node serves a page; the browser's canvas encodes WebP.

   1. Start (from the repo root):   node _partials/tools/webp-server.js
      (If port 5180 is already in use, another agent started it: just use it.)
   2. Open in the preview browser:
        http://127.0.0.1:5180/?src=<ABSOLUTE path of PNG/JPG>&out=<repo-relative .webp path>&w=<max width>&q=<0-1>
      Several images at once: repeat src/out (and optionally w) in order, e.g.
        ?src=C:/tmp/a.png&out=assets/images/about-us/hero.webp&w=1110&src=C:/tmp/b.png&out=assets/images/about-us/team.webp
      w (optional) = maximum output width in px (keeps aspect ratio, never upscales).
      q (optional) = quality, default 0.82.
   3. The page lists each saved file with its size (also in document.title: "done N/N").
   Output paths must stay inside the repo; existing files are overwritten.
   --------------------------------------------------------------- */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const PORT = 5180;
const TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

const PAGE = `<!doctype html><meta charset="utf-8"><title>converting…</title>
<body style="font:14px/1.5 system-ui;padding:16px"><h1 style="font-size:18px">WebP converter</h1><ol id="log"></ol>
<script>
(async () => {
  const p = new URLSearchParams(location.search);
  const srcs = p.getAll("src"), outs = p.getAll("out"), ws = p.getAll("w");
  const q = parseFloat(p.get("q")) || 0.82;
  const log = (t) => { const li = document.createElement("li"); li.textContent = t; document.getElementById("log").appendChild(li); };
  let ok = 0;
  for (let i = 0; i < srcs.length; i++) {
    try {
      const img = new Image();
      img.src = "/file?path=" + encodeURIComponent(srcs[i]);
      await img.decode();
      const maxW = parseFloat(ws[i] || ws[0]) || img.naturalWidth;
      const scale = Math.min(1, maxW / img.naturalWidth);
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, "image/webp", q));
      const res = await fetch("/save?out=" + encodeURIComponent(outs[i]), { method: "POST", body: blob });
      if (!res.ok) throw new Error(await res.text());
      log("OK  " + outs[i] + "  " + c.width + "x" + c.height + "  " + Math.round(blob.size / 1024) + " KB");
      ok++;
    } catch (e) { log("FAIL " + srcs[i] + " → " + outs[i] + ": " + e.message); }
  }
  document.title = "done " + ok + "/" + srcs.length;
})();
</script>`;

http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname === "/") { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(PAGE); }
  if (url.pathname === "/file") {
    const fp = path.resolve(url.searchParams.get("path") || "");
    const type = TYPES[path.extname(fp).toLowerCase()];
    if (!type) { res.writeHead(400); return res.end("unsupported type"); }
    return fs.readFile(fp, (e, d) => {
      if (e) { res.writeHead(404); return res.end("not found"); }
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" }); res.end(d);
    });
  }
  if (url.pathname === "/save" && req.method === "POST") {
    const out = path.resolve(ROOT, url.searchParams.get("out") || "");
    if (!out.startsWith(ROOT + path.sep) || path.extname(out) !== ".webp") { res.writeHead(400); return res.end("out must be a .webp path inside the repo"); }
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, Buffer.concat(chunks));
      res.writeHead(200); res.end("saved");
    });
    return;
  }
  res.writeHead(404); res.end();
}).listen(PORT, "127.0.0.1", () => console.log("WebP converter on http://127.0.0.1:" + PORT));
