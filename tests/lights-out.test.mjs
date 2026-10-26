import test from "node:test";
import assert from "node:assert/strict";
import { createRng, replay } from "../src/core.mjs";
import { MIN_SIZE, MAX_SIZE, blank, press, isSolved, generate, start, play, restart, move, lightsOutGame } from "../src/lights-out.mjs";

const lit = board => board.flatMap((v, i) => (v ? [i] : []));

test("pressing flips the cell and its orthogonal neighbours, clipped at the edges, without changing its input", () => {
  const empty = blank(5);
  assert.deepEqual(lit(press(empty, 5, 12)), [7, 11, 12, 13, 17]);
  assert.deepEqual(lit(press(empty, 5, 0)), [0, 1, 5]);
  assert.deepEqual(lit(press(empty, 5, 4)), [3, 4, 9]);
  assert.deepEqual(empty, new Array(25).fill(0));
  const p = generate(7, 5).board;
  for (let i = 0; i < 25; i++) assert.deepEqual(press(press(p, 5, i), 5, i), p);
});

test("every puzzle is deterministic for its seed, solvable by its recorded solution and never starts solved", () => {
  assert.deepEqual(generate(42, 5), generate(42, 5));
  assert.notDeepEqual(generate(42, 5).board, generate(43, 5).board);
  for (let size = MIN_SIZE; size <= MAX_SIZE; size++) for (let seed = 0; seed < 40; seed++) {
    const g = generate(seed, size);
    assert.equal(isSolved(g.board), false, "seed " + seed + " size " + size + " starts solved");
    assert.equal(isSolved(g.solution.reduce((b, i) => press(b, size, i), g.board)), true, "seed " + seed + " size " + size + " is not solved by its solution");
  }
});

test("victory: the game is won exactly when the last light goes off, moves are counted and a won game ignores presses", () => {
  let s = start(5, 5);
  assert.equal(s.solved, false);
  assert.equal(s.moves, 0);
  const solution = generate(5, 5).solution;
  solution.forEach((cell, k) => { s = play(s, cell); assert.equal(s.moves, k + 1); assert.equal(s.solved, k === solution.length - 1); });
  assert.equal(isSolved(s.board), true);
  assert.equal(play(s, 0), s);
});

test("reset: restart returns to the same starting puzzle with zero moves, also after a win", () => {
  const first = start(9, 5);
  const played = play(play(first, 3), 8);
  const back = restart(played);
  assert.deepEqual(back.board, first.board);
  assert.equal(back.moves, 0);
  assert.equal(back.seed, 9);
  let won = first;
  for (const cell of generate(9, 5).solution) won = play(won, cell);
  assert.equal(won.solved, true);
  const again = restart(won);
  assert.equal(again.solved, false);
  assert.deepEqual(again.board, first.board);
  assert.equal(play(again, generate(9, 5).solution[0]).moves, 1);
});

test("input: arrow keys move within the board, other keys stay put, and bad input is refused", () => {
  assert.equal(move(5, 0, "ArrowUp"), 0);
  assert.equal(move(5, 0, "ArrowLeft"), 0);
  assert.equal(move(5, 24, "ArrowDown"), 24);
  assert.equal(move(5, 24, "ArrowRight"), 24);
  assert.equal(move(5, 12, "ArrowUp"), 7);
  assert.equal(move(5, 12, "ArrowRight"), 13);
  assert.equal(move(5, 12, "x"), 12);
  assert.throws(() => blank(2), RangeError);
  assert.throws(() => blank(8), RangeError);
  assert.throws(() => press(blank(5), 5, 25), RangeError);
  assert.throws(() => press(blank(5), 5, -1), RangeError);
  assert.throws(() => press(blank(5), 5, 1.5), RangeError);
  assert.throws(() => generate(-1, 5), RangeError);
});

test("replay: a seed and ordered inputs reproduce the same final state, a solution wins, restart resets", () => {
  const seed = 12345;
  const opening = lightsOutGame.init(createRng(seed));
  const solution = generate(opening.seed, opening.size).solution;
  const won = replay(lightsOutGame, seed, solution);
  assert.equal(won.state.solved, true);
  assert.equal(won.state.moves, solution.length);
  assert.equal(replay(lightsOutGame, seed, solution).hash, won.hash);
  assert.notEqual(replay(lightsOutGame, seed, solution.slice(1)).hash, won.hash);
  assert.notEqual(replay(lightsOutGame, seed + 1, solution).hash, won.hash);
  const reset = replay(lightsOutGame, seed, [...solution, "restart"]);
  assert.equal(reset.state.solved, false);
  assert.equal(reset.state.moves, 0);
  assert.deepEqual(reset.state.board, opening.board);
  assert.equal(replay(lightsOutGame, seed, ["noise", null]).hash, replay(lightsOutGame, seed, []).hash);
});
