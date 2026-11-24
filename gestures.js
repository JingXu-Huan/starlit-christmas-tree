/* The 21 MediaPipe hand landmarks are ordered from wrist to fingertips. */
const length = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const baseURL = new URL('./vendor/mediapipe/', import.meta.url);
const distanceRatio = (a, b, scale) => length(a, b) / scale;

function fingerExtended(points, tip, scale) {
  const joint = points[tip - 2];
  const end = points[tip];
  const knuckle = points[tip - 3];
  // Relaxed again from 0.12/1.32: a slightly bent finger was still read
  // as folded, which made palm rotation drop out mid-gesture.
  return length(end, points[0]) > length(joint, points[0]) + scale * 0.10
    && length(end, knuckle) > length(joint, knuckle) * 1.25;
}

// Exponential smoothing over successive landmark sets. Raw MediaPipe
// landmarks jitter frame to frame; smoothing them before classification
// stops a single noisy frame from breaking a pinch or a palm.
function smoothLandmarks(previous, current, alpha) {
  if (!previous) return current.map(v => ({...v}));
  return current.map((v, i) => ({
    x: previous[i].x + (v.x - previous[i].x) * alpha,
    y: previous[i].y + (v.y - previous[i].y) * alpha,
    z: (previous[i].z ?? 0) + ((v.z ?? 0) - (previous[i].z ?? 0)) * alpha,
  }));
}

export function createGestureInterpreter({ onDoublePinch, onFist, onRotate, onStatus, onFrame, onPose }) {
  let lastStatus;
  let lastSeen = -Infinity;
  let firstPinch, candidateSince, fistSince, palmX, lastPalmX;
  let pinched, fistFired, cooldownUntil;
  let smoothImage = null, smoothWorld = null, absentSent = false;
  // Definitive hand pose, emitted only on change: 'fist' | 'palm' | 'idle' | 'absent'.
  // Transient frames do not emit, so the tree does not flicker between
  // gathered and expanded while the hand is moving between poses.
  let pose = 'absent';
  function emitPose(next) {
    if (next === pose) return;
    pose = next;
    onPose?.(next);
  }
  function reset() {
    firstPinch = candidateSince = fistSince = palmX = lastPalmX = null;
    pinched = fistFired = false;
    cooldownUntil = 0;
    smoothImage = smoothWorld = null;
  }
  function status(value) {
    if (value === lastStatus) return;
    lastStatus = value;
    onStatus?.(value);
  }
  reset();
  return function process(result, now, aspect = 1) {
    const image = result.landmarks?.[0];
    if (!image) {
      if (now - lastSeen > 300) {
        reset();
        status('等待手掌进入画面');
        emitPose('absent');
        if (!absentSent) { absentSent = true; onFrame?.({present: false}); }
      }
      return;
    }
    absentSent = false;
    if (now - lastSeen > 300) reset();
    lastSeen = now;
    // World coordinates are metric and preserve proportions as the hand turns.
    const rawWorld = result.worldLandmarks?.[0] ?? image.map(v => ({
      x: v.x * aspect, y: v.y, z: (v.z ?? 0) * aspect
    }));
    // Less smoothing (0.65 instead of 0.5): the old value lagged a fast
    // hand movement by a frame or two and gestures felt unresponsive.
    smoothImage = smoothLandmarks(smoothImage, image, .65);
    smoothWorld = smoothLandmarks(smoothWorld, rawWorld, .65);
    const p = smoothWorld;
    const scale = (length(p[0], p[9]) + length(p[5], p[17])) * 0.5;
    if (scale < 0.00001) return;
    const extended = [8, 12, 16, 20].map(tip => fingerExtended(p, tip, scale));
    const folded = [8, 12, 16, 20].map((tip, i) =>
      !extended[i] && length(p[tip], p[0]) < length(p[tip - 2], p[0]) + scale * 0.11);
    const fist = folded.every(Boolean);
    // Pinch uses the raw landmarks, not the smoothed ones: smoothing lags
    // a fast pinch by a frame or two and a quick double pinch was missed.
    const rawScale = (length(rawWorld[0], rawWorld[9]) + length(rawWorld[5], rawWorld[17])) * 0.5;
    const pinchGap = distanceRatio(rawWorld[4], rawWorld[8], rawScale);
    // Live preview data: the UI draws the skeleton and the pinch meter from
    // this, so the user can see whether the hand is actually being tracked.
    onFrame?.({
      present: true,
      landmarks: smoothImage,
      pinchGap, pinched, fist,
      extendedCount: extended.filter(Boolean).length,
      handScale: scale,
      distance: scale < 0.055 ? 'far' : scale > 0.115 ? 'near' : 'ok',
    });

    if (fist) {
      palmX = lastPalmX = candidateSince = null;
      fistSince ??= now;
      // Same hold as the fist action: a passing folded hand does not gather.
      // 100 ms instead of 150: the fist is a deliberate pose, and the
      // extra 50 ms was the most noticeable part of the delay.
      if (now - fistSince >= 100) emitPose('fist');
      if (now - fistSince >= 100 && !fistFired) {
        firstPinch = null;
        pinched = true;
        fistFired = true;
        status('已识别握拳');
        onFist?.();
      }
      return;
    }
    fistSince = null;
    fistFired = false;

    // Two distinct closing edges, separated by a genuine release. Different
    // closing and opening thresholds suppress tremor near fingertip contact.
    // The window for the second pinch is 1.6s: a deliberately slow double
    // pinch was previously expiring before the second close.
    if (firstPinch !== null && now - firstPinch > 1600) firstPinch = null;
    // Closing at 0.34 and opening at 0.48 instead of 0.31/0.53: a pinch
    // no longer needs the fingertips to touch, and the release that
    // separates two pinches is shorter.
    const transition = pinched ? pinchGap > 0.48 : pinchGap < 0.34;
    if (transition) {
      candidateSince ??= now;
      if (now - candidateSince >= 18) {
        candidateSince = null;
        pinched = !pinched;
        if (pinched && now >= cooldownUntil) {
          if (firstPinch !== null && now - firstPinch >= 60) {
            firstPinch = null;
            cooldownUntil = now + 240;
            status('已识别双捏合');
            onDoublePinch?.();
          } else {
            firstPinch = now;
          }
        }
      }
    } else {
      candidateSince = null;
    }

    if (now < cooldownUntil) {
      palmX = lastPalmX = null;
      return;
    }
    if (firstPinch !== null) {
      palmX = lastPalmX = null;
      status('再捏合一次');
      return;
    }
    // Three extended fingers are enough for a palm: requiring all four
    // dropped rotation whenever the little finger curled slightly.
    if (extended.filter(Boolean).length >= 3 && !pinched && pinchGap > 0.44) {
      emitPose('palm');
      // A front-facing camera shows mirrored movement to the person using it.
      const x = 1 - (smoothImage[0].x + smoothImage[9].x + smoothImage[5].x + smoothImage[17].x) / 4;
      palmX = palmX === null ? x : palmX + (x - palmX) * 0.70;
      if (lastPalmX !== null && Math.abs(palmX - lastPalmX) > 0.0008) {
        const movement = Math.max(-0.11, Math.min(0.11, palmX - lastPalmX));
        onRotate?.(movement * 7);
        lastPalmX = palmX;
      }
      lastPalmX ??= palmX;
      status('已张掌 · 左右移动');
    } else {
      palmX = lastPalmX = null;
      emitPose('idle');
      status('手部已就绪');
    }
  };
}

