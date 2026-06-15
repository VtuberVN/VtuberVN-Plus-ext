// @ts-ignore
window.ARCHIVE_CHAT_OVERRIDE = true;
// @ts-ignore
window.HOLODEX_PLUS_INSTALLED = true;
// @ts-ignore
window.VtuberVN_PLUS_INSTALLED_V3 = true;
// @ts-ignore — Audio Visualizer: cho main app biết extension hỗ trợ capture audio data
window.VtuberVN_AUDIO_VISUALIZER_SUPPORTED = true;

console.log("[VtuberVN+] Activated");

// ─── Audio Visualizer Bridge ──────────────────────────────────────
// Forward audio data từ YouTube embed iframes lên main page context.
//
// Architecture (giải quyết vấn đề multi-iframe):
//   - audioCapture.ts inject vào MỌI YouTube embed iframe
//   - Nhưng CHỈ iframe nào nhận được START command mới capture
//   - Main app gửi START trực tiếp tới iframe music player (qua iframeRef)
//   - Audio data kèm sessionId để main app filter đúng nguồn
//   - Iframe live stream / video embed KHÔNG bị ảnh hưởng

window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data?.type) return;

  // Forward audio data + ACK + heartbeat từ iframe lên main page (dispatch CustomEvent)
  if (data.type === 'VTUBERVN_AUDIO_DATA' || data.type === 'VTUBERVN_AUDIO_CAPTURE_ACK' || data.type === 'VTUBERVN_AUDIO_CAPTURE_HEARTBEAT') {
    window.dispatchEvent(new CustomEvent('vtubervn-audio-data', {
      detail: data,
    }));
  }
});

export {};
