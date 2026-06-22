import { inject } from "@utils";
import audioCaptureInjectPath from "../audioCapture?script&module";

export function initAudioVisualizerBridge(): void {
  // Inject audio capture script for wave visualizer
  // Chạy trong embed iframe page context → chờ lệnh START → capture audio → gửi FFT data
  inject(audioCaptureInjectPath);

  // Bridge: forward messages giữa inject script (page context) ↔ parent window (main app)
  // audioCapture.ts chạy trong page context, gửi postMessage → content script nhận → forward lên parent
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data?.type) return;

    // Forward audio data + ACK + heartbeat từ inject script lên parent (main app)
    if (
      data.type === "VTUBERVN_AUDIO_DATA" ||
      data.type === "VTUBERVN_AUDIO_CAPTURE_ACK" ||
      data.type === "VTUBERVN_AUDIO_CAPTURE_HEARTBEAT"
    ) {
      try {
        window.parent.postMessage(data, "*");
      } catch (_) {}
    }

    // Forward START/STOP commands từ parent xuống inject script (page context)
    // Main app gửi postMessage tới iframe.contentWindow → content script nhận → forward vào page context
    if (
      data.type === "VTUBERVN_AUDIO_CAPTURE_START" ||
      data.type === "VTUBERVN_AUDIO_CAPTURE_STOP"
    ) {
      if (event.source !== window) {
        window.postMessage(data, "*");
      }
    }
  });
}
