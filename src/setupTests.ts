// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom doesn't implement Web Audio API — provide minimal stubs so components
// that call getAC() on mount don't crash the test renderer.
class AudioContextStub {
  createGain() { return { gain: { value: 0 }, connect: () => {} }; }
  createDelay() { return { delayTime: { value: 0 }, connect: () => {} }; }
  createBufferSource() {
    return { playbackRate: { value: 1 }, connect: () => {}, start: () => {}, stop: () => {} };
  }
  decodeAudioData() { return Promise.reject(new Error('stub')); }
}
Object.defineProperty(window, 'AudioContext', { value: AudioContextStub, writable: true });
Object.defineProperty(window, 'webkitAudioContext', { value: AudioContextStub, writable: true });
