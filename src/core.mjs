// Shared, dependency-free building blocks for the one game build: a seeded random generator and a deterministic replay
// runner. A game plugs in as { init(rng), step(state, input, rng) } where step is pure apart from drawing from rng.
// This file is inlined into dist/index.html by scripts/build.mjs (the "export " prefixes are removed there).

export function createRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stable(value) {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + stable(value[k])).join(",") + "}";
  return JSON.stringify(value === undefined ? null : value);
}

export function hashState(state) {
  const text = stable(state);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

export function replay(game, seed, inputs) {
  if (!game || typeof game.init !== "function" || typeof game.step !== "function") throw new TypeError("game needs init and step");
  if (!Array.isArray(inputs)) throw new TypeError("inputs must be an array");
  const rng = createRng(seed);
  let state = game.init(rng);
  for (const input of inputs) state = game.step(state, input, rng);
  return { state, hash: hashState(state) };
}