// Shared by the UI fallback and the classic worker. MediaPipe's WASM loader
// uses importScripts in workers, which module workers do not support.
export async function loadHandDetector() {
  const { FilesetResolver, HandLandmarker } = await import('./vendor/mediapipe/vision_bundle.mjs');
  const fileset = await FilesetResolver.forVisionTasks(new URL('wasm', baseURL).href);
  const options = {
    baseOptions: { modelAssetPath: new URL('hand_landmarker.task', baseURL).href, delegate: 'GPU' },
    runningMode: 'VIDEO', numHands: 1,
    // 0.4 instead of 0.5: hands further away or in dimmer light were being
    // missed entirely, and a missed frame reads as unresponsiveness.
    // Temporal smoothing in the interpreter, not a high threshold, is
    // what keeps the gestures stable.
    minHandDetectionConfidence: 0.4, minHandPresenceConfidence: 0.4, minTrackingConfidence: 0.4
  };
  try {
    return await HandLandmarker.createFromOptions(fileset, options);
  } catch {
    options.baseOptions.delegate = 'CPU';
    return HandLandmarker.createFromOptions(fileset, options);
  }
}

function workerClient() {
  const worker = new Worker(new URL('./gesture-worker.js', import.meta.url));
  let active = null;
  let stopped = false;
  function close() {
    if (stopped) return;
    stopped = true;
    worker.terminate();
    active?.reject(new Error('Gesture worker stopped'));
    active = null;
  }
  worker.onerror = event => {
    event.preventDefault();
    close();
  };
  worker.onmessageerror = close;
  worker.onmessage = ({ data }) => {
    if (!active) return;
    if (data.error) active.reject(new Error(data.error));
    else active.resolve(data.result);
    active = null;
  };
  // Only the next fresh video frame is captured after the previous reply.
  function request(message, transfer = []) {
    if (stopped || active) return Promise.reject(new Error('Gesture worker unavailable'));
    const timeout = setTimeout(close, message.type === 'init' ? 45000 : 10000);
    return new Promise((resolve, reject) => {
      active = { resolve, reject };
      try {
        worker.postMessage(message, transfer);
      } catch (error) {
        active = null;
        reject(error);
      }
    }).finally(() => clearTimeout(timeout));
  }
  return { request, close };
}

