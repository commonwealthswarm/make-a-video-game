import test from "node:test";
import assert from "node:assert/strict";
import { createRng, hashState, replay } from "../src/core.mjs";

// SYNTHETIC counter used only to test the harness; it is not the game.
const counter = { init: () => ({ n: 0 }), step: (s, input, rng) => ({ n: s.n + (input === "up" ? 1 : 0) + Math.floor(rng() * 2) }) };

test("the same seed gives the same random sequence", () => {
  const a = createRng(7), b = createRng(7);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test("different seeds give different sequences", () => {
  assert.notEqual(createRng(1)(), createRng(2)());
});

test("replay is deterministic and sensitive to inputs", () => {
  const inputs = ["up", "up", "none", "up"];
  assert.equal(replay(counter, 5, inputs).hash, replay(counter, 5, inputs).hash);
  assert.notEqual(replay(counter, 5, inputs).hash, replay(counter, 5, ["up", "up", "up", "up"]).hash);
});

test("replay and hashing refuse bad input", () => {
  assert.throws(() => replay(counter, 1, "up"), TypeError);
  assert.throws(() => replay({}, 1, []), TypeError);
  assert.equal(hashState({ b: 1, a: 2 }), hashState({ a: 2, b: 1 }));
});
