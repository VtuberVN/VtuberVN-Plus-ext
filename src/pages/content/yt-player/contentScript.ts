/* eslint-disable no-inner-declarations */
import { Options, sha1, validOrigin, inject } from "@utils";
// import injectPath from "./injectPlayer?script&module";
import audioCaptureInjectPath from "./audioCapture?script&module";

const videoId = window.location.pathname.split("/").slice(-1)[0];

// TODO: Optimize fetch audio, or move to a TLSync specific extension
// if (videoId) {
//   console.log(inject, injectPath);
//   inject(injectPath);
// }

// Inject audio capture script for wave visualizer
// Chạy trong embed iframe page context → chờ lệnh START → capture audio → gửi FFT data
inject(audioCaptureInjectPath);

// ─── NATIVE YOUTUBE UI FAST-HIDE (800ms) ──────────────────────────────────────
// Hỗ trợ cả Desktop (.html5-video-player) và Mobile/Embedded (#player-control-overlay).
let fastHideTimer: ReturnType<typeof setTimeout> | null = null;
const FAST_HIDE_DELAY = 800; // ms

function forceHideUI() {
  // 1. Desktop layout
  const player = document.querySelector('.html5-video-player');
  if (player) {
    player.classList.add('ytp-autohide');
  }

  // 2. Mobile/Embed layout mới (ytm / ytw)
  const overlay = document.querySelector('#player-control-overlay');
  if (overlay) {
    overlay.classList.remove('fadein');
    overlay.classList.add('fadeout');

    const progressBar = document.querySelector('yt-progress-bar');
    if (progressBar) {
      (progressBar as HTMLElement).style.opacity = '0';
      (progressBar as HTMLElement).style.transition = 'opacity 0.5s ease-in-out';
    }
  }
}

function resetFastHide() {
  if (fastHideTimer) clearTimeout(fastHideTimer);

  // Hiển thị lại UI
  const overlay = document.querySelector('#player-control-overlay');
  if (overlay) {
    overlay.classList.remove('fadeout');
    overlay.classList.add('fadein');

    const progressBar = document.querySelector('yt-progress-bar');
    if (progressBar) {
      (progressBar as HTMLElement).style.opacity = '1';
    }
  }

  const video = document.querySelector('video');
  // Không tự động ẩn nếu video đang dừng
  if (video && !video.paused) {
    fastHideTimer = setTimeout(forceHideUI, FAST_HIDE_DELAY);
  }
}

// Bắt sự kiện trên document (dùng capture để lấy event sớm nhất, không sợ Youtube nuốt event)
document.addEventListener('mousemove', (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target && typeof target.closest === 'function') {
    // Nếu chuột đang nằm trong khu vực Control Bar (thanh tiến trình, nút play...) -> KHÔNG ẨN
    if (target.closest('.ytp-chrome-bottom, .ytp-chrome-top, player-top-controls, player-middle-controls, player-bottom-controls, yt-progress-bar, .player-controls-bottom, .player-controls-top')) {
      if (fastHideTimer) clearTimeout(fastHideTimer);
      
      const overlay = document.querySelector('#player-control-overlay');
      if (overlay) {
        overlay.classList.remove('fadeout');
        overlay.classList.add('fadein');
        const progressBar = document.querySelector('yt-progress-bar');
        if (progressBar) {
          (progressBar as HTMLElement).style.opacity = '1';
        }
      }
      return;
    }
  }
  
  // Nếu chuột di chuyển trong khu vực video, reset lại bộ đếm 800ms
  resetFastHide();
}, { capture: true, passive: true });

document.addEventListener('mouseleave', () => {
  if (fastHideTimer) clearTimeout(fastHideTimer);
  const video = document.querySelector('video');
  if (video && !video.paused) {
    // Rời chuột khỏi iframe -> Ẩn ngay lập tức sau 150ms
    fastHideTimer = setTimeout(forceHideUI, 150);
  }
}, { capture: true, passive: true });

document.addEventListener('play', resetFastHide, { capture: true });
document.addEventListener('playing', resetFastHide, { capture: true });
document.addEventListener('pause', resetFastHide, { capture: true });

// Bridge: forward messages giữa inject script (page context) ↔ parent window (main app)
// audioCapture.ts chạy trong page context, gửi postMessage → content script nhận → forward lên parent
window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data?.type) return;

  // Forward audio data + ACK + heartbeat từ inject script lên parent (main app)
  if (data.type === 'VTUBERVN_AUDIO_DATA' || data.type === 'VTUBERVN_AUDIO_CAPTURE_ACK' || data.type === 'VTUBERVN_AUDIO_CAPTURE_HEARTBEAT') {
    try {
      window.parent.postMessage(data, '*');
    } catch (_) {}
  }

  // Forward START/STOP commands từ parent xuống inject script (page context)
  // Main app gửi postMessage tới iframe.contentWindow → content script nhận → forward vào page context
  if (data.type === 'VTUBERVN_AUDIO_CAPTURE_START' || data.type === 'VTUBERVN_AUDIO_CAPTURE_STOP') {
    if (event.source !== window) {
      window.postMessage(data, '*');
    }
  }
});

