import { STAGES, HOME } from './stages.js';
export const STEP = 1 / 60;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function createGame() {
  return { mode: 'title', stage: 0, score: 0, totalSaved: 0, ticks: 0, events: [], ...stageState(0) };
}
function stageState(index) {
  return { boat: { ...HOME, vx: 0, vy: 0, angle: 0 }, remaining: STAGES[index].limit,
    hull: 4, oil: 100, cargo: [], saved: [], keepers: STAGES[index].keepers.map((k, id) => ({ ...k, id, status: 'waiting' })),
    invulnerable: 0, dockTime: 0, dockTarget: '', repairTime: 0, message: STAGES[index].tip, messageTime: 8, reason: '', elapsed: 0 };
}
export function startGame(s) { Object.assign(s, createGame(), { mode: 'play' }); }
export function nextStage(s) {
  if (s.mode !== 'between') return;
  s.stage += 1;
  Object.assign(s, stageState(s.stage), { mode: 'play' });
}
function signal(s, kind, text) {
  s.events.push({ kind, x: s.boat.x, y: s.boat.y });
  s.message = text; s.messageTime = 4;
}
export function currentAt(stage, boat) {
  let x = 0, y = 0;
  for (const c of stage.currents) if (boat.x > c.x && boat.x < c.x + c.w && boat.y > c.y && boat.y < c.y + c.h) { x += c.dx; y += c.dy; }
  return { x, y };
}
export function step(s, input = {}, dt = STEP) {
  if (s.mode !== 'play') return;
  const stage = STAGES[s.stage], b = s.boat;
  s.ticks++; s.elapsed += dt; s.remaining = Math.max(0, s.remaining - dt);
  s.invulnerable = Math.max(0, s.invulnerable - dt); s.messageTime = Math.max(0, s.messageTime - dt);
  let x = input.x || 0, y = input.y || 0;
  const length = Math.hypot(x, y); if (length > 1) { x /= length; y /= length; }
  const anchored = !!input.anchor, boost = !!input.boost && s.oil > 0 && length > 0 && !anchored;
  if (boost) s.oil = Math.max(0, s.oil - 19 * dt);
  const speed = (145 - s.cargo.length * 18) * (boost ? 1.65 : 1) * (anchored ? 0.2 : 1);
  const response = anchored ? 13 : 6 - s.cargo.length * 1.3;
  const flow = currentAt(stage, b), blend = 1 - Math.exp(-response * dt);
  b.vx += (x * speed + flow.x * (anchored ? 0.07 : 1) - b.vx) * blend;
  b.vy += (y * speed + flow.y * (anchored ? 0.07 : 1) - b.vy) * blend;
  b.x = clamp(b.x + b.vx * dt, 20, 930); b.y = clamp(b.y + b.vy * dt, 30, 520);
  if (Math.hypot(b.vx, b.vy) > 8) b.angle = Math.atan2(b.vy, b.vx);
  for (const obstacle of [...stage.islands, { x: 63, y: 224, r: 43 }, ...stage.reefs]) {
    const d = distance(b, obstacle), radius = obstacle.r + 12;
    if (d < radius) {
      const nx = d ? (b.x - obstacle.x) / d : 1, ny = d ? (b.y - obstacle.y) / d : 0;
      b.x = obstacle.x + nx * radius; b.y = obstacle.y + ny * radius;
      b.vx = nx * 35; b.vy = ny * 35;
      if (s.invulnerable === 0) { s.hull--; s.invulnerable = 1.5; signal(s, 'damage', 'Hull struck! Hold SPACE at a shelter to repair.'); }
    }
  }
  // Loss takes precedence over same-tick repair, delivery and chart completion.
  if (s.hull <= 0 || s.remaining <= 0) {
    s.mode = 'lost'; s.reason = s.hull <= 0 ? 'The paper hull gave way.' : 'The storm closed the river.';
    signal(s, 'lost', s.reason);
    return;
  }
  const keeper = s.keepers.find(k => k.status === 'waiting' && distance(b, k) < 38);
  const atHome = distance(b, HOME) < 43;
  const dock = stage.docks.find(d => distance(b, d) < 40);
  const target = atHome ? 'home' : dock ? 'dock' : keeper ? `keeper${keeper.id}` : '';
  if (target !== s.dockTarget || !anchored) s.dockTime = 0;
  s.dockTarget = target;
  if (anchored && target) {
    s.dockTime += dt;
    if (atHome || dock) {
      s.oil = Math.min(100, s.oil + 30 * dt); s.repairTime += dt;
      if (s.repairTime >= 1.5) { s.repairTime = 0; if (s.hull < 4) { s.hull++; signal(s, 'repair', 'Copper patched. Ready for the river.'); } }
    }
    if (s.dockTime >= 0.65) {
      if (atHome && s.cargo.length) {
        const count = s.cargo.length; s.saved.push(...s.cargo); s.totalSaved += count; s.score += count * 100;
        for (const id of s.cargo) s.keepers[id].status = 'saved';
        s.cargo = []; signal(s, 'delivery', `${count} ${count === 1 ? 'light' : 'lights'} home. The lighthouse burns brighter.`);
        if (s.saved.length === s.keepers.length) {
          s.score += Math.floor(s.remaining) * 2 + s.hull * 25;
          s.mode = s.stage === STAGES.length - 1 ? 'won' : 'between';
          signal(s, 'stage', s.mode === 'won' ? 'Every light is home.' : 'This reach is safe. A new chart awaits.');
        }
      } else if (keeper && s.cargo.length < 2) {
        keeper.status = 'aboard'; s.cargo.push(keeper.id); s.dockTime = 0;
        signal(s, 'rescue', `${keeper.name} aboard. ${s.cargo.length === 2 ? 'Full cargo: take wide turns.' : 'One seat remains.'}`);
      } else if (keeper) { s.message = 'Both seats are full. Return to the lighthouse.'; s.messageTime = 2; }
    }
  } else s.repairTime = 0;
}
export function createClock(update) {
  let accumulator = 0;
  return { advance(seconds) {
    accumulator += clamp(seconds, 0, 0.1);
    let count = 0;
    while (accumulator + 1e-10 >= STEP && count < 6) { update(STEP); accumulator -= STEP; count++; }
    return count;
  }, reset() { accumulator = 0; } };
}
export function snapshot(s) { return JSON.parse(JSON.stringify(s)); }
