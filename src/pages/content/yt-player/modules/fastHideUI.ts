let fastHideTimer: ReturnType<typeof setTimeout> | null = null;
const FAST_HIDE_DELAY = 800; // ms

function forceHideUI() {
  // Desktop layout
  const player = document.querySelector(".html5-video-player");
  if (player) {
    player.classList.add("ytp-autohide");
  }

  // Mobile/Embed layout mới (ytm / ytw)
  const overlay = document.querySelector("#player-control-overlay");
  if (overlay) {
    overlay.classList.remove("fadein");
    overlay.classList.add("fadeout");

    const progressBar = document.querySelector("yt-progress-bar");
    if (progressBar) {
      (progressBar as HTMLElement).style.opacity = "0";
      (progressBar as HTMLElement).style.transition =
        "opacity 0.5s ease-in-out";
    }
  }
}

function resetFastHide() {
  if (fastHideTimer) clearTimeout(fastHideTimer);

  // Hiển thị lại UI
  const overlay = document.querySelector("#player-control-overlay");
  if (overlay) {
    overlay.classList.remove("fadeout");
    overlay.classList.add("fadein");

    const progressBar = document.querySelector("yt-progress-bar");
    if (progressBar) {
      (progressBar as HTMLElement).style.opacity = "1";
    }
  }

  const video = document.querySelector("video");
  // Không tự động ẩn nếu video đang dừng
  if (video && !video.paused) {
    fastHideTimer = setTimeout(forceHideUI, FAST_HIDE_DELAY);
  }
}

export function initFastHideUI(): void {
  // Bắt sự kiện trên document (dùng capture để lấy event sớm nhất, không sợ Youtube nuốt event)
  document.addEventListener(
    "mousemove",
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && typeof target.closest === "function") {
        // Nếu chuột đang nằm trong khu vực Control Bar (thanh tiến trình, nút play...) -> KHÔNG ẨN
        if (
          target.closest(
            ".ytp-chrome-bottom, .ytp-chrome-top, player-top-controls, player-middle-controls, player-bottom-controls, yt-progress-bar, .player-controls-bottom, .player-controls-top",
          )
        ) {
          if (fastHideTimer) clearTimeout(fastHideTimer);

          const overlay = document.querySelector("#player-control-overlay");
          if (overlay) {
            overlay.classList.remove("fadeout");
            overlay.classList.add("fadein");
            const progressBar = document.querySelector("yt-progress-bar");
            if (progressBar) {
              (progressBar as HTMLElement).style.opacity = "1";
            }
          }
          return;
        }
      }

      // Nếu chuột di chuyển trong khu vực video, reset lại bộ đếm 800ms
      resetFastHide();
    },
    { capture: true, passive: true },
  );

  document.addEventListener(
    "mouseleave",
    () => {
      if (fastHideTimer) clearTimeout(fastHideTimer);
      const video = document.querySelector("video");
      if (video && !video.paused) {
        // Rời chuột khỏi iframe -> Ẩn ngay lập tức sau 150ms
        fastHideTimer = setTimeout(forceHideUI, 150);
      }
    },
    { capture: true, passive: true },
  );

  document.addEventListener("play", resetFastHide, { capture: true });
  document.addEventListener("playing", resetFastHide, { capture: true });
  document.addEventListener("pause", resetFastHide, { capture: true });
}
