export class RiverAudio {
  constructor() { this.context = null; this.muted = true; }
  unlock() { if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)(); this.context.resume(); }
  play(kind) {
    if (this.muted || !this.context) return;
    const notes = { rescue: [392, 523], delivery: [392, 523, 659], damage: [110, 82], repair: [330, 440], stage: [392, 523, 659, 784], lost: [196, 147, 98], start: [262, 392], boss: [82, 110, 147], tell: [110, 82], surge: [73, 98], recover: [262, 392], fire: [587], bossHit: [523, 659, 784], victory: [392, 523, 659, 784] }[kind] || [220];
    notes.forEach((hz, i) => {
      const t = this.context.currentTime + i * 0.12;
      const tone = this.context.createOscillator(), gain = this.context.createGain();
      tone.type = kind === 'damage' ? 'triangle' : 'sine'; tone.frequency.value = hz;
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.09, t + 0.015); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      tone.connect(gain); gain.connect(this.context.destination); tone.start(t); tone.stop(t + 0.32);
    });
  }
}
