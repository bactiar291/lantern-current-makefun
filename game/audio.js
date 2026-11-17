// Original pentatonic river score. No samples, timers, downloads or random notes.
export class RiverAudio {
  constructor(factory = () => new (window.AudioContext || window.webkitAudioContext)()) {
    this.factory=factory; this.context=null; this._muted=true; this.mode='title'; this.voices=new Set(); this.lastBeat=-1;
  }
  get muted() { return this._muted; }
  set muted(value) { this._muted=!!value; this.sync(); }
  unlock() {
    try { if(!this.context)this.context=this.factory(); this.sync(); } catch { this.context=null; }
  }
  setMode(mode) { if(this.mode!==mode){this.mode=mode;this.lastBeat=-1;this.sync();} }
  sync() {
    if(!this.context)return;
    if(this.muted || this.mode==='paused' || this.mode==='title') { this.clear(); this.context.suspend()?.catch(()=>{}); }
    else this.context.resume()?.catch(()=>{});
  }
  release(voice) {
    voice.tone.onended=null;voice.tone.disconnect();voice.gain.disconnect();this.voices.delete(voice);
  }
  clear() {
    for(const voice of [...this.voices]) { try{voice.tone.stop();}catch{} this.release(voice); }
    this.lastBeat=-1;
  }
  note(hz, delay, duration, volume, type='sine') {
    if(this.muted || !this.context || this.mode==='paused' || this.mode==='title')return;
    const tone=this.context.createOscillator(),gain=this.context.createGain(),t=this.context.currentTime+delay;
    const voice={tone,gain};this.voices.add(voice);
    tone.type=type;tone.frequency.value=hz;
    gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(volume,t+.025);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    tone.connect(gain);gain.connect(this.context.destination);
    tone.onended=()=>this.release(voice);tone.start(t);tone.stop(t+duration+.02);
  }
  update(s) {
    if(this.mode!=='play' || this.muted || !this.context)return;
    const beat=Math.floor(s.elapsed/.48);if(beat===this.lastBeat)return;this.lastBeat=beat;
    const melody=[0,2,4,2,1,3,4,1,0,4,3,2,1,2,4,3],scale=[261.63,293.66,329.63,392,440];
    const transposition=s.stage>=3?.8909:1;
    this.note(scale[melody[beat%16]]*transposition,0,.42,.025,'triangle');
    if(beat%4===0) {
      const root=scale[(Math.floor(beat/16)*2)%5]*transposition;
      this.note(root/2,0,1.8,.026);this.note(root*.75,0,1.65,.012);
    }
    // Soft high harmonics suggest water; low pulses gather as the storm nears.
    if(beat%2===0)this.note(scale[(beat+2)%5]*2,0,.25,.009);
    if(s.remaining<30 || s.cargo.length===2)this.note(65.4*transposition,0,.18,s.remaining<30?.04:.018,'triangle');
  }
  play(kind) {
    const notes={rescue:[392,523],delivery:[392,523,659],damage:[110,82],repair:[330,440],beacon:[440,659,880],stage:[392,523,659,784],lost:[196,147,98],start:[262,392]}[kind];
    if(!notes)return;
    notes.forEach((hz,i)=>this.note(hz,i*.12,.34,kind==='damage'?.065:.055,kind==='damage'?'triangle':'sine'));
  }
  dispose() { this.clear();this.context?.close()?.catch(()=>{});this.context=null; }
}
