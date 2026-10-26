import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { build, buildGameSource, GAME_SOURCE_PATHS, GAME_MODULE_PATHS, GAME_MAX_SOURCE_BYTES, GAME_MAX_HTML_BYTES } from "../scripts/build.mjs";

const sources = () => Object.fromEntries(GAME_SOURCE_PATHS.map(p => [p, readFileSync(new URL("../" + p, import.meta.url), "utf8")]));
const refused = (files, re) => { const r = buildGameSource(files); return r.ok === false && re.test(r.error); };

test("the build joins the template and the three modules in order, with no imports or exports left", () => {
  const html = build();
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.ok(!html.includes("/*__MODULES__*/"));
  const at = GAME_MODULE_PATHS.map(p => html.indexOf("/* " + p + " */"));
  assert.ok(at.every(i => i > 0) && [...at].sort((a, b) => a - b).join() === at.join(), "modules appear in the fixed order");
  assert.doesNotMatch(html, /^\s*(import|export)\b/m);
  assert.ok(html.includes("function createRng") && html.includes("function press") && html.includes("function startGame"));
  assert.equal(build(), html);
});

test("the built page is one offline file within the size budget", () => {
  const html = build();
  assert.ok(new TextEncoder().encode(html).length <= GAME_MAX_HTML_BYTES);
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.doesNotMatch(html, /<(link|iframe|object|embed|form|base)\b|<script[^>]*\bsrc\s*=/i);
  assert.match(html, /default-src 'none'/);
});

test("the built script compiles and keeps the page's script and comment markers balanced", () => {
  const html = build();
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.equal((html.match(/<script\b/gi) || []).length, 1);
  assert.doesNotThrow(() => new vm.Script(scripts[0][1], { filename: "dist/index.html" }));
});

test("script and comment markers inside a module are escaped so they cannot end or reopen the page script", () => {
  const files = sources();
  files["src/ui.mjs"] += '\nconst notes = "</script><!--";\n';
  const r = buildGameSource(files);
  assert.equal(r.ok, true);
  assert.equal((r.html.match(/<script\b/gi) || []).length, 1);
  assert.equal((r.html.match(/<\/script>/gi) || []).length, 1);
  assert.ok(r.html.includes('"<\\/script><\\!--"'));
});

test("anything outside the fixed format is refused, not guessed at", () => {
  const ok = sources();
  assert.ok(refused({ ...ok, "src/extra.mjs": "x" }, /unexpected source file/));
  const gone = { ...ok }; delete gone["src/ui.mjs"];
  assert.ok(refused(gone, /src\/ui\.mjs is missing/));
  assert.ok(refused({ ...ok, "src/index.template.html": ok["src/index.template.html"].replace("/*__MODULES__*/", "") }, /exactly one/));
  assert.ok(refused({ ...ok, "src/index.template.html": ok["src/index.template.html"].replace("nightshift-game-build/1", "nightshift-game-build/2") }, /build format/));
  assert.ok(refused({ ...ok, "src/ui.mjs": ok["src/ui.mjs"] + "\nexport default startGame;\n" }, /only export/));
  assert.ok(refused({ ...ok, "src/ui.mjs": 'import x from "./other.mjs";\n' + ok["src/ui.mjs"] }, /only supported import/));
  assert.ok(refused({ ...ok, "src/ui.mjs": ok["src/ui.mjs"] + '\nconst late = import("./x.mjs");\n' }, /dynamic import/));
});

test("oversized sources and pages that reach for the network or storage are refused", () => {
  const ok = sources();
  assert.ok(refused({ ...ok, "src/ui.mjs": ok["src/ui.mjs"] + "\n// " + "x".repeat(GAME_MAX_SOURCE_BYTES) + "\n" }, /limit is 150000/));
  assert.ok(refused({ ...ok, "src/ui.mjs": ok["src/ui.mjs"] + '\nconst u = "https://example.com/a";\n' }, /http\(s\) address/));
  assert.ok(refused({ ...ok, "src/ui.mjs": ok["src/ui.mjs"] + "\nfetch(u);\n" }, /network/));
  assert.ok(refused({ ...ok, "src/ui.mjs": ok["src/ui.mjs"] + "\nlocalStorage.x = 1;\n" }, /storage/));
  assert.ok(refused({ ...ok, "src/index.template.html": ok["src/index.template.html"].replace("</head>", '<link rel="stylesheet" href="a.css"></head>') }, /link/));
});
