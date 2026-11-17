# Lantern Current: Storm Atlas

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/bactiar291/lantern-current-makefun/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/bactiar291/lantern-current-makefun/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An original river rescue game for [best-game-01](https://make.fun/bounty/best-game-01). Pilot a paper-and-copper skiff through six authored charts in two voyages. Bring nine keepers home on the original Reedwater voyage to unlock Storm Atlas: three harder charts with twelve more keepers, moving driftwood and optional signal medals.

## Play locally

Serve `game/` with any static HTTP server, for example `python3 -m http.server 8080 --directory game`, then open localhost:8080. No build, dependencies, remote fonts, images, analytics, or runtime network access. All art is drawn by the game; music and sounds are synthesized after a gesture.

- WASD / arrows: steer. Currents push the boat; two passengers reduce speed and steering response.
- Hold Space: anchor and board keepers, deliver at HOME, repair/refill at shelters, or light a signal post.
- Shift: spend copper oil for a speed boost.
- P: pause/resume. Losing focus pauses automatically.
- M: mute. Buttons support mouse and native Enter/Space activation. Tab selects controls; starting or resuming focuses the map. Menu actions receive focus when a chart ends or play pauses.

Reefs, islands and moving timber damage the hull, with a recovery interval. There are two seats. Each delivery scores 100 per keeper. Clearing a chart adds twice the remaining whole seconds and 25 per hull point. Oil and hull reset between charts. Three charts complete each voyage; storm expiry or hull failure ends it. Restart is immediate and retains the selected expedition. Single-chart replay offers a fresh Reedwater voyage after completion.

## Storm Atlas

- Willow Weir: staggered diagonal and vertical timber lanes around a central weir. A northern signal and a far-bank signal reward a longer outward run.
- The Splitwater: a stone spine divides the map. The north gate carries driftwood; the southern gate leads past a refuge. Four keepers require multiple crossings.
- Eye of the Storm: five keepers around a sheltered central refuge, an exposed crown signal, three moving hazards and an 18-second tide cycle.

Dashed lanes show every timber route. A copper countdown warns for two seconds before each log enters; the crossing then has a fixed duration and a clear interval. Outer-bank routes remain available. All patterns use simulation time and freeze on pause. The original stages retain their learning ramp and layouts: steady tutorial current, then 24- and 30-second ebb/flow cycles.

Atlas charts each have two optional signal posts. Hold Space beside a post for 1.2 uninterrupted seconds and spend 20% oil to light it. Light both and finish every rescue to earn a Copper signal medal and 100 bonus points. Do it without a single hull strike for Gold and 200 points. Repairs do not erase strikes. Signals occupy no passenger seats; their detours and oil cost compete with boost fuel and storm time. Loss never awards a medal.

The original procedural soundtrack combines a pentatonic melody, sustained bass/harmony, water-like high notes and low pulses under full cargo or the approaching storm. Rescue, delivery, signal, repair, collision and result motifs are synthesized locally. Mute and pause stop and disconnect active voices and suspend the audio context; page exit closes it. Audio support is optional and failures leave the game playable.

## Tide Logbook

Title and result menus offer keyboard-accessible replay buttons for each unlocked chart. Completing a chart unlocks the next and records the best completed score and medal locally; partial rescues and losses never earn completion. Completing Reedwater unlocks the Storm Atlas expedition. Restart clears cargo, run scores, signals and strikes while retaining earned progress.

The logbook rejects malformed, incompatible, out-of-range and nonsequential records. Existing three-chart saves migrate without losing scores. Reset local logbook requires a second activation and clears scores, medals and unlocks. If storage is denied, progress remains available for the current page only. Local storage is local to the browser/origin, not a cloud account or tamper-proof record.

## Source and verification

`simulation.js` owns deterministic rules and a capped 60 Hz clock; `stages.js` contains six authored charts and two voyages; `hazards.js` computes driftwood positions and warnings; `render.js` draws the ink chart; `audio.js` synthesizes music and feedback; `app.js` owns input, menus and accessibility. The read-only `window.lanternState()` returns a detached snapshot; there are no in-game state setters or cheat controls. Reduced motion follows the operating system; DPR is capped at two.

Run `node --test tests/*.test.js` with Node 22. The original simulation and logbook tests remain intact. Atlas tests add complete steering journeys, geometry, moving hazard timing/collisions, signal costs, medals, save migration/reset and frame-rate independence. Audio tests check voice cleanup, mute, pause, natural endings and unavailable audio. Boundary regressions cover storm expiry and fatal home-dock contact taking precedence over same-tick delivery or repair.

Browser checks use Python Playwright and `/snap/bin/chromium`. `tests/browser.py` retains the original voyage/replay and keyboard checks. `tests/atlas-browser.py` extends that journey through all Atlas charts and signals, earned unlocks and medals, restart and reset. Both block external requests. The Atlas runner instruments real Web Audio resource cleanup without changing game state. Browser time is controlled by Playwright; steering and menu actions use real keyboard/mouse input. The runners acquire `/tmp/makefun/campaign-20261117/verification.lock` before browser work.

    /root/venv/bin/python3 tests/browser.py --artifacts-dir /tmp/makefun/campaign-20261117/best-game-01/artifacts/original-browser --no-capture
    /root/venv/bin/python3 tests/atlas-browser.py --artifacts-dir /tmp/makefun/campaign-20261117/best-game-01/artifacts/atlas-final

Atlas capture runs save four original, unedited JPEGs with identical pre/post simulation snapshots and canvas hashes. Geometry checks keep HUD and controls within the 1280×800 viewport. They do not overwrite repository screenshots. Copy fresh captures into `screenshots/` only after the full run succeeds. No vision review is available in this continuation; geometric and state checks do not establish subjective visual quality. Local tests are evidence, not an official competition score.

The native grader runs `node /bot/main.ts` with Node 22.18+ and no environment override; the default destination is `/output`. For local packaging always override it with an owned directory:

    MAKEFUN_OUTPUT_DIR=/tmp/makefun/campaign-20261117/best-game-01/artifacts/package-a /tmp/makefun/runtime/node-v22.23.5-linux-x64/bin/node main.ts

The entrypoint copies static files and screenshots, then builds the dossier with the kit's unchanged `vendor/makefun-game.ts`. Packaging is deterministic. README badges are repository web links only; the game does not load them.

MIT licensed. Publication and competition submission are separate from this source tree.

---

<sub>Entered on [make.fun](https://make.fun/?ref=298dam6q&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
