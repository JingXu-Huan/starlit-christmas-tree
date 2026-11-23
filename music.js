// Global background music: the chorus of "Jingle Bells" (public domain,
// written 1857), synthesized with Web Audio bell tones. No audio file is
// fetched, so the page works offline and no recording is streamed.
// Playback only starts from the music button: browsers block audio before
// a user gesture, so there is no autoplay on page load.
const BEAT = 60 / 132;
const E = 64, G = 67, C = 72, D = 74, F = 77, G5 = 79;
// [MIDI note, beats]. The chorus, in C: it climbs E-G-C-D-E, answers in F,
// repeats, and closes G-G-F-D-C.
const MELODY = [
  [E, 1], [E, 1], [E, 2], [E, 1], [E, 1], [E, 2],
  [E, 1], [G, 1], [C, 1.5], [D, 0.5], [76, 4],
  [F, 1], [F, 1], [F, 1.5], [F, 0.5], [F, 1], [76, 1], [76, 1], [76, 0.5], [76, 0.5],
  [76, 1], [D, 1], [D, 1], [76, 1], [D, 2], [G, 2],
  [E, 1], [E, 1], [E, 2], [E, 1], [E, 1], [E, 2],
  [E, 1], [G, 1], [C, 1.5], [D, 0.5], [76, 4],
  [F, 1], [F, 1], [F, 1.5], [F, 0.5], [F, 1], [76, 1], [76, 1], [76, 0.5], [76, 0.5],
  [G5, 1], [G5, 1], [F, 1], [D, 1], [C, 4],
];
// One soft bass note per bar, following the harmony: C, C, G, C, F, C, G, C...
const BASS = [48, 48, 55, 48, 53, 48, 55, 48, 48, 48, 55, 48, 53, 55, 48, 48];

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function bell(ctx, out, freq, start, duration, volume) {
  // A bell is a struck tone: a loud fundamental that decays, plus a quiet
  // higher partial that dies away faster.
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  gain.connect(out);
  const fundamental = ctx.createOscillator();
  fundamental.type = 'sine';
  fundamental.frequency.value = freq;
  fundamental.connect(gain);
  fundamental.start(start);
  fundamental.stop(start + duration + 0.05);
  const partialGain = ctx.createGain();
  partialGain.gain.setValueAtTime(0, start);
  partialGain.gain.linearRampToValueAtTime(volume * 0.32, start + 0.008);
  partialGain.gain.exponentialRampToValueAtTime(0.0001, start + duration * 0.45);
  partialGain.connect(out);
  const partial = ctx.createOscillator();
  partial.type = 'sine';
  partial.frequency.value = freq * 2.76;
  partial.connect(partialGain);
  partial.start(start);
  partial.stop(start + duration * 0.45 + 0.05);
}

export function createMusic() {
  let ctx = null, master = null, timer = null, playing = false;
  let nextIndex = 0, nextTime = 0, barIndex = 0;

  function scheduleAhead() {
    if (!ctx) return;
    const ahead = ctx.currentTime + 0.45;
    while (nextTime < ahead) {
      const [note, beats] = MELODY[nextIndex];
      const duration = Math.min(beats * BEAT * 1.15, 1.6);
      bell(ctx, master, midiToFreq(note), nextTime, duration, 0.16);
      // Bass on the first beat of every bar (every 4 beats from the start).
      const elapsedBeats = MELODY.slice(0, nextIndex).reduce((sum, [, b]) => sum + b, 0);
      if (elapsedBeats % 4 === 0) {
        const bass = BASS[barIndex % BASS.length];
        barIndex += 1;
        const bassGain = ctx.createGain();
        bassGain.gain.setValueAtTime(0, nextTime);
        bassGain.gain.linearRampToValueAtTime(0.05, nextTime + 0.03);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, nextTime + 1.1);
        bassGain.connect(master);
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = midiToFreq(bass);
        osc.connect(bassGain);
        osc.start(nextTime);
        osc.stop(nextTime + 1.15);
      }
      nextTime += beats * BEAT;
      nextIndex = (nextIndex + 1) % MELODY.length;
    }
  }

  function start() {
    if (playing) return true;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    nextIndex = 0;
    barIndex = 0;
    nextTime = ctx.currentTime + 0.08;
    timer = setInterval(scheduleAhead, 120);
    scheduleAhead();
    playing = true;
    return true;
  }

  function stop() {
    if (!playing) return false;
    playing = false;
    clearInterval(timer);
    timer = null;
    const closing = ctx;
    ctx = null;
    master = null;
    closing?.close().catch(() => {});
    return false;
  }

  // Pause the clock while the tab is hidden so the tune resumes in place
  // instead of racing ahead silently.
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else if (playing) ctx.resume().catch(() => {});
  });

  return {
    toggle() {
      return playing ? stop() : start();
    },
    stop,
    isPlaying() {
      return playing;
    },
  };
}
