import test from "node:test";
import assert from "node:assert/strict";
import { startGame } from "../src/ui.mjs";
import { generate } from "../src/lights-out.mjs";

// A small stand-in for the page: just enough of the document for src/ui.mjs. It is a test double, not a browser.
function fakePage() {
  const make = () => {
    const e = { children: [], listeners: {}, attrs: {}, classes: new Set(), dataset: {}, style: {}, textContent: "", tabIndex: 0, className: "", type: "", focused: 0 };
    e.appendChild = c => { e.children.push(c); return c; };
    e.addEventListener = (type, fn) => { (e.listeners[type] ||= []).push(fn); };
    e.setAttribute = (k, v) => { e.attrs[k] = String(v); };
    e.classList = { toggle: (c, on) => { if (on) e.classes.add(c); else e.classes.delete(c); } };
    e.focus = () => { e.focused++; page.active = e; };
    e.closest = sel => (sel === "button.cell" && e.className === "cell" ? e : null);
    return e;
  };
  const byId = Object.fromEntries(["grid", "status", "moves", "puzzle", "restart", "next"].map(id => [id, make()]));
  const page = { active: null, getElementById: id => byId[id], createElement: () => make(), byId };
  page.fire = (el, type, event = {}) => { for (const fn of el.listeners[type] || []) fn({ target: el, preventDefault() { event.prevented = true; }, ...event }); return event; };
  page.click = cell => page.fire(page.byId.grid, "click", { target: cell });
  return page;
}

test("the grid has one labelled button per cell and shows the opening puzzle", () => {
  const page = fakePage();
  const game = startGame(page);
  const cells = page.byId.grid.children;
  assert.equal(cells.length, 25);
  assert.equal(cells.filter(c => c.classes.has("on")).length, game.state.board.filter(Boolean).length);
  assert.match(cells[0].attrs["aria-label"], /^Row 1, column 1, light (on|off)$/);
  assert.equal(page.byId.puzzle.textContent, "Puzzle 1");
  assert.equal(page.byId.moves.textContent, "Moves: 0");
  assert.match(page.byId.grid.attrs["aria-label"], /5 by 5/);
});

test("playing the recorded solution through clicks wins, reports it, and a won grid ignores further clicks until restart", () => {
  const page = fakePage();
  const game = startGame(page);
  const cells = page.byId.grid.children;
  const solution = generate(1, 5).solution;
  for (const i of solution) page.click(cells[i]);
  assert.equal(game.state.solved, true);
  assert.match(page.byId.status.textContent, new RegExp("^Solved in " + solution.length + " moves"));
  assert.ok(page.byId.grid.classes.has("won"));
  assert.ok(cells.every(c => c.attrs["aria-pressed"] === "false"));
  page.click(cells[0]);
  assert.equal(game.state.moves, solution.length);
  page.fire(page.byId.restart, "click");
  assert.equal(game.state.solved, false);
  assert.equal(game.state.moves, 0);
  assert.equal(page.byId.moves.textContent, "Moves: 0");
  assert.ok(!page.byId.grid.classes.has("won"));
});

test("keyboard and buttons: arrows move focus without pressing, next starts the following puzzle", () => {
  const page = fakePage();
  const game = startGame(page);
  const cells = page.byId.grid.children;
  const ev = page.fire(page.byId.grid, "keydown", { target: cells[0], key: "ArrowRight" });
  assert.equal(ev.prevented, true);
  assert.equal(page.active, cells[1]);
  assert.equal(cells[1].tabIndex, 0);
  assert.equal(cells[0].tabIndex, -1);
  assert.equal(game.state.moves, 0);
  const other = page.fire(page.byId.grid, "keydown", { target: cells[1], key: "a" });
  assert.equal(other.prevented, undefined);
  page.fire(page.byId.next, "click");
  assert.equal(game.seed, 2);
  assert.equal(page.byId.puzzle.textContent, "Puzzle 2");
  assert.deepEqual(game.state.board, generate(2, 5).board);
});