window.addEventListener("message", async (event) => {
  if (validOrigin(event.origin)) {
    if (event.data?.event === "likeVideo") {
      if (!(await Options.get("remoteYoutubeLikeButton"))) return;
      console.log("[VtuberVN+] Liking the video");
      const res = await like();

      // Show an indicator based on the response
      const indicator = document.createElement("div");
      indicator.style.position = "fixed";
      indicator.style.bottom = "20px";
      indicator.style.right = "20px";
      indicator.style.padding = "10px 20px";
      indicator.style.borderRadius = "5px";
      indicator.style.color = "white";
      indicator.style.fontSize = "14px";
      indicator.style.zIndex = "9999";
      indicator.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
      indicator.style.transition = "opacity 0.3s ease-in-out";
      indicator.style.opacity = "1";

      if (res) {
        indicator.style.backgroundColor = "#4CAF50"; // Green for success
        indicator.innerText = "Video liked!";
      } else {
        indicator.style.backgroundColor = "#F44336"; // Red for failure
        indicator.innerText = "Failed to like the video.";
      }

      document.body.appendChild(indicator);

      // Remove the indicator after 3 seconds
      setTimeout(() => {
        indicator.style.opacity = "0";
        setTimeout(() => indicator.remove(), 300); // Wait for fade-out transition
      }, 3000);
    }
  }
});

async function getYtLikeData() {
  const doc = await fetch(`https://www.youtube.com/watch?v=${ videoId }`).then(
    (r) => r.text(),
  );
  const apiKey = doc.match(/"INNERTUBE_API_KEY":"(.*?)"/)?.[1];
  const context = JSON.parse(
    (doc.match(/\(\{"INNERTUBE_CONTEXT":([\w\W]*?)}\)/) ||
      doc.match(/"INNERTUBE_CONTEXT":([\w\W]*?}),"INNERTUBE/))?.[1] ?? "{}",
  );
  const ytClientName = doc.match(/"INNERTUBE_CONTEXT_CLIENT_NAME":(\d+),/)?.[1];
  const ytClientVersion = doc.match(
    /"INNERTUBE_CONTEXT_CLIENT_VERSION":"(.*?)"/,
  )?.[1];
  const pageId = doc.match(/"DELEGATED_SESSION_ID":"(.*?)"/)?.[1];
  const likeParams = doc.match(/"likeParams":"(.*?)"/)?.[1];
  const removeLikeParams = doc.match(/"removeLikeParams":"(.*?)"/)?.[1];
  const PAPISID = document.cookie.match(/3PAPISID=([^;]*);?.*$/)?.[1];
  if (
    !apiKey ||
    Object.keys(context).length === 0 ||
    !ytClientName ||
    !ytClientVersion ||
    // !pageId ||
    !likeParams ||
    !PAPISID
  ) {
    return null;
  }
  return {
    apiKey,
    context,
    ytClientName,
    ytClientVersion,
    pageId,
    likeParams,
    removeLikeParams,
    PAPISID,
  };
}

async function like() {
  const ytLikeData = await getYtLikeData();
  if (!ytLikeData) return false;
  const {
    apiKey,
    context,
    pageId,
    ytClientName,
    ytClientVersion,
    PAPISID,
    likeParams,
  } = ytLikeData;
  const nowTime = Math.floor(Date.now() / 1000);
  try {
    const res = await fetch(
      `https://www.youtube.com/youtubei/v1/like/like?key=${ apiKey }`,
      {
        method: "POST",
        referrer: `https://youtube.com/watch?v=${ videoId }`,
        mode: "same-origin",
        referrerPolicy: "origin-when-cross-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-AuthUser": "0",
          "X-Goog-Visitor-Id": context.client.visitorData,
          ...(pageId && { "X-Goog-PageId": pageId }),
          "X-Youtube-Client-Name": ytClientName,
          "X-Youtube-Client-Version": ytClientVersion,
          "X-Origin": "https://www.youtube.com",
          "SEC-CH-UA-ARCH": "x86",
          "sec-ch-ua-platform-version": "10.0.0",
          "sec-ch-ua-full-version": "93.0.4577.82",
          Authorization: `SAPISIDHASH ${ nowTime }_${ await sha1(
            `${ nowTime } ${ PAPISID } https://www.youtube.com`,
          ) }`,
        },
        body: JSON.stringify({
          context,
          target: { videoId },
          params: likeParams,
        }),
      },
    ).then(async (r) => ({ status: r.status, body: await r.text() }));
    if (res.status === 200) {
      return true;
    }
  } catch (e) {
    console.error("[VtuberVN+] Error while sending like:", e);
  }
  return false;
}
