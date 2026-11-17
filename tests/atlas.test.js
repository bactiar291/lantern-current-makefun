import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, HOME } from '../game/stages.js';
import { driftwoodAt } from '../game/hazards.js';
import { createGame, startGame, nextStage, step, snapshot, createClock } from '../game/simulation.js';
import { emptyLogbook, sanitizeLogbook, recordCompletion, recordMedal, resetLogbook, loadLogbook } from '../game/logbook.js';
import { ATLAS_ROUTES } from './atlas-routes.js';
const run = (s, input, seconds) => { for (let i=0; i<Math.round(seconds*60); i++) step(s,input); };
function sail(s,x,y) {
  for(let i=0;i<2000;i++) {
    const dx=x-s.boat.x,dy=y-s.boat.y;
    if(Math.hypot(dx,dy)<10){run(s,{anchor:true},.25);return;}
    step(s,{x:Math.abs(dx)>5?Math.sign(dx):0,y:Math.abs(dy)>5?Math.sign(dy):0});
    assert.equal(s.mode,'play',`${STAGES[s.stage].name}: ${s.reason} at ${s.boat.x},${s.boat.y}`);
  }
  assert.fail(`stuck heading ${x},${y} at ${s.boat.x},${s.boat.y}`);
}
test('full Storm Atlas route earns all signals through steering, twelve rescues and fresh restart',()=>{
  const s=createGame();startGame(s,3);
  for(const chartRoute of ATLAS_ROUTES) {
    for(const [kind,id,points] of chartRoute) {
      for(const [x,y] of points)sail(s,x,y);
      const target=kind==='home'?HOME:kind==='beacon'?STAGES[s.stage].beacons[id]:s.keepers[id];
      sail(s,target.x,target.y+(kind==='pickup'?10:0));run(s,{anchor:true},kind==='beacon'?1.4:1);
      if(kind==='pickup')assert.ok(s.cargo.includes(id));
      if(kind==='beacon')assert.ok(s.litBeacons.includes(id));
    }
    assert.ok(s.medal>=1);assert.ok(s.remaining>25);assert.ok(s.hull>0);
    if(s.stage<5){assert.equal(s.mode,'between');nextStage(s);}
  }
  assert.equal(s.mode,'won');assert.equal(s.totalSaved,12);assert.ok(s.score>=1800);
  startGame(s,3);assert.equal(s.score,0);assert.equal(s.totalSaved,0);assert.deepEqual(s.litBeacons,[]);
});

test('six authored charts preserve the original learning voyage and add distinct routes',()=>{
  assert.equal(STAGES.length,6);
  assert.deepEqual(STAGES.slice(0,3).map(c=>c.keepers.length),[2,3,4]);
  assert.equal(new Set(STAGES.slice(3).map(c=>JSON.stringify(c.islands))).size,3);
  for(const c of STAGES.slice(3)) {
    assert.ok(c.driftwood.length>=2); assert.equal(c.beacons.length,2);
    for(const p of [HOME,...c.keepers,...c.docks,...c.beacons]) {
      for(const o of c.islands.concat(c.reefs)) assert.ok(Math.hypot(p.x-o.x,p.y-o.y)>o.r+14,`${c.name}: unsafe dock`);
    }
  }
});
test('driftwood gives two seconds warning, crosses continuously, and leaves a safe interval',()=>{
  const lane={from:{x:300,y:200},to:{x:700,y:200},period:16,duration:8,offset:0,r:16};
  assert.equal(driftwoodAt(lane,0).phase,'warning');
  assert.equal(driftwoodAt(lane,1.99).solid,false);
  const first=driftwoodAt(lane,2),mid=driftwoodAt(lane,6),last=driftwoodAt(lane,9.99);
  assert.equal(first.solid,true);assert.equal(first.x,300);assert.equal(mid.x,500);assert.ok(last.x>699);
  assert.equal(driftwoodAt(lane,10).phase,'clear');
  assert.deepEqual(driftwoodAt(lane,16),driftwoodAt(lane,0));
});
test('moving hazards damage once per recovery interval; pause freezes hazard and tide phase',()=>{
  const s=createGame();startGame(s,3);s.elapsed=3;
  const hazard=driftwoodAt(STAGES[3].driftwood[0],s.elapsed+1/60);
  s.boat={x:hazard.x,y:hazard.y,vx:0,vy:0,angle:0};step(s,{anchor:true});
  assert.equal(s.hull,3);assert.equal(s.hits,1);step(s,{anchor:true});assert.equal(s.hull,3);
  s.mode='paused';const before=snapshot(s);run(s,{},20);assert.deepEqual(s,before);
});
test('beacon requires uninterrupted anchoring and oil; medal is awarded only on completion',()=>{
  const s=createGame();startGame(s,3,true);const b=STAGES[3].beacons[0];Object.assign(s.boat,b);
  run(s,{anchor:true},.7);assert.deepEqual(s.litBeacons,[]);
  step(s,{});run(s,{anchor:true},.7);assert.deepEqual(s.litBeacons,[]);
  run(s,{anchor:true},.6);assert.deepEqual(s.litBeacons,[0]);assert.equal(s.oil,80);assert.equal(s.medal,0);
  run(s,{anchor:true},2);assert.equal(s.oil,80);
  Object.assign(s.boat,STAGES[3].beacons[1]);s.oil=19;run(s,{anchor:true},2);assert.equal(s.litBeacons.length,1);
  s.oil=20;run(s,{anchor:true},1.3);assert.equal(s.litBeacons.length,2);
  Object.assign(s.boat,HOME);s.cargo=s.keepers.map(k=>k.id);run(s,{anchor:true},1);
  assert.equal(s.mode,'replayed');assert.equal(s.medal,2);assert.equal(s.events.find(e=>e.kind==='stage').medal,2);
  startGame(s);assert.deepEqual(s.litBeacons,[]);assert.equal(s.hits,0);assert.equal(s.medal,0);
});
test('Atlas unlock migration preserves legacy scores and rejects invalid medal data',()=>{
  const legacy={version:1,completed:[true,true,true],bestScores:[400,500,600]};
  const book=sanitizeLogbook(legacy,6);assert.deepEqual(book.bestScores,[400,500,600,null,null,null]);
  assert.equal(recordMedal(book,3,2),false);recordCompletion(book,3,700,{setItem(){}});
  assert.equal(recordMedal(book,3,2,{setItem(){}}),true);assert.equal(recordMedal(book,3,1),false);
  assert.equal(book.medals[3],2);
  const bad={...book,medals:[0,0,0,3,0,0]};assert.deepEqual(sanitizeLogbook(bad,6),emptyLogbook(6));
  let raw;resetLogbook(book,{setItem:(k,v)=>raw=v});assert.deepEqual(book,emptyLogbook(6));assert.deepEqual(loadLogbook({getItem:()=>raw},6),book);
});
test('hazards are deterministic at 30, 60 and 144 Hz',()=>{
  const journey=fps=>{const s=createGame();startGame(s,5);const clock=createClock(dt=>step(s,{anchor:true},dt));for(let i=0;i<fps*24;i++)clock.advance(1/fps);return snapshot(s);};
  assert.deepEqual(journey(30),journey(60));assert.deepEqual(journey(60),journey(144));
});
