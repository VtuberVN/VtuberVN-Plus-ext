/**
 * [VtuberVN+] Audio Capture & Visualizer Bridge
 *
 * Chạy BÊN TRONG YouTube embed iframe (injected vào page context).
 * KHÔNG TỰ ĐỘNG CHẠY — chỉ bắt đầu capture khi nhận message
 * VTUBERVN_AUDIO_CAPTURE_START từ main app.
 *
 * Mỗi instance có sessionId riêng để main app phân biệt
 * iframe music player vs iframe live/video khác.
 *
 * Flow:
 *   Main app gửi START (kèm sessionId) → chỉ đúng iframe music player nhận
 *   → captureStream() + AnalyserNode → gửi FFT data kèm sessionId
 *   → Main app filter theo sessionId → render visualizer
 */

console.log('[VtuberVN+] Audio Capture: Loaded (standby mode)');

const FFT_SIZE = 128;       // 64 frequency bins — nhẹ hơn, đủ cho visualizer
const ACTIVE_FPS = 60;      // Khi mở sóng nhạc (mượt mà)
const BACKGROUND_FPS = 5;   // Khi bị khuất / ẩn / thu nhỏ (tiết kiệm CPU)
const HEARTBEAT_INTERVAL = 5000; // Gửi heartbeat mỗi 5 giây

// Trạng thái hiển thị để áp dụng Adaptive FPS dựa trên VisibilityState của tab
let isDocumentVisible = document.visibilityState === 'visible';

document.addEventListener('visibilitychange', () => {
  isDocumentVisible = document.visibilityState === 'visible';
});

function getIsVisible() {
  return isDocumentVisible;
}

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
let captureLoopTimer: ReturnType<typeof setTimeout> | null = null;
let animationFrameId: number | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let lastFrameTime = 0;
let isCapturing = false;
let currentSessionId: string | null = null;
let capturedVideo: HTMLVideoElement | null = null;

/**
 * Tìm <video> element trong YouTube embed.
 */
function findVideoElement(): HTMLVideoElement | null {
  const video = document.querySelector('video.html5-main-video') as HTMLVideoElement | null;
  if (video) return video;
  return document.querySelector('video') as HTMLVideoElement | null;
}

/**
 * Thiết lập AudioContext + AnalyserNode từ video element.
 * Guard: nếu sourceNode đã tồn tại cho đúng video này → reuse, không tạo lại.
 * createMediaElementSource() chỉ được gọi 1 lần trên mỗi video element.
 */
function setupAudioCapture(video: HTMLVideoElement): boolean {
  // Đã setup đúng video này và tất cả node vẫn live → reuse hoàn toàn
  if (capturedVideo === video && audioContext && analyser && sourceNode) {
    isCapturing = true
    return true
  }

  try {
    // Tạo AudioContext nếu chưa có hoặc đã bị close
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    if (!analyser) {
      analyser = audioContext.createAnalyser()
      analyser.fftSize = FFT_SIZE
      analyser.smoothingTimeConstant = 0.8
    }

    // Chỉ tạo sourceNode MỚI khi video thay đổi hoặc chưa có
    // Tránh gọi createMediaElementSource 2 lần trên cùng 1 video → InvalidStateError
    if (capturedVideo !== video || !sourceNode) {
      if (sourceNode) {
        try { sourceNode.disconnect() } catch (_) {}
        sourceNode = null
      }
      sourceNode = audioContext.createMediaElementSource(video)
      sourceNode.connect(analyser)
      analyser.connect(audioContext.destination)
      capturedVideo = video

      // Tự động resume AudioContext khi video phát
      const resumeContext = () => {
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            console.log('[VtuberVN+] Audio Capture: AudioContext resumed via video event')
          }).catch((err) => {
            console.warn('[VtuberVN+] Audio Capture: Resume failed via video event -', err)
          })
        }
      }

      video.addEventListener('play', resumeContext)
      video.addEventListener('playing', resumeContext)
      video.addEventListener('timeupdate', resumeContext, { once: true })
    }

    isCapturing = true
    console.log('[VtuberVN+] Audio Capture: Attached to video element', video)
    return true
  } catch (err) {
    console.warn('[VtuberVN+] Audio Capture: Setup failed -', err)
    // KHÔNG gọi cleanup() ở đây — chỉ reset isCapturing
    isCapturing = false
    return false
  }
}

/**
 * Vòng lặp gửi frequency data lên parent window.
 * Adaptive FPS dựa trên trạng thái hoạt động của tab:
 * - Luôn sử dụng setTimeout thay vì requestAnimationFrame vì iframe ẩn (được set bằng visibility: hidden)
 *   có thể bị trình duyệt tạm dừng/chặn rAF hoàn toàn.
 * - Chạy ở ACTIVE_FPS (60 FPS) khi tab đang hiển thị, hoặc BACKGROUND_FPS (5 FPS) khi tab ẩn xuống nền.
 * Mỗi message kèm sessionId để main app filter đúng nguồn.
 */
