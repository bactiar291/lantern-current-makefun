# Lantern Current

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/bactiar291/lantern-current-makefun/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/bactiar291/lantern-current-makefun/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An original river rescue game for [best-game-01](https://make.fun/bounty/best-game-01). Pilot a paper-and-copper skiff, collect nine stranded lantern keepers across three designed charts, and bring them to the lighthouse before each storm arrives.

## Play locally

Serve `game/` with any static HTTP server, for example `python3 -m http.server 8080 --directory game`, then open localhost:8080. No build, dependencies, remote fonts, images, analytics, or runtime network access. All art is drawn by the game; sounds are synthesized after a gesture.

- WASD / arrows: steer. Currents push the boat; two passengers reduce speed and steering response.
- Hold Space: anchor and board nearby keepers, deliver at HOME, or repair/refill at shelters. Docking takes a short uninterrupted hold.
- Shift: spend copper oil for a speed boost.
- P: pause/resume. Losing focus pauses automatically.
- M: mute. Buttons support mouse and native Enter/Space activation. Tab selects controls; starting or resuming focuses the map for gameplay. Menu actions receive focus when a chart ends or play pauses.

Reefs and islands damage the hull, with a recovery interval. There are two seats; keepers must be delivered before the next pickup when full. Each delivery scores 100 per keeper. Clearing a chart adds twice the remaining whole seconds and 25 per hull point. Oil and hull reset between charts. All three charts complete the voyage; storm expiry or hull failure ends it. Restart is immediate.

## Source and verification

`game/simulation.js` owns deterministic rules and a capped 60 Hz clock; `stages.js` contains the three authored charts; `render.js` draws the ink chart; `audio.js` synthesizes feedback; `app.js` owns input, menus and accessibility. The read-only `window.lanternState()` returns a detached snapshot for diagnostics; there are no in-game state setters or cheat controls. Reduced motion follows the operating system; DPR is capped at two.

Run `node --test tests/simulation.test.js` with Node 22. Boundary regressions cover storm expiry and fatal home-dock contact taking precedence over same-tick delivery or repair. Browser checks are in `tests/browser.py` and use Python Playwright plus `/snap/bin/chromium`. They operate real keyboard and mouse controls through a complete three-chart voyage, check native button activation and record detached diagnostic snapshots.

    python3 tests/browser.py --artifacts-dir /tmp/lantern-current-browser
    python3 tests/browser.py --artifacts-dir /tmp/lantern-current-verification --no-capture

Capture runs save four original, unedited JPEGs under the artifact directory with identical pre/post simulation snapshots. They do not overwrite repository screenshots. The no-capture mode runs the same behavioral checks without writing images; its JSON report goes only to the selected artifact directory. Copy fresh captures into `screenshots/` only after the full capture run succeeds.

The native grader runs `node /bot/main.ts` with Node 22.18+ and no environment override; the default destination is `/output`. For local packaging, always override it with an owned temporary directory:

    MAKEFUN_OUTPUT_DIR=/tmp/lantern-current-output node main.ts

The entrypoint copies static files and screenshots, then builds the dossier with the kit's unchanged `vendor/makefun-game.ts`. Packaging is deterministic. The README badges are web links for the repository only; the game itself does not load them.

MIT licensed. Publication and competition submission are separate from this source tree.

---

<sub>Entered on [make.fun](https://make.fun/?ref=298dam6q&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
