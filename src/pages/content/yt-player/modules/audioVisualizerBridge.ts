import { inject } from "@utils";
import audioCaptureInjectPath from "../audioCapture?script&module";

export function initAudioVisualizerBridge(): void {
  // Inject audio capture script for audio wave visualizer
  // Executes in embed iframe page context -> waits for START -> captures Web Audio -> streams FFT data
  inject(audioCaptureInjectPath);

  // Bridge: forward messages between inject script (page context) <-> parent window (host app)
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data?.type) return;

    // Forward audio data, ACK, and heartbeat from inject script to parent host app
    if (
      data.type === "VTUBERVN_AUDIO_DATA" ||
      data.type === "VTUBERVN_AUDIO_CAPTURE_ACK" ||
      data.type === "VTUBERVN_AUDIO_CAPTURE_HEARTBEAT"
    ) {
      try {
        window.parent.postMessage(data, "*");
      } catch (_) {}
    }

    // Forward START/STOP control commands from parent down to inject script in page context
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
