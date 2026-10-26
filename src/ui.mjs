// The interface: a keyboard and touch grid for the rules in lights-out.mjs. It reaches the page only through the
// document it is given, so the tests drive it with a small stand-in. No network, no storage, no timers; everything shown
// is set with textContent.
import { start, play, restart, move } from "./lights-out.mjs";

export function startGame(doc, size = 5, firstSeed = 1) {
  let seed = firstSeed, state = start(seed, size);
  const grid = doc.getElementById("grid"), status = doc.getElementById("status"), moves = doc.getElementById("moves"), puzzle = doc.getElementById("puzzle");
  const cells = [];

  grid.setAttribute("aria-label", "Lights Out grid, " + size + " by " + size + ". Use the arrow keys to move and Enter or Space to press.");
  grid.style.gridTemplateColumns = "repeat(" + size + ", 1fr)";
  for (let i = 0; i < size * size; i++) {
    const b = doc.createElement("button");
    b.type = "button";
    b.className = "cell";
    b.dataset.i = String(i);
    b.tabIndex = i === 0 ? 0 : -1;
    grid.appendChild(b);
    cells.push(b);
  }

  function draw() {
    for (let i = 0; i < cells.length; i++) {
      const on = state.board[i] === 1;
      cells[i].setAttribute("aria-pressed", String(on));
      cells[i].setAttribute("aria-label", "Row " + (Math.floor(i / size) + 1) + ", column " + (i % size + 1) + ", light " + (on ? "on" : "off"));
      cells[i].classList.toggle("on", on);
    }
    puzzle.textContent = "Puzzle " + seed;
    moves.textContent = "Moves: " + state.moves;
    status.textContent = state.solved
      ? "Solved in " + state.moves + " moves. The puzzle was made with a " + state.best + "-press solution. Restart to replay it, or start the next puzzle."
      : "Turn every light off. Pressing a square flips it and the squares directly above, below, left and right of it.";
    grid.classList.toggle("won", state.solved);
  }

  function focusCell(i) {
    for (let k = 0; k < cells.length; k++) cells[k].tabIndex = k === i ? 0 : -1;
    cells[i].focus();
  }

  grid.addEventListener("click", e => {
    const t = e.target.closest("button.cell");
    if (!t) return;
    state = play(state, Number(t.dataset.i));
    draw();
    focusCell(Number(t.dataset.i));
  });
  grid.addEventListener("keydown", e => {
    const t = e.target.closest("button.cell");
    if (!t || e.key.indexOf("Arrow") !== 0) return;
    e.preventDefault();
    focusCell(move(size, Number(t.dataset.i), e.key));
  });
  doc.getElementById("restart").addEventListener("click", () => { state = restart(state); draw(); focusCell(0); });
  doc.getElementById("next").addEventListener("click", () => { seed += 1; state = start(seed, size); draw(); focusCell(0); });

  draw();
  return { get state() { return state; }, get seed() { return seed; } };
}
