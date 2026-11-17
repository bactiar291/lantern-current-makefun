import test from 'node:test';
import assert from 'node:assert/strict';
import { RiverAudio } from '../game/audio.js';
function context() {
  const nodes=[];const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  const node=()=>{const n={frequency:param(),gain:param(),connect(){},disconnect(){this.disconnected=true;},start(){},stop(){this.stopped=true;}};nodes.push(n);return n;};
  return {nodes,currentTime:0,state:'suspended',destination:{},createOscillator:node,createGain:node,resume(){this.state='running';return Promise.resolve();},suspend(){this.state='suspended';return Promise.resolve();},close(){this.state='closed';return Promise.resolve();}};
}
test('layered music schedules finite voices, mute and pause immediately release every node',()=>{
  const ctx=context(),audio=new RiverAudio(()=>ctx);audio.unlock();audio.muted=false;audio.setMode('play');
  audio.update({stage:4,elapsed:1,remaining:15,cargo:[1]});assert.ok(audio.voices.size>=3);
  audio.muted=true;assert.equal(audio.voices.size,0);assert.equal(ctx.state,'suspended');
  assert.ok(ctx.nodes.every(n=>n.disconnected));
  audio.muted=false;audio.update({stage:4,elapsed:2,remaining:15,cargo:[]});assert.ok(audio.voices.size>0);
  audio.setMode('paused');assert.equal(audio.voices.size,0);assert.equal(ctx.state,'suspended');
  audio.play('rescue');assert.equal(audio.voices.size,0);
  audio.setMode('play');audio.play('beacon');assert.ok(audio.voices.size>0);
  audio.dispose();assert.equal(audio.voices.size,0);assert.equal(ctx.state,'closed');
});
test('natural note endings disconnect both oscillator and gain; unavailable audio is harmless',()=>{
  const ctx=context(),audio=new RiverAudio(()=>ctx);audio.unlock();audio.muted=false;audio.setMode('play');audio.play('delivery');
  for(const voice of [...audio.voices])voice.tone.onended();assert.equal(audio.voices.size,0);assert.ok(ctx.nodes.every(n=>n.disconnected));
  const silent=new RiverAudio(()=>{throw Error('unsupported');});assert.doesNotThrow(()=>{silent.unlock();silent.muted=false;silent.setMode('play');silent.update({elapsed:0});silent.dispose();});
});