function release(session) {
  cancelAnimationFrame(session.frame);
  session.worker?.close();
  session.stream?.getTracks().forEach(track => track.stop());
  if (session.video) {
    session.video.pause();
    session.video.srcObject = null;
    session.video.remove();
  }
  session.detector?.close();
}

function cameraMessage(error, stage) {
  if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
    return '摄像头权限受限，请允许访问摄像头后重试。';
  }
  if (error.name === 'NotFoundError') return '未找到摄像头，请连接摄像头后重试。';
  if (error.name === 'NotReadableError') return '摄像头正被占用，请关闭其他视频应用后重试。';
  if (error.name === 'AbortError') return '摄像头启动中断，请重新开启。';
  if (stage === 'model') return '手势模型加载失败，请刷新后重试。';
  return '无法启动摄像头，请检查设备和浏览器权限。';
}

export function createGestures(handlers = {}) {
  let current = null;
  function stop() {
    const session = current;
    current = null;
    if (session) release(session);
    handlers.onStatus?.('手势控制已关闭');
  }
  function fail(session, message) {
    if (current !== session) return;
    stop();
    handlers.onStatus?.(message);
    handlers.onError?.(new Error(message));
  }
  async function startSession(session) {
    if (!navigator.mediaDevices?.getUserMedia) {
      current = null;
      const error = new Error('当前浏览器无法访问摄像头，请通过 HTTPS 在浏览器中打开。');
      handlers.onStatus?.(error.message);
      throw error;
    }
    let stage = 'camera';
    try {
      handlers.onStatus?.('正在开启摄像头');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        // 720p gives the landmarker more pixels for a hand held at arm's
        // length; inference still runs in a worker, off the animation thread.
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 45 } }
      });
      if (session !== current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      session.stream = stream;
      const video = document.createElement('video');
      session.video = video;
      video.playsInline = true;
      video.muted = true;
      video.setAttribute('aria-hidden', 'true');
      video.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:.001;pointer-events:none';
      document.body.append(video);
      video.srcObject = stream;
      await video.play();
      if (session !== current) return;
      stage = 'model';
      handlers.onStatus?.('正在加载手势模型');
      stream.getVideoTracks()[0]?.addEventListener('ended',
        () => fail(session, '摄像头连接已断开，请重新开启。'), { once: true });
      const process = createGestureInterpreter(handlers);
      let lastVideoTime = -1, lastFrame = -Infinity, frameInterval = 26;
      async function useMainThread() {
        session.worker?.close();
        session.worker = null;
        const detector = await loadHandDetector();
        if (session !== current) {
          detector.close();
          return;
        }
        session.detector = detector;
        frameInterval = 40;
      }
      if (typeof Worker === 'function' && typeof createImageBitmap === 'function'
          && typeof OffscreenCanvas === 'function') {
        try {
          session.worker = workerClient();
          await session.worker.request({ type: 'init' });
        } catch {
          if (session !== current) return;
          await useMainThread();
        }
      } else {
        await useMainThread();
      }
      if (session !== current) return;

      async function tick(now) {
        if (session !== current) return;
        if (video.readyState >= 2 && video.currentTime !== lastVideoTime && now - lastFrame >= frameInterval) {
          lastVideoTime = video.currentTime;
          lastFrame = now;
          let bitmap;
          try {
            let result;
            if (session.worker) {
              bitmap = await createImageBitmap(video);
              if (session !== current) return;
              result = await session.worker.request({ type: 'frame', bitmap, now }, [bitmap]);
            } else {
              const start = performance.now();
              result = session.detector.detectForVideo(video, now);
              // Allow time between blocking inference calls for animation.
              frameInterval = Math.min(150, Math.max(40, (performance.now() - start) * 3));
            }
            if (session !== current) return;
            process(result, now, video.videoWidth / video.videoHeight);
          } catch {
            if (session !== current) return;
            if (!session.worker) {
              fail(session, '手势识别中断，请重新开启摄像头。');
              return;
            }
            try {
              await useMainThread();
            } catch {
              fail(session, '手势识别中断，请重新开启摄像头。');
              return;
            }
          } finally {
            bitmap?.close();
          }
        }
        if (session === current) session.frame = requestAnimationFrame(tick);
      }
      handlers.onStatus?.('等待手掌进入画面');
      session.frame = requestAnimationFrame(tick);
    } catch (error) {
      if (session !== current) return;
      const message = cameraMessage(error, stage);
      stop();
      handlers.onStatus?.(message);
      throw new Error(message, { cause: error });
    }
  }
  return {
    start() {
      if (current) return current.ready;
      const session = { frame: 0 };
      current = session;
      session.ready = startSession(session);
      return session.ready;
    },
    stop
  };
}
