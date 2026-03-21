declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

const AudioContextCtor: typeof AudioContext =
  window.AudioContext || window.webkitAudioContext;

let _ac: AudioContext | null = null;

export function getAC(): AudioContext {
  if (!_ac) _ac = new AudioContextCtor();
  return _ac;
}
