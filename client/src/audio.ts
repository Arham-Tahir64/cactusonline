import type { SoundCue } from './feedback';

export interface AudioPreferences {
  muted: boolean;
  masterVolume: number;
  effectsVolume: number;
}

let audioContext: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  audioContext ??= new AudioContext();
  return audioContext;
}

function tone(
  audio: AudioContext,
  destination: AudioNode,
  frequency: number,
  startsAt: number,
  duration: number,
  gain: number,
  wave: OscillatorType = 'sine',
): void {
  const oscillator = audio.createOscillator();
  const envelope = audio.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, startsAt);
  envelope.gain.setValueAtTime(0.0001, startsAt);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), startsAt + Math.min(0.018, duration / 3));
  envelope.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  oscillator.connect(envelope).connect(destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.02);
}

function noise(
  audio: AudioContext,
  destination: AudioNode,
  startsAt: number,
  duration: number,
  gain: number,
  centerFrequency: number,
): void {
  const frames = Math.max(1, Math.floor(audio.sampleRate * duration));
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < frames; index += 1) data[index] = Math.random() * 2 - 1;

  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const envelope = audio.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = centerFrequency;
  filter.Q.value = 0.75;
  envelope.gain.setValueAtTime(gain, startsAt);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  source.connect(filter).connect(envelope).connect(destination);
  source.start(startsAt);
}

export function playCue(cue: SoundCue, preferences: AudioPreferences): void {
  const level = preferences.muted ? 0 : preferences.masterVolume * preferences.effectsVolume;
  if (level <= 0) return;
  const audio = context();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();

  const output = audio.createGain();
  output.gain.value = Math.min(0.32, level * 0.32);
  output.connect(audio.destination);
  const now = audio.currentTime + 0.012;

  switch (cue) {
    case 'button':
      tone(audio, output, 360, now, 0.045, 0.22, 'triangle');
      break;
    case 'turn':
      tone(audio, output, 523, now, 0.11, 0.28, 'sine');
      tone(audio, output, 659, now + 0.09, 0.16, 0.24, 'sine');
      break;
    case 'deal':
      [0, 0.055, 0.11, 0.165].forEach((offset, index) =>
        noise(audio, output, now + offset, 0.065, 0.18 - index * 0.02, 1500 + index * 170),
      );
      break;
    case 'draw':
      noise(audio, output, now, 0.13, 0.23, 1150);
      tone(audio, output, 250, now + 0.02, 0.09, 0.12, 'triangle');
      break;
    case 'discard':
      noise(audio, output, now, 0.105, 0.25, 820);
      tone(audio, output, 180, now + 0.035, 0.085, 0.13, 'sine');
      break;
    case 'reveal':
      tone(audio, output, 440, now, 0.12, 0.2, 'triangle');
      tone(audio, output, 660, now + 0.07, 0.18, 0.2, 'sine');
      break;
    case 'stack-success':
      tone(audio, output, 392, now, 0.13, 0.25, 'triangle');
      tone(audio, output, 523, now + 0.075, 0.15, 0.26, 'triangle');
      tone(audio, output, 784, now + 0.15, 0.22, 0.22, 'sine');
      break;
    case 'stack-failure':
      tone(audio, output, 190, now, 0.16, 0.24, 'sawtooth');
      tone(audio, output, 142, now + 0.1, 0.2, 0.2, 'sawtooth');
      break;
    case 'cactus':
      tone(audio, output, 330, now, 0.3, 0.2, 'triangle');
      tone(audio, output, 494, now + 0.08, 0.34, 0.22, 'triangle');
      tone(audio, output, 659, now + 0.16, 0.42, 0.22, 'sine');
      break;
  }
}