function sendAudioData() {
  if (captureLoopTimer !== null) {
    clearTimeout(captureLoopTimer);
    captureLoopTimer = null;
  }
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  const visible = getIsVisible();
  const currentFps = visible ? ACTIVE_FPS : BACKGROUND_FPS;
  const frameInterval = 1000 / currentFps;

  // Luôn dùng setTimeout để tránh bị trình duyệt tạm dừng rAF do iframe ẩn
  captureLoopTimer = setTimeout(sendAudioData, frameInterval);

  const timestamp = performance.now();
  if (timestamp - lastFrameTime < frameInterval - 5) return;
  lastFrameTime = timestamp;

  // Liên tục kiểm tra xem video có bị YouTube thay thế (re-render DOM) không
  const currentVideo = findVideoElement();
  if (currentVideo && currentVideo !== capturedVideo) {
    console.log('[VtuberVN+] Audio Capture: Video element replaced, re-attaching...');
    setupAudioCapture(currentVideo);
  }

  if (!analyser || !audioContext || !currentSessionId) return;

  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
    return;
  }

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  try {
    window.parent.postMessage({
      type: 'VTUBERVN_AUDIO_DATA',
      sessionId: currentSessionId,
      frequencyData: Array.from(dataArray),
      bufferLength,
    }, '*');
  } catch (_) {
    // Cross-origin — bỏ qua
  }
}

function startCapture(sessionId: string) {
  // Cùng session → skip
  if (captureLoopTimer !== null && currentSessionId === sessionId) return;

  // Dừng rAF loop + heartbeat cũ (giữ nguyên AudioContext/sourceNode)
  if (captureLoopTimer !== null) {
    clearTimeout(captureLoopTimer);
    captureLoopTimer = null;
  }
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  currentSessionId = sessionId;
  lastFrameTime = 0;

  // Resume AudioContext nếu bị suspended (do đổi bài / autoplay policy)
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }

  const video = findVideoElement();
  if (!video) {
    console.warn('[VtuberVN+] Audio Capture: No video element found');
    waitForVideoThenStart(sessionId);
    return;
  }

  // setupAudioCapture kiểm tra isCapturing → trả true nếu đã setup rồi (không tạo lại AudioContext)
  if (setupAudioCapture(video)) {
    // Khởi động loop
    sendAudioData();
    startHeartbeat(sessionId);
    console.log(`[VtuberVN+] Audio Capture: ${isCapturing ? 'Restarted' : 'Started'} (session: ${sessionId})`);

    try {
      window.parent.postMessage({
        type: 'VTUBERVN_AUDIO_CAPTURE_ACK',
        sessionId,
        status: 'started',
      }, '*');
    } catch (_) {}
  }
}

function startHeartbeat(sessionId: string) {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    if (currentSessionId !== sessionId) {
      clearInterval(heartbeatTimer!);
      heartbeatTimer = null;
      return;
    }
    try {
      window.parent.postMessage({
        type: 'VTUBERVN_AUDIO_CAPTURE_HEARTBEAT',
        sessionId,
      }, '*');
    } catch (_) {}
  }, HEARTBEAT_INTERVAL);
}

function waitForVideoThenStart(sessionId: string) {
  const observer = new MutationObserver((_mutations, obs) => {
    const v = findVideoElement();
    if (v) {
      obs.disconnect();
      const handleReady = () => {
        if (currentSessionId === sessionId) {
          if (setupAudioCapture(v)) {
            sendAudioData();
            console.log(`[VtuberVN+] Audio Capture: Started (delayed, session: ${sessionId})`);
            try {
              window.parent.postMessage({
                type: 'VTUBERVN_AUDIO_CAPTURE_ACK',
                sessionId,
                status: 'started',
              }, '*');
            } catch (_) {}
          }
        }
      };

      if (!v.paused && v.readyState >= 2) {
        handleReady();
      } else {
        v.addEventListener('playing', handleReady, { once: true });
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 30000);
}

/**
 * Dừng vòng lặp capture và heartbeat — GIỮ NGUYÊN AudioContext/sourceNode.
 * Gọi khi user TẮT sóng nhạc, hoặc nhận STOP message.
 * Khi bật lại, AudioContext + sourceNode sẽ được REUSE, không tạo lại.
 */
function stopCapture() {
  if (captureLoopTimer !== null) {
    clearTimeout(captureLoopTimer)
    captureLoopTimer = null
  }
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  currentSessionId = null
  // KHÔNG reset isCapturing — AudioContext + sourceNode vẫn còn live
  // Giúp tránh InvalidStateError khi bật lại sóng nhạc
}

function cleanup() {
  stopCapture();
  if (sourceNode) {
    try { sourceNode.disconnect(); } catch (_) {}
    sourceNode = null;
  }
  if (analyser) {
    try { analyser.disconnect(); } catch (_) {}
    analyser = null;
  }
  if (audioContext) {
    try { audioContext.close(); } catch (_) {}
    audioContext = null;
  }
  isCapturing = false;
  capturedVideo = null;
}

/**
 * Lắng nghe lệnh START/STOP từ main app.
 * STOP chỉ dừng loop — KHÔNG close AudioContext.
 * cleanup() (đóng AudioContext) chỉ xảy ra khi beforeunload.
 */
window.addEventListener('message', (event) => {
  if (event.data?.type === 'VTUBERVN_AUDIO_CAPTURE_START' && event.data?.sessionId) {
    startCapture(event.data.sessionId)
  } else if (event.data?.type === 'VTUBERVN_AUDIO_CAPTURE_STOP') {
    stopCapture()
    console.log('[VtuberVN+] Audio Capture: Paused (AudioContext preserved for reuse)')
  }
})

window.addEventListener('beforeunload', cleanup)
