import { createGame, startGame, nextStage, step, createClock, snapshot } from './simulation.js';
import { STAGES } from './stages.js';
import { drawRiver } from './render.js';
import { RiverAudio } from './audio.js';
const $ = id => document.getElementById(id);
const state = createGame(), audio = new RiverAudio(), keys = new Set();
const canvas = $('river'), ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let previous = performance.now(), visualTime = 0, shownMode = '', soundTouched = false;
const clock = createClock(dt => step(state, {
  x: Number(keys.has('ArrowRight') || keys.has('d')) - Number(keys.has('ArrowLeft') || keys.has('a')),
  y: Number(keys.has('ArrowDown') || keys.has('s')) - Number(keys.has('ArrowUp') || keys.has('w')),
  anchor: keys.has(' '), boost: keys.has('Shift')
}, dt));
function fit() { const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = 950 * dpr; canvas.height = 550 * dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
fit(); window.addEventListener('resize', fit);
function soundToggle() { audio.unlock(); audio.muted = !audio.muted; soundTouched = true; $('sound').textContent = audio.muted ? 'Sound off · M' : 'Sound on · M'; $('sound').setAttribute('aria-pressed', String(!audio.muted)); }
function primary() {
  audio.unlock();
  if (!soundTouched && state.mode === 'title') soundToggle();
  if (state.mode === 'between') nextStage(state);
  else if (state.mode === 'paused') state.mode = 'play';
  else startGame(state);
  keys.clear(); clock.reset(); previous = performance.now(); audio.play('start'); updateUI(); canvas.focus({preventScroll:true});
}
function pause() { if (state.mode === 'play') { state.mode = 'paused'; keys.clear(); clock.reset(); } else if (state.mode === 'paused') primary(); updateUI(); }
$('primary').addEventListener('click', primary); $('sound').addEventListener('click',soundToggle); $('pause').addEventListener('click',pause);
window.addEventListener('keydown', e => {
  if (e.target instanceof Element && e.target.closest('input, select, textarea, [contenteditable]:not([contenteditable="false"])')) return;
  const key=e.key.length===1 ? e.key.toLowerCase() : e.key;
  if (!e.repeat && key==='p' && ['play','paused'].includes(state.mode)) { e.preventDefault(); pause(); }
  if (!e.repeat && key==='m') { e.preventDefault(); soundToggle(); }
  if (e.target instanceof Element && e.target.closest('button, a, [role="button"]')) return;
  if (!e.repeat && key==='Enter' && state.mode!=='play') { e.preventDefault(); primary(); }
  if (state.mode==='play' && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d',' ','Shift'].includes(key)) { e.preventDefault(); keys.add(key); }
});
canvas.addEventListener('blur',()=>keys.clear());
window.addEventListener('keyup', e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
window.addEventListener('blur',()=>{if(state.mode==='play')pause();keys.clear();});
document.addEventListener('visibilitychange',()=>{if(document.hidden && state.mode==='play')pause();});
function updateUI() {
  const chart=STAGES[state.stage];
  $('chart-number').textContent=`CHART ${['I','II','III'][state.stage]} / III`; $('chart-name').textContent=chart.name;
  $('saved').innerHTML=`${state.saved.length} / ${state.keepers.length} <small>safe ashore</small>`;
  $('time').textContent=`${Math.ceil(state.remaining)}s`; $('storm-fill').style.width=`${100*(1-state.remaining/chart.limit)}%`;
  $('hull').textContent='◆ '.repeat(Math.max(0,state.hull))+'◇ '.repeat(4-Math.max(0,state.hull));
  $('oil').textContent=`${Math.round(state.oil)}%`; $('cargo').textContent=`${state.cargo.length} / 2`;
  $('cargo-note').textContent=state.cargo.length===2?'Full skiff. Slower turns; choose open water.':state.cargo.length?'One light aboard. One seat remains.':'An empty skiff turns quickly.';
  $('score').textContent=String(state.score).padStart(4,'0');
  $('tip').textContent=state.stage===0?'Ride the arrows out. Take quiet water home.':state.stage===1?'Cut through the reefs, or spend time on the open northern route.':'Two rescue pairs. A shelter between them. Keep enough oil for home.';
  $('message').textContent=state.messageTime>0?state.message:state.cargo.length?'Return to HOME, or risk another pickup. Hold SPACE to dock.':chart.tip;
  if(shownMode===state.mode)return;
  shownMode=state.mode;
  $('veil').classList.toggle('hidden',state.mode==='play'); $('veil').classList.toggle('center',state.mode!=='title');
  $('pause').textContent=state.mode==='paused'?'Resume · P':'Pause · P';
  $('tutorial').classList.toggle('hidden',state.mode!=='title');
  if(state.mode!=='play')$('primary').focus({preventScroll:true});
  if(state.mode==='title')return;
  const modes={
    paused:['THE RIVER CAN WAIT','Chart paused','Your skiff is anchored. Take a breath; the storm waits too.','Resume voyage','WASD / arrows steer · SPACE docks · SHIFT boosts'],
    between:[`CHART ${state.stage+1} COMPLETE`,'The light carries.',`${state.totalSaved} keepers safe so far. Next: ${STAGES[state.stage+1]?.name}. ${STAGES[state.stage+1]?.subtitle}`,'Open next chart',`Rescue score ${state.score} · Hull and oil restored for the next reach`],
    won:['ALL NINE LIGHTS HOME','A brighter shore.',`You brought every keeper through the storm. Nine windows glow along the river tonight.`,'Sail again',`Final rescue score ${state.score} · 3 charts completed · 9 keepers safe`],
    lost:['VOYAGE ENDED','The river remembers.',`${state.reason} ${state.totalSaved} of 9 keepers reached the lighthouse. Another skiff, another chance.`,'Try again',`Rescue score ${state.score} · Try lighter cargo or stop at a shelter`]
  };
  const copy=modes[state.mode];if(copy){$('panel-kicker').textContent=copy[0];$('panel-title').textContent=copy[1];$('panel-copy').textContent=copy[2];$('primary').textContent=copy[3];$('panel-foot').textContent=copy[4];}
}
function frame(now) {
  const dt=(now-previous)/1000;previous=now;
  if(state.mode==='play')clock.advance(dt);
  if(!reduced && state.mode!=='paused')visualTime+=Math.min(dt,.1);
  for(const event of state.events)audio.play(event.kind);state.events.length=0;
  drawRiver(ctx,state,visualTime,reduced);updateUI();requestAnimationFrame(frame);
}
// A detached snapshot is the only diagnostic surface. It cannot mutate the simulation.
Object.defineProperty(window,'lanternState',{value:()=>snapshot(state),writable:false,configurable:false});
updateUI();requestAnimationFrame(frame);
