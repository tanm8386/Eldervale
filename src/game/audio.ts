export class WoodlandAudio {
  context: AudioContext | null = null;
  master: GainNode | null = null;
  enabled = false;
  volume = 0.25;
  private timer: ReturnType<typeof setInterval> | null = null;
  private note = 0;

  async setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      if (this.master && this.context)
        this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.1);
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      return;
    }
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
    }
    await this.context.resume();
    this.master!.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.15);
    if (this.timer) return;
    const melody = [
      220, 0, 329.63, 293.66, 0, 261.63, 329.63, 0, 196, 0, 293.66, 261.63, 0, 246.94, 220, 0,
    ];
    this.timer = setInterval(() => {
      const frequency = melody[this.note++ % melody.length];
      if (frequency) this.tone(frequency, 1.8, 0.12, 'sine');
      if (this.note % 8 === 0) this.tone(this.note % 16 === 0 ? 110 : 98, 4, 0.08, 'sine');
    }, 750);
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.master && this.context && this.enabled)
      this.master.gain.setTargetAtTime(volume, this.context.currentTime, 0.1);
  }

  tone(frequency: number, duration: number, volume: number, type: OscillatorType = 'triangle') {
    if (!this.enabled || !this.context || !this.master) return;
    const oscillator = this.context.createOscillator(),
      gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, this.context.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.context.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start();
    oscillator.stop(this.context.currentTime + duration + 0.1);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  effect(kind: string) {
    if (kind === 'attack') this.tone(175, 0.13, 0.07);
    if (kind === 'hurt') this.tone(94, 0.18, 0.1);
    if (kind === 'gather' || kind === 'heal') this.tone(660, 0.4, 0.06, 'sine');
    if (kind === 'level' || kind === 'quest') {
      this.tone(440, 1, 0.08, 'sine');
      this.tone(554.37, 1.3, 0.06, 'sine');
      this.tone(659.25, 1.6, 0.06, 'sine');
    }
  }
}
export const audio = new WoodlandAudio();
