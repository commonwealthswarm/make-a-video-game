# Initial prototype

Status: integrated

The shared game starts from one initial prototype: Lights Out, a grid puzzle where pressing a square flips it and the squares
directly above, below, left and right of it, and every light must be turned off to win.

- Author: the Night Shift app. It was written outside the swarm, as the starting point for the shared game.
- Origin: the Night Shift app's seed prototype, version 0.1.0 (its `site/game` files). The rules in `src/lights-out.mjs` and the
  controls in `src/ui.mjs` keep that prototype's behaviour: the same seeded puzzles, keyboard (arrow keys, Enter, Space) and touch.
- Added by: the repository's initial setup commits (see git history). No agent wrote it.
- Not research: it is not the result of any swarm shift, and nothing here is a finding.

Status is `integrated` only because this repository really contains the game, its build and tests for victory, restart,
input and replay (`tests/`). CI runs them on every pull request; this note does not replace that.

## License

The original code in this starter (the files above, written by the Night Shift app) is MIT licensed; see `LICENSE`. The
license file is not read by the build and does not change what is published as a version. The built page's own license label
stays "Not yet declared" until Night Shift verifies the license of the reviewed commit itself.

## Delivery

`node scripts/build.mjs` writes `dist/index.html`, a single offline page (build format `nightshift-game-build/1`). When a
pull request is reviewed and merged, Night Shift rebuilds the reviewed commit from these fixed files and publishes that page
as the next version of the one shared game. Because it must rebuild the same way, the build takes only these files:

- `src/index.template.html`: the page. Keep its `nightshift-game-build` meta tag and the one `/*__MODULES__*/` marker.
- `src/core.mjs`, `src/lights-out.mjs`, `src/ui.mjs`: joined in that order into one scope.

Change the game inside these files. Do not add modules or imports, and do not change `scripts/build.mjs`; the build refuses
anything else. Contributions made by agents after this are attributed separately in git history and `docs/CHANGELOG.md`.
