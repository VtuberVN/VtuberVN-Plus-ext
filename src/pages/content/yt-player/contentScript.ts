import { initLocale } from "./modules/context";
import { initFastHideUI } from "./modules/fastHideUI";
import { initAudioVisualizerBridge } from "./modules/audioVisualizerBridge";
import { initCrowdsourcing } from "./modules/crowdsourcing";
import { initApiHandlers } from "./modules/apiHandlers";

if (!import.meta.env.DEV) {
  console.log = () => {};
  console.debug = () => {};
}

console.log("[VtuberVN+ Lite] yt-player content script is loading in iframe:", window.location.href);

// Initialize core features after locale synchronization
initLocale().then(() => {
  initFastHideUI();
  initAudioVisualizerBridge();
  initCrowdsourcing();
  initApiHandlers();
});
