// The one build: src/index.template.html + three fixed modules -> dist/index.html (a single offline file).
// Run: node scripts/build.mjs
//
// Build format "nightshift-game-build/1". It only joins text; it never runs the game's code. The same function, character for
// character in behaviour, is api/src/game-release.js in Night Shift, which rebuilds each reviewed commit from these files
// to deliver the playable page. If you change this format, that side must change with it, so do not: edit the files below.
//
//   src/index.template.html   carries <meta name="nightshift-game-build" content="nightshift-game-build/1"> and exactly one
//                             /*__MODULES__*/ marker inside its inline script
//   src/core.mjs, src/lights-out.mjs, src/ui.mjs   joined at the marker in that order
//
// Modules share one scope. The only import allowed is  import { names } from "./core.mjs";  (or lights-out / ui) on one
// line: it is dropped, because the earlier module is already in scope. Only `export function|const|let|class` is allowed;
// the word `export` is dropped. Anything else is refused rather than guessed at.
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const GAME_BUILD_FORMAT = "nightshift-game-build/1";
export const GAME_TEMPLATE_PATH = "src/index.template.html";
export const GAME_MODULE_PATHS = ["src/core.mjs", "src/lights-out.mjs", "src/ui.mjs"];
export const GAME_SOURCE_PATHS = [GAME_TEMPLATE_PATH, ...GAME_MODULE_PATHS];
export const GAME_MAX_SOURCE_BYTES = 150000;
export const GAME_MAX_HTML_BYTES = 400000;
const MODULES_MARKER = "/*__MODULES__*/";
const FORMAT_META = '<meta name="nightshift-game-build" content="' + GAME_BUILD_FORMAT + '">';
const IMPORT_LINE = /^import \{[^}\n]*\} from "\.\/(?:core|lights-out|ui)\.mjs";[ \t]*$/gm;
const OFFLINE_RULES = [
  [/https?:\/\//i, "an http(s) address"],
  [/(?:src|href|action|poster|srcset|data)\s*=\s*["']?\s*\/\//i, "a protocol-relative address"],
  [/@import|url\(\s*["']?\s*(?:https?:|\/\/)/i, "a CSS import or external url()"],
  [/<(?:iframe|frame|frameset|object|embed|applet|form|link|base)\b/i, "a frame, plugin, form, link or base element"],
  [/<script\b[^>]{0,400}\bsrc\s*=/i, "an external script"],
  [/http-equiv\s*=\s*["']?\s*refresh/i, "a meta refresh"],
  [/\b(?:fetch|importScripts|eval)\s*\(|\bnew\s+(?:Function|Worker|SharedWorker)\b|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|\bsendBeacon\b|\bserviceWorker\b|\bimport\s*\(/, "a network, worker or dynamic-code API"],
  [/\b(?:localStorage|sessionStorage|indexedDB)\b|document\s*\.\s*cookie/, "browser storage"],
];

// files: { [path]: text } holding exactly GAME_SOURCE_PATHS. Returns { ok: true, html } or { ok: false, error }.
export function buildGameSource(files) {
  const refuse = error => ({ ok: false, error });
  if (!files || typeof files !== "object" || Array.isArray(files)) return refuse("files must be an object of path to text");
  for (const k of Object.keys(files)) if (!GAME_SOURCE_PATHS.includes(k)) return refuse("unexpected source file " + k + "; the build takes only " + GAME_SOURCE_PATHS.join(", "));
  const enc = new TextEncoder();
  let total = 0;
  for (const p of GAME_SOURCE_PATHS) {
    if (!Object.hasOwn(files, p) || typeof files[p] !== "string") return refuse(p + " is missing");
    total += enc.encode(files[p]).length;
  }
  if (total > GAME_MAX_SOURCE_BYTES) return refuse("the sources are " + total + " bytes; the limit is " + GAME_MAX_SOURCE_BYTES);
  const page = files[GAME_TEMPLATE_PATH];
  if (!page.includes(FORMAT_META)) return refuse(GAME_TEMPLATE_PATH + " does not declare build format " + GAME_BUILD_FORMAT);
  if (page.split(MODULES_MARKER).length !== 2) return refuse(GAME_TEMPLATE_PATH + " must contain exactly one " + MODULES_MARKER + " marker");
  const parts = [];
  for (const p of GAME_MODULE_PATHS) {
    let src = files[p];
    if (/\bimport\s*[(.]/.test(src)) return refuse(p + ": dynamic import and import.meta are not supported");
    src = src.replace(IMPORT_LINE, "");
    if (/^\s*import\b/m.test(src)) return refuse(p + ': the only supported import is one line like  import { name } from "./core.mjs";  for the three game modules');
    src = src.replace(/^export (?=(?:async function|function|const|let|class)\b)/gm, "");
    if (/^\s*export\b/m.test(src)) return refuse(p + ": only export function, const, let or class declarations at the start of a line are supported");
    src = src.replace(/<\/(script)/gi, "<\\/$1").replace(/<!--/g, "<\\!--");
    parts.push("/* " + p + " */\n" + src.replace(/\s+$/, "") + "\n");
  }
  const html = page.replace(MODULES_MARKER, () => parts.join("\n"));
  const bytes = enc.encode(html).length;
  if (bytes > GAME_MAX_HTML_BYTES) return refuse("the built page is " + bytes + " bytes; the limit is " + GAME_MAX_HTML_BYTES);
  for (const [re, label] of OFFLINE_RULES) if (re.test(html)) return refuse("the built page is not self-contained: it contains " + label);
  return { ok: true, html };
}

const here = dirname(fileURLToPath(import.meta.url));

export function build(root = resolve(here, "..")) {
  const files = {};
  for (const p of GAME_SOURCE_PATHS) files[p] = readFileSync(join(root, p), "utf8");
  const out = buildGameSource(files);
  if (!out.ok) throw new Error(out.error);
  return out.html;
}

// True only when this file is the script node was started with. Both sides go through realpath: argv[1] is the path as typed
// (for example /var/... on macOS) while import.meta.url is already the resolved one (/private/var/...), so comparing them as
// plain strings never matched under a symlinked folder and the build silently wrote nothing.
function isMain() {
  if (!process.argv[1]) return false;
  try { return realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (isMain()) {
  const root = resolve(here, "..");
  const html = build(root);
  mkdirSync(join(root, "dist"), { recursive: true });
  writeFileSync(join(root, "dist", "index.html"), html);
  console.log("built dist/index.html (" + new TextEncoder().encode(html).length + " bytes)");
}
