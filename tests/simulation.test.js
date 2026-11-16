import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, startGame, nextStage, step, createClock, snapshot, currentAt, STEP } from '../game/simulation.js';
import { HOME, STAGES } from '../game/stages.js';
const run = (s, input, seconds) => { for(let i=0;i<Math.round(seconds*60);i++)step(s,input); };
function sail(s, x, y) {
  for(let i=0;i<1600;i++) {
    if(Math.hypot(s.boat.x-x,s.boat.y-y)<9){run(s,{anchor:true},.25);return;}
    const dx=x-s.boat.x,dy=y-s.boat.y;
    step(s,{x:Math.abs(dx)>5?Math.sign(dx):0,y:Math.abs(dy)>5?Math.sign(dy):0});
    assert.equal(s.mode,'play',`Route failed at ${s.boat.x},${s.boat.y}: ${s.reason}`);
  }
  assert.fail(`Unable to reach ${x},${y}; at ${s.boat.x},${s.boat.y}`);
}
function pickup(s,id,points=[]) { for(const [x,y]of points)sail(s,x,y);const k=s.keepers[id];sail(s,k.x,k.y+10);run(s,{anchor:true},1);assert.ok(s.cargo.includes(id)); }
function home(s,points=[]) { for(const [x,y]of points)sail(s,x,y);sail(s,HOME.x,HOME.y);run(s,{anchor:true},1); }
test('complete three-chart journey: navigation, rescue, delivery, scoring, win and restart',()=>{
  const s=createGame();assert.equal(s.mode,'title');startGame(s);
  pickup(s,0,[[210,160]]);pickup(s,1,[[680,160],[700,410]]);assert.equal(s.cargo.length,2);
  home(s,[[660,430],[190,430]]);assert.equal(s.mode,'between');assert.equal(s.totalSaved,2);assert.ok(s.score>200);
  nextStage(s);assert.equal(s.stage,1);assert.equal(s.hull,4);
  pickup(s,0,[[210,145]]);pickup(s,1,[[570,130],[750,150]]);
  home(s,[[570,130],[180,145]]);assert.equal(s.mode,'play');assert.equal(s.totalSaved,4);
  pickup(s,2,[[190,490],[745,490]]);home(s,[[745,490],[190,490]]);assert.equal(s.mode,'between');
  nextStage(s);pickup(s,0,[[200,140]]);pickup(s,1,[[570,130],[765,140]]);
  home(s,[[570,130],[190,140]]);pickup(s,3,[[190,490],[350,490]]);pickup(s,2,[[600,490],[815,490]]);
  home(s,[[600,490],[190,490]]);assert.equal(s.mode,'won');assert.equal(s.totalSaved,9);assert.ok(s.score>=900);
  const final=s.score;run(s,{x:1},5);assert.equal(s.score,final);
  startGame(s);assert.equal(s.score,0);assert.equal(s.stage,0);assert.equal(s.totalSaved,0);assert.equal(s.cargo.length,0);
});
test('reef collisions damage, separate the hull, and eventually lose',()=>{
  const s=createGame();startGame(s);sail(s,350,270);
  for(let i=0;i<900;i++)step(s,{x:Math.sign(520-s.boat.x),y:Math.sign(270-s.boat.y)});
  assert.ok(s.hull<4);assert.equal(s.mode,'lost');assert.match(s.reason,/hull/);
});
test('storm loss and instantaneous fresh restart',()=>{const s=createGame();startGame(s);run(s,{anchor:true},111);assert.equal(s.mode,'lost');assert.match(s.reason,/storm/);startGame(s);assert.equal(s.remaining,110);assert.equal(s.hull,4);});
test('shelter repairs and refills through actual docking time',()=>{const s=createGame();startGame(s);s.hull=2;s.oil=0;sail(s,200,400);sail(s,575,400);run(s,{anchor:true},4);assert.equal(s.hull,4);assert.equal(s.oil,100);});
test('cargo inertia, oil boost and currents change navigation',()=>{
  const light=createGame(),heavy=createGame();startGame(light);startGame(heavy);heavy.cargo=[0,1];run(light,{x:1},1);run(heavy,{x:1},1);assert.ok(light.boat.x>heavy.boat.x);
  const boosted=createGame();startGame(boosted);run(boosted,{x:1,boost:true},1);assert.ok(boosted.boat.x>light.boat.x);assert.ok(boosted.oil<100);
  assert.equal(currentAt(STAGES[0],{x:300,y:250}).x,28);assert.equal(currentAt(STAGES[0],HOME).x,0);
});
test('fixed timestep produces identical full movement journeys at 30, 60 and 144Hz',()=>{
  function journey(fps){const s=createGame();startGame(s);let ticks=0;const c=createClock(dt=>{step(s,ticks<180?{x:1}:ticks<360?{y:1}:ticks<540?{x:-1}:{anchor:true},dt);ticks++;});for(let i=0;i<fps*12;i++)c.advance(1/fps);return snapshot(s);}
  assert.deepEqual(journey(30),journey(60));assert.deepEqual(journey(60),journey(144));
});
test('catch-up is capped, paused worlds are inert, snapshots are detached',()=>{const s=createGame();startGame(s);const c=createClock(dt=>step(s,{},dt));assert.equal(c.advance(30),6);s.mode='paused';const before=snapshot(s);run(s,{x:1},5);assert.deepEqual(s,before);const copy=snapshot(s);copy.boat.x=900;assert.notEqual(s.boat.x,900);});
// Source-only boundary fixtures; browser evidence never uses state setters.
function finalDelivery(stage) {
  const s=createGame();startGame(s);
  while(s.stage<stage){s.mode='between';nextStage(s);}
  s.cargo=s.keepers.slice(-2).map(k=>k.id);
  s.saved=s.keepers.slice(0,-2).map(k=>k.id);
  for(const k of s.keepers)k.status=s.cargo.includes(k.id)?'aboard':'saved';
  s.totalSaved=s.saved.length;s.dockTarget='home';s.dockTime=.65-STEP/2;
  return s;
}
for(const stage of [0,2]) {
  test(`chart ${stage+1}: expiry beats final delivery on the same tick`,()=>{
    const s=finalDelivery(stage), before=snapshot(s);s.remaining=STEP;
    step(s,{anchor:true});
    assert.equal(s.remaining,0);assert.equal(s.mode,'lost');assert.match(s.reason,/storm/);
    assert.deepEqual(s.cargo,before.cargo);assert.deepEqual(s.saved,before.saved);
    assert.equal(s.score,0);assert.equal(s.totalSaved,before.totalSaved);
    assert.deepEqual(s.events.map(e=>e.kind),['lost']);
  });
  test(`chart ${stage+1}: fatal home-island contact beats delivery and repair`,()=>{
    const s=finalDelivery(stage), before=snapshot(s);
    s.boat={x:90,y:268,vx:0,vy:0,angle:0};s.hull=1;s.repairTime=1.5-STEP/2;
    step(s,{anchor:true});
    assert.ok(Math.hypot(s.boat.x-HOME.x,s.boat.y-HOME.y)<43,'collision remains in delivery range');
    assert.equal(s.hull,0);assert.equal(s.mode,'lost');assert.match(s.reason,/hull/);
    assert.deepEqual(s.cargo,before.cargo);assert.deepEqual(s.saved,before.saved);
    assert.equal(s.score,0);assert.equal(s.totalSaved,before.totalSaved);
    assert.deepEqual(s.events.map(e=>e.kind),['damage','lost']);
  });
  test(`chart ${stage+1}: surviving final delivery still completes`,()=>{
    const s=finalDelivery(stage);s.remaining=2*STEP;
    step(s,{anchor:true});
    assert.equal(s.mode,stage===2?'won':'between');assert.equal(s.cargo.length,0);
    assert.equal(s.saved.length,s.keepers.length);assert.ok(s.score>0);
  });
}
