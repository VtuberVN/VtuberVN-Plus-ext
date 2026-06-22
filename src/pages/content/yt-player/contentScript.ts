import { initLocale } from "./modules/context";
import { initFastHideUI } from "./modules/fastHideUI";
import { initAudioVisualizerBridge } from "./modules/audioVisualizerBridge";
import { initCrowdsourcing } from "./modules/crowdsourcing";
import { initApiHandlers } from "./modules/apiHandlers";

// Khởi tạo các tính năng chính của Extension sau khi đồng bộ ngôn ngữ thành công
initLocale().then(() => {
  initFastHideUI();
  initAudioVisualizerBridge();
  initCrowdsourcing();
  initApiHandlers();
});
