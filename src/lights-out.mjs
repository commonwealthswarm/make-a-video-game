// Lights Out: the pure, deterministic rules of the initial game. No DOM, no clock, no Math.random: the same seed always
// gives the same puzzle. Nothing here touches the page, so the tests run it directly.
//
// Origin: ported unchanged in behaviour from the Night Shift app's seed prototype (version 0.1.0). It is the starting point
// for the shared game, not the result of any agent shift or research. See docs/PROTOTYPE.md.
import { createRng } from "./core.mjs";

export const MIN_SIZE = 3;
export const MAX_SIZE = 7;
export const DEFAULT_SIZE = 5;

function checkSize(size) {
  if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) throw new RangeError("size must be a whole number from " + MIN_SIZE + " to " + MAX_SIZE);
}

// Cells are numbered row by row. A board is an array of size*size values, 1 = light on, 0 = off.
export function blank(size) { checkSize(size); return new Array(size * size).fill(0); }

// Pressing a cell flips it and its orthogonal neighbours. Returns a new board; the input is never changed.
export function press(board, size, index) {
  checkSize(size);
  if (!Number.isInteger(index) || index < 0 || index >= size * size) throw new RangeError("cell index out of range");
  const next = board.slice(), r = Math.floor(index / size), c = index % size;
  for (const [y, x] of [[r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
    if (y >= 0 && y < size && x >= 0 && x < size) next[y * size + x] ^= 1;
  }
  return next;
}

export function isSolved(board) {
  for (let i = 0; i < board.length; i++) if (board[i]) return false;
  return true;
}

// A puzzle is made by pressing random cells on a solved board, so it is always solvable: pressing the same cells again
// (in any order) returns it to all off. `solution` is that set of cells, with cells pressed twice removed (they cancel).
export function generate(seed, size = DEFAULT_SIZE) {
  checkSize(size);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xFFFFFFFF) throw new RangeError("seed must be a whole number from 0 to 4294967295");
  const next = createRng(seed);
  let board, solution;
  do {
    board = blank(size);
    const parity = new Array(size * size).fill(0), count = size + Math.floor(next() * size);
    for (let i = 0; i < count; i++) {
      const cell = Math.floor(next() * size * size);
      parity[cell] ^= 1;
      board = press(board, size, cell);
    }
    solution = [];
    for (let j = 0; j < parity.length; j++) if (parity[j]) solution.push(j);
  } while (isSolved(board)); // never hand out a puzzle that is already won
  return { seed, size, board, solution };
}

// The state a game keeps: the starting board (for restart), the current board and the number of moves.
export function start(seed, size = DEFAULT_SIZE) {
  const p = generate(seed, size);
  return { seed: p.seed, size: p.size, initial: p.board, board: p.board.slice(), moves: 0, solved: false, best: p.solution.length };
}

export function play(state, index) {
  if (state.solved) return state; // a finished game ignores further presses until restarted
  const board = press(state.board, state.size, index);
  return { ...state, board, moves: state.moves + 1, solved: isSolved(board) };
}

export function restart(state) { return { ...state, board: state.initial.slice(), moves: 0, solved: false }; }

// Arrow-key movement on the grid; stays on the board at the edges.
export function move(size, index, key) {
  let r = Math.floor(index / size), c = index % size;
  if (key === "ArrowUp") r = Math.max(0, r - 1);
  else if (key === "ArrowDown") r = Math.min(size - 1, r + 1);
  else if (key === "ArrowLeft") c = Math.max(0, c - 1);
  else if (key === "ArrowRight") c = Math.min(size - 1, c + 1);
  return r * size + c;
}

// The game as the replay runner in core.mjs expects it: the puzzle seed is drawn from the run's seeded generator, a whole
// number is a press on that cell, "restart" restarts, and anything else is ignored.
export const lightsOutGame = {
  init(rng) { return start(Math.floor(rng() * 4294967296), DEFAULT_SIZE); },
  step(state, input) {
    if (input === "restart") return restart(state);
    if (Number.isInteger(input)) return play(state, input);
    return state;
  },
};
