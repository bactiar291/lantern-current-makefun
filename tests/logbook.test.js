import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyLogbook, loadLogbook, saveLogbook, recordCompletion, isUnlocked } from '../game/logbook.js';
import { createGame, startGame, nextStage, step, snapshot, tideFactor, createClock } from '../game/simulation.js';
import { STAGES } from '../game/stages.js';
const run = (s, input, seconds) => { for (let i=0;i<seconds*60;i++) step(s,input); };
test('storage exceptions including getter are safe; memory progress survives write denial', () => {
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('denied');}});
  try { const book=loadLogbook(); assert.deepEqual(book,emptyLogbook(3)); assert.equal(saveLogbook(book),false); assert.equal(recordCompletion(book,0,200),true); assert.equal(book.completed[0],true); }
  finally { if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage; }
});
test('malformed, incoherent, version and invalid-score storage fail closed', () => {
  const bad=['{',null,{version:2,completed:[false,false,false],bestScores:[null,null,null]}];
  for(const score of [null,-1,1.2,1000001,'200']) bad.push({version:1,completed:[true,false,false],bestScores:[score,null,null]});
  bad.push({version:1,completed:[false,true,false],bestScores:[null,200,null]}, {version:1,completed:[false,false,false],bestScores:[200,null,null]});
  for(const value of bad)assert.deepEqual(loadLogbook({getItem:()=>typeof value==='string'?value:JSON.stringify(value)}),emptyLogbook(3));
});
test('sequential unlock, best-only writes, idempotence and reload', () => {
  let raw=null,writes=0; const storage={getItem:()=>raw,setItem:(key,value)=>{raw=value;writes++;}};
  const book=loadLogbook(storage); assert.equal(isUnlocked(book,1),false);
  for(const score of [null,NaN,Infinity,-1,2.5])assert.equal(recordCompletion(book,0,score,storage),false);
  assert.equal(recordCompletion(book,1,300,storage),false);
  assert.equal(recordCompletion(book,0,200,storage),true);
  assert.equal(recordCompletion(book,0,200,storage),false); assert.equal(recordCompletion(book,0,100,storage),false);
  assert.equal(writes,1); assert.equal(isUnlocked(book,1),true); assert.equal(isUnlocked(book,3),false);
  recordCompletion(book,0,300,storage); recordCompletion(book,1,400,storage);
  assert.deepEqual(loadLogbook(storage),book); assert.equal(writes,3);
});
test('single-chart completion emits once and restart clears all voyage state', () => {
  const s=createGame();startGame(s,1,true);s.saved=[0];s.cargo=[1,2];s.chartScore=100;s.score=100;
  run(s,{anchor:true},1);assert.equal(s.mode,'replayed');assert.equal(s.events.filter(e=>e.kind==='stage').length,1);
  const event=s.events.find(e=>e.kind==='stage');assert.equal(event.chart,1);assert.equal(event.chartScore,s.chartScore);
  const before=snapshot(s);run(s,{},2);nextStage(s);assert.deepEqual(s,before);
  startGame(s);assert.equal(s.replay,false);assert.equal(s.stage,0);assert.equal(s.score,0);assert.equal(s.chartScore,0);assert.deepEqual(s.cargo,[]);assert.deepEqual(s.events,[]);
});
test('partial delivery and loss never emit completion', () => {
  const s=createGame();startGame(s);s.cargo=[0];run(s,{anchor:true},1);assert.equal(s.chartScore,100);assert.equal(s.events.some(e=>e.kind==='stage'),false);
  s.remaining=0;step(s,{});assert.equal(s.mode,'lost');assert.equal(s.events.some(e=>e.kind==='stage'),false);
});
test('later tides reverse, anchor resists flow, pause freezes phase and sustained movement survives reversal', () => {
  for(const index of [1,2]) {
    const chart=STAGES[index];assert.equal(tideFactor(chart,0),1);assert.equal(tideFactor(chart,chart.tide.period/2),-1);
    const s=createGame();startGame(s,index);s.boat.x=240;s.boat.y=240;s.elapsed=chart.tide.period/4-1;
    run(s,{x:1,anchor:true},2);assert.ok(s.boat.x>240);assert.ok(tideFactor(chart,s.elapsed)<0);assert.equal(s.mode,'play');
    s.mode='paused';const before=snapshot(s);run(s,{x:1},2);assert.deepEqual(s,before);
    const anchored=createGame(),free=createGame();startGame(anchored,index);startGame(free,index);
    for(const state of [anchored,free]) {state.boat.x=240;state.boat.y=240;}
    run(anchored,{anchor:true},1);run(free,{},1);assert.ok(Math.abs(anchored.boat.x-240)<Math.abs(free.boat.x-240));
  }
  assert.equal(tideFactor(STAGES[0],999),1);
});
test('later tide timing is identical at 30, 60 and 144Hz across a full cycle', () => {
  function journey(fps) {const s=createGame();startGame(s,2);const clock=createClock(dt=>step(s,{anchor:true},dt));for(let i=0;i<fps*32;i++)clock.advance(1/fps);return snapshot(s);}
  assert.deepEqual(journey(30),journey(60));assert.deepEqual(journey(60),journey(144));
});
