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
  anchor: keys.has(' '), boost: keys.has('Shift'), flare: keys.has('f')
}, dt));
function fit() { const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = 950 * dpr; canvas.height = 550 * dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
fit(); window.addEventListener('resize', fit);
function soundToggle() { audio.unlock(); audio.muted = !audio.muted; soundTouched = true; $('sound').textContent = audio.muted ? 'Sound off · M' : 'Sound on · M'; $('sound').setAttribute('aria-pressed', String(!audio.muted)); }
function primary() {
  audio.unlock();
  if (!soundTouched && state.mode === 'title') soundToggle();
  if (state.mode === 'between') nextStage(state);
  else if (state.mode === 'bossIntro') state.mode = 'boss';
  else if (state.mode === 'paused') state.mode = state.resumeMode || 'play';
  else startGame(state);
  keys.clear(); clock.reset(); previous = performance.now(); audio.play('start'); updateUI(); canvas.focus({preventScroll:true});
}
function pause() { if (state.mode === 'play' || state.mode === 'boss') { state.resumeMode = state.mode; state.mode = 'paused'; keys.clear(); clock.reset(); } else if (state.mode === 'paused') primary(); updateUI(); }
$('primary').addEventListener('click', primary); $('sound').addEventListener('click',soundToggle); $('pause').addEventListener('click',pause);
window.addEventListener('keydown', e => {
  if (e.target instanceof Element && e.target.closest('input, select, textarea, [contenteditable]:not([contenteditable="false"])')) return;
  const key=e.key.length===1 ? e.key.toLowerCase() : e.key;
  if (!e.repeat && key==='p' && ['play','boss','paused'].includes(state.mode)) { e.preventDefault(); pause(); }
  if (!e.repeat && key==='m') { e.preventDefault(); soundToggle(); }
  if (e.target instanceof Element && e.target.closest('button, a, [role="button"]')) return;
  if (!e.repeat && key==='Enter' && ['title','paused','between','bossIntro','won','lost'].includes(state.mode)) { e.preventDefault(); primary(); }
  if (['play','boss'].includes(state.mode) && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d',' ','Shift','f'].includes(key)) { e.preventDefault(); keys.add(key); }
});
canvas.addEventListener('blur',()=>keys.clear());
window.addEventListener('keyup', e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
window.addEventListener('blur',()=>{if(state.mode==='play'||state.mode==='boss')pause();keys.clear();});
document.addEventListener('visibilitychange',()=>{if(document.hidden && (state.mode==='play'||state.mode==='boss'))pause();});
function updateUI() {
  const chart=STAGES[state.stage];
  const inBoss=!!state.boss;
  $('chart-number').textContent=inBoss?'FINAL ENCOUNTER':`CHART ${['I','II','III'][state.stage]} / III`; $('chart-name').textContent=inBoss?'The River Leviathan':chart.name;
  $('saved').innerHTML=inBoss?`${state.boss.maxHp-state.boss.hp} / ${state.boss.maxHp} <small>seals broken</small>`:`${state.saved.length} / ${state.keepers.length} <small>safe ashore</small>`;
  $('time').textContent=`${Math.ceil(inBoss?state.boss.remaining:state.remaining)}s`; $('storm-fill').style.width=`${100*(1-(inBoss?state.boss.remaining/52:state.remaining/chart.limit))}%`;
  $('hull').textContent='◆ '.repeat(Math.max(0,state.hull))+'◇ '.repeat(4-Math.max(0,state.hull));
  $('oil').textContent=`${Math.round(state.oil)}%`; $('cargo').textContent=`${state.cargo.length} / 2`;
  $('cargo-note').textContent=state.cargo.length===2?'Full skiff. Slower turns; choose open water.':state.cargo.length?'One light aboard. One seat remains.':'An empty skiff turns quickly.';
  $('score').textContent=String(state.score).padStart(4,'0');
  $('tip').textContent=inBoss?`Resonance flares: ${state.flareCooldown>0?`${state.flareCooldown.toFixed(1)}s`:'READY'} · ${state.boss.phase.toUpperCase()}`:state.stage===0?'Ride the arrows out. Take quiet water home.':state.stage===1?'Cut through the reefs, or spend time on the open northern route.':'Two rescue pairs. A shelter between them. Keep enough oil for home.';
  $('objective').innerHTML=inBoss?'Break the<br>river’s hold.':'Bring the lights<br>home.';
  $('message').textContent=state.messageTime>0?state.message:inBoss?'Dodge the marked surge, then close in. Press F to fire during recovery.':state.cargo.length?'Return to HOME, or risk another pickup. Hold SPACE to dock.':chart.tip;
  if(shownMode===state.mode)return;
  shownMode=state.mode;
  $('veil').classList.toggle('hidden',['play','boss'].includes(state.mode)); $('veil').classList.toggle('center',state.mode!=='title');
  $('pause').textContent=state.mode==='paused'?'Resume · P':'Pause · P';
  $('tutorial').classList.toggle('hidden',state.mode!=='title');
  if(!['play','boss'].includes(state.mode))$('primary').focus({preventScroll:true});
  document.body.classList.toggle('boss-mode',inBoss);
  if(state.mode==='title')return;
  const modes={
    paused:['THE RIVER CAN WAIT','Chart paused',state.resumeMode==='boss'?'The leviathan waits below. Take a breath; the next surge will still be telegraphed.':'Your skiff is anchored. Take a breath; the storm waits too.','Resume voyage',state.resumeMode==='boss'?'WASD / arrows steer · F fires during recovery · SHIFT boosts':'WASD / arrows steer · SPACE docks · SHIFT boosts'],
    between:[`CHART ${state.stage+1} COMPLETE`,'The light carries.',`${state.totalSaved} keepers safe so far. Next: ${STAGES[state.stage+1]?.name}. ${STAGES[state.stage+1]?.subtitle}`,'Open next chart',`Rescue score ${state.score} · Hull and oil restored for the next reach`],
    bossIntro:['THE LAST TIDE','Something below.','Nine lights are home. The river answers with a leviathan. Its red-water strike follows your position; move clear before the surge. Break five shell-seals with resonance flares while it recovers.','Face the leviathan','WASD / arrows steer · SHIFT boosts · F fires during recovery · P pauses'],
    won:inBoss?['THE RIVER REMEMBERS','The current is yours.',`The leviathan sinks beneath nine shining windows. Final rescue score ${state.score}.`,'Sail again',`Nine keepers · five seals broken · ${state.hull} hull remaining`]:['ALL NINE LIGHTS HOME','A brighter shore.',`You brought every keeper through the storm. Nine windows glow along the river tonight.`,'Sail again',`Final rescue score ${state.score} · 3 charts completed · 9 keepers safe`],
    lost:['VOYAGE ENDED','The river remembers.',`${state.reason} ${state.totalSaved} of 9 keepers reached the lighthouse. Another skiff, another chance.`,'Try again',`Rescue score ${state.score} · Try lighter cargo or stop at a shelter`]
  };
  const copy=modes[state.mode];if(copy){$('panel-kicker').textContent=copy[0];$('panel-title').textContent=copy[1];$('panel-copy').textContent=copy[2];$('primary').textContent=copy[3];$('panel-foot').textContent=copy[4];}
}
function frame(now) {
  const dt=(now-previous)/1000;previous=now;
  if(state.mode==='play'||state.mode==='boss')clock.advance(dt);
  if(!reduced && state.mode!=='paused')visualTime+=Math.min(dt,.1);
  for(const event of state.events)audio.play(event.kind);state.events.length=0;
  drawRiver(ctx,state,visualTime,reduced);updateUI();requestAnimationFrame(frame);
}
// A detached snapshot is the only diagnostic surface. It cannot mutate the simulation.
Object.defineProperty(window,'lanternState',{value:()=>snapshot(state),writable:false,configurable:false});
updateUI();requestAnimationFrame(frame);
