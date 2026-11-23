// A classic worker is required by MediaPipe for its runtime importScripts call.
let detector;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      const { loadHandDetector } = await import('./gestures.js');
      detector = await loadHandDetector();
      self.postMessage({ result: 'ready' });
      return;
    }
    const { landmarks, worldLandmarks } = detector.detectForVideo(data.bitmap, data.now);
    self.postMessage({ result: { landmarks, worldLandmarks } });
  } catch (error) {
    self.postMessage({ error: error.message || 'Hand detection failed' });
  } finally {
    data.bitmap?.close();
  }
};
