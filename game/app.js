import { createGame, startGame, nextStage, step, createClock, snapshot, tideFactor } from './simulation.js';
import { loadLogbook, isUnlocked, recordCompletion, recordMedal, resetLogbook } from './logbook.js';
import { STAGES, VOYAGES } from './stages.js';
import { drawRiver } from './render.js';
import { RiverAudio } from './audio.js';
const $ = id => document.getElementById(id);
const state = createGame(), audio = new RiverAudio(), keys = new Set();
const logbook = loadLogbook(undefined,STAGES.length);
const selector = document.createElement('div');
selector.id = 'chart-selector'; selector.setAttribute('aria-label', 'Single-chart replay');
$('panel').append(selector);
const tide = document.createElement('p'); tide.id = 'tide'; tide.className = 'hint';
$('cargo-note').after(tide);
$('tip').parentElement.after($('signal-note'));
function updateLogbook() {
  selector.replaceChildren();
  const label = document.createElement('p'); label.textContent = 'STORM ATLAS · six charts / two voyages'; selector.append(label);
  const expedition=document.createElement('button');expedition.id='atlas';expedition.className='expedition';
  expedition.disabled=!isUnlocked(logbook,3);expedition.textContent=expedition.disabled?'Storm Atlas · finish Reedwater to unlock':'Sail Storm Atlas → 12 keepers / 3 charts';
  expedition.addEventListener('click',()=>{audio.unlock();startGame(state,3);keys.clear();clock.reset();previous=performance.now();updateUI();canvas.focus({preventScroll:true});});selector.append(expedition);
  STAGES.forEach((chart, index) => {
    const button = document.createElement('button'); button.id = `replay-${index}`;
    button.disabled = !isUnlocked(logbook, index);
    button.textContent = `${index + 1}. ${chart.name} · ${logbook.completed[index] ? `Complete · Best ${logbook.bestScores[index]}` : button.disabled ? 'Locked' : 'Ready'}`;
    if(logbook.medals[index])button.textContent+=logbook.medals[index]===2?' · Gold signal':' · Copper signal';
    button.addEventListener('click', () => {
      if (!isUnlocked(logbook, index)) return;
      audio.unlock(); startGame(state, index, true); keys.clear(); clock.reset(); previous = performance.now();
      updateUI(); canvas.focus({preventScroll:true});
    });
    selector.append(button);
  });
  const reset=document.createElement('button');reset.id='reset-logbook';reset.textContent='Reset local logbook';
  reset.addEventListener('click',()=>{if(reset.dataset.confirm==='yes'){resetLogbook(logbook);updateLogbook();$('primary').focus();}else{reset.dataset.confirm='yes';reset.textContent='Erase scores & medals? Click again';}});selector.append(reset);
}
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
  else startGame(state,!state.replay && state.voyage===1 ? 3 : 0);
  keys.clear(); clock.reset(); previous = performance.now(); audio.setMode(state.mode); audio.play('start'); updateUI(); canvas.focus({preventScroll:true});
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
  audio.setMode(state.mode);
  $('chart-number').textContent=`CHART ${['I','II','III','IV','V','VI'][state.stage]} / VI`; $('chart-name').textContent=chart.name;
  $('saved').innerHTML=`${state.saved.length} / ${state.keepers.length} <small>safe ashore</small>`;
  $('time').textContent=`${Math.ceil(state.remaining)}s`; $('storm-fill').style.width=`${100*(1-state.remaining/chart.limit)}%`;
  $('hull').textContent='◆ '.repeat(Math.max(0,state.hull))+'◇ '.repeat(4-Math.max(0,state.hull));
  $('oil').textContent=`${Math.round(state.oil)}%`; $('cargo').textContent=`${state.cargo.length} / 2`;
  $('cargo-note').textContent=state.cargo.length===2?'Full skiff. Slower turns; choose open water.':state.cargo.length?'One light aboard. One seat remains.':'An empty skiff turns quickly.';
  $('score').textContent=String(state.score).padStart(4,'0');
  const factor = tideFactor(chart, state.elapsed);
  tide.textContent = `${state.replay ? 'Single-chart replay · ' : ''}${chart.tide ? `${Math.abs(factor) < .05 ? 'Slack tide' : factor > 0 ? 'Flow tide' : 'Ebb tide'} · ${Math.round(Math.abs(factor)*100)}% current · ${chart.tide.period}s cycle` : 'Steady tutorial current'}`;
  $('tip').textContent=chart.tip;
  $('signal-note').hidden=!chart.beacons;
  $('signal-note').textContent=chart.beacons?`OPTIONAL SIGNALS · ${state.litBeacons.length}/2 lit\nHold SPACE · 20% oil each\nBoth + rescue = Copper (+100)\nNo hits = Gold (+200) · Hits: ${state.hits}`:'';
  $('message').textContent=state.messageTime>0?state.message:state.cargo.length?'Return to HOME, or risk another pickup. Hold SPACE to dock.':chart.tip;
  if(shownMode===state.mode)return;
  shownMode=state.mode;
  selector.hidden = !['title','between','won','lost','replayed'].includes(state.mode);
  $('veil').classList.toggle('hidden',state.mode==='play'); $('veil').classList.toggle('center',state.mode!=='title');
  $('pause').textContent=state.mode==='paused'?'Resume · P':'Pause · P';
  $('tutorial').classList.toggle('hidden',state.mode!=='title');
  if(state.mode!=='play')$('primary').focus({preventScroll:true});
  if(state.mode==='title')return;
  const modes={
    paused:['THE RIVER CAN WAIT','Chart paused','Your skiff is anchored. Take a breath; the storm waits too.','Resume voyage','WASD / arrows steer · SPACE docks · SHIFT boosts'],
    between:[`CHART ${state.stage+1} COMPLETE`,'The light carries.',`${state.totalSaved} keepers safe so far. Next: ${STAGES[state.stage+1]?.name}. ${STAGES[state.stage+1]?.subtitle}`,'Open next chart',`Rescue score ${state.score} · Hull and oil restored for the next reach`],
    won:['ALL NINE LIGHTS HOME','A brighter shore.',`You brought every keeper through the storm. Nine windows glow along the river tonight.`,'Sail again',`Final rescue score ${state.score} · 3 charts completed · 9 keepers safe`],
    replayed:['CHART COMPLETE','A light revisited.',`${chart.name}: ${state.saved.length} keepers safe. Single-chart replay complete.`,'Start full voyage',`Chart score ${state.chartScore} · Personal best ${logbook.bestScores[state.stage]}`],
    lost:['VOYAGE ENDED','The river remembers.',`${state.reason} ${state.totalSaved} of 9 keepers reached the lighthouse. Another skiff, another chance.`,'Try again',`Rescue score ${state.score} · Try lighter cargo or stop at a shelter`]
  };
  if(state.mode==='won' && state.voyage===1)modes.won=['STORM ATLAS COMPLETE','The storm breaks.',`All 12 keepers reached the lighthouse. You crossed the weir, the divided river and the storm's eye.`,'Sail again',`Final rescue score ${state.score} · 3 Atlas charts completed · 12 keepers safe`];
  if(state.mode==='lost' && state.voyage===1)modes.lost[2]=`${state.reason} ${state.totalSaved} of ${VOYAGES[state.voyage].keepers} keepers reached home.`;
  if(state.mode==='won' && state.voyage===0)modes.won[2]+=' Storm Atlas is now open in your logbook.';
  if (state.mode === 'lost' && state.replay) modes.lost = ['REPLAY ENDED','The river remembers.',`${state.reason} ${state.saved.length} of ${state.keepers.length} keepers safe on this chart.`,'Start full voyage',`Partial score ${state.chartScore} · No completion recorded`];
  if (['between','won'].includes(state.mode)) modes[state.mode][4] += ` · This chart ${state.chartScore} · Best ${logbook.bestScores[state.stage]}`;
  if(['between','won','replayed'].includes(state.mode) && chart.beacons)modes[state.mode][4]+=` · ${state.medal===2?'Gold signal +200':state.medal===1?'Copper signal +100':'No signal medal'} · ${state.hits} hits`;
  const copy=modes[state.mode];if(copy){$('panel-kicker').textContent=copy[0];$('panel-title').textContent=copy[1];$('panel-copy').textContent=copy[2];$('primary').textContent=copy[3];$('panel-foot').textContent=copy[4];}
}
function frame(now) {
  const dt=(now-previous)/1000;previous=now;
  if(state.mode==='play')clock.advance(dt);
  audio.setMode(state.mode);audio.update(state);
  if(!reduced && state.mode!=='paused')visualTime+=Math.min(dt,.1);
  for(const event of state.events) {
    audio.play(event.kind);
    if (event.kind === 'stage') { recordCompletion(logbook, event.chart, event.chartScore); recordMedal(logbook,event.chart,event.medal); updateLogbook(); }
  }
  state.events.length=0;
  drawRiver(ctx,state,visualTime,reduced);updateUI();requestAnimationFrame(frame);
}
// A detached snapshot is the only diagnostic surface. It cannot mutate the simulation.
Object.defineProperty(window,'lanternState',{value:()=>snapshot(state),writable:false,configurable:false});
window.addEventListener('pagehide',()=>audio.dispose());
updateLogbook();updateUI();requestAnimationFrame(frame);
