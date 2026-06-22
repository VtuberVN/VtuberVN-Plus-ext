import { inject } from "@utils";
import { storage } from "webextension-polyfill";
import injectPath from "./vtubervn-inject?script&module";

inject(injectPath);

// Nhận locale từ inject script → lưu vào storage cho popup đọc
window.addEventListener('message', (event) => {
  if (event.data?.type === 'VTUBERVN_LOCALE_SYNC' && event.data?.locale) {
    storage.local.set({ vtubervn_locale: event.data.locale });
  }
});
