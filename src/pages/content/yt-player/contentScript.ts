import { initLocale } from "./modules/context";
import { initFastHideUI } from "./modules/fastHideUI";
import { initAudioVisualizerBridge } from "./modules/audioVisualizerBridge";
import { initCrowdsourcing } from "./modules/crowdsourcing";
import { initApiHandlers } from "./modules/apiHandlers";

console.log("[VtuberVN+] yt-player content script is loading in iframe:", window.location.href);

// Khởi tạo các tính năng chính của Extension sau khi đồng bộ ngôn ngữ thành công
initLocale().then(() => {
  initFastHideUI();
  initAudioVisualizerBridge();
  initCrowdsourcing();
  initApiHandlers();
});
