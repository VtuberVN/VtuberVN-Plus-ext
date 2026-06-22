import { Options, validOrigin } from "@utils";
import { videoId } from "./context";

let crowdsourcingInterval: ReturnType<typeof setInterval> | null = null;
let hasSentVodData = false;

function extractDataFromDom(): any {
  let playerResponse: any = null;
  let ytcfgData: any = null;
  
  const scripts = document.querySelectorAll("script");
  for (const script of scripts) {
    const text = script.textContent || "";
    // Parse ytInitialPlayerResponse
    if (!playerResponse && text.includes("ytInitialPlayerResponse")) {
      try {
        const match = text.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
        if (match) {
          playerResponse = JSON.parse(match[1]);
        }
      } catch (e) {}
    }
    
    // Parse ytcfg
    if (!ytcfgData && text.includes("ytcfg.set({")) {
      try {
        const match = text.match(/ytcfg\.set\s*\(\s*(\{.+?\})\s*\)/s);
        if (match) {
          ytcfgData = JSON.parse(match[1]);
        }
      } catch (e) {}
    }
  }

  return {
    viewCount: playerResponse?.videoDetails?.viewCount,
    isLiveContent: playerResponse?.videoDetails?.isLiveContent,
    apiKey: ytcfgData?.INNERTUBE_API_KEY,
    clientVersion: ytcfgData?.INNERTUBE_CLIENT_VERSION,
    clientName: ytcfgData?.INNERTUBE_CLIENT_NAME || "WEB_EMBEDDED",
  };
}

async function startCrowdsourcing() {
  const isEnabled = await Options.get("enableCrowdsourcing");
  if (!isEnabled) return;

  if (crowdsourcingInterval) clearInterval(crowdsourcingInterval);

  // Lấy dữ liệu ngay khi load (Dành cho mọi loại video)
  const ytData = extractDataFromDom();
  if (ytData && ytData.viewCount) {
    const rawViewCount = parseInt(ytData.viewCount);
    const isLive = !!ytData.isLiveContent;

    if (!isLive && !hasSentVodData) {
      // VOD / Short / Past Stream: Bắn 1 lần duy nhất rồi nghỉ!
      window.parent.postMessage(
        {
          type: "VTUBERVN_CROWDSOURCING_DATA",
          videoId,
          viewCount: rawViewCount,
          ccv: 0,
          likeCount: 0, // Không đọc được likeCount từ playerResponse dễ dàng, nhường cho Server API
          likeStatus: "INDIFFERENT", 
        },
        "*"
      );
      hasSentVodData = true;
      return; // KHÔNG set interval cho VOD
    } else if (isLive) {
      // Bắn phát đầu tiên cho Livestream
      window.parent.postMessage(
        {
          type: "VTUBERVN_CROWDSOURCING_DATA",
          videoId,
          viewCount: 0,
          ccv: rawViewCount,
          likeCount: 0,
          likeStatus: "INDIFFERENT",
        },
        "*"
      );
      
      // Khởi tạo Interval 30s gọi API nội bộ để lấy CCV
      const apiKey = ytData.apiKey;
      const clientName = ytData.clientName;
      const clientVersion = ytData.clientVersion;

      if (apiKey && clientName && clientVersion) {
        let tick = 0;
        crowdsourcingInterval = setInterval(async () => {
          try {
            const video = document.querySelector("video");
            if (!video || video.paused) return; // Đang pause thì không lấy CCV

            tick++;
            
            // Mỗi 30s (tick % 3 === 0), gọi API /next để lấy cả Like
            if (tick % 3 === 0) {
              const res = await fetch(`https://www.youtube.com/youtubei/v1/next?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  context: { client: { clientName, clientVersion } },
                  videoId: videoId
                })
              });
              const jsonStr = await res.text();
              
              // Tìm likeCount trong JSON của /next
              const likeCountTextMatch = jsonStr.match(/"defaultText":\{"accessibility":\{"accessibilityData":\{"label":"([\d,\.]+)\s*(likes|lượt thích)"\}\}\}/i);
              let likeCount = 0;
              if (likeCountTextMatch) {
                 likeCount = parseInt(likeCountTextMatch[1].replace(/[,.]/g, '')) || 0;
              }
              
              // Tìm viewCount từ /next (thường nằm rải rác nhưng có thể vẫn là viewCount)
              const viewCountMatch = jsonStr.match(/"viewCount":"(\d+)"/);
              const liveCcv = viewCountMatch ? parseInt(viewCountMatch[1]) : 0;
              
              if (liveCcv > 0 || likeCount > 0) {
                window.parent.postMessage(
                  {
                    type: "VTUBERVN_CROWDSOURCING_DATA",
                    videoId,
                    viewCount: 0,
                    ccv: liveCcv,
                    likeCount: likeCount,
                    likeStatus: "INDIFFERENT",
                  },
                  "*"
                );
              }
            } else {
              // Các chu kỳ 10s còn lại: Gọi /player siêu nhẹ chỉ lấy CCV
              const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  context: { client: { clientName, clientVersion } },
                  videoId: videoId
                })
              });
              const json = await res.json();
              
              if (json?.videoDetails?.viewCount) {
                const liveCcv = parseInt(json.videoDetails.viewCount);
                window.parent.postMessage(
                  {
                    type: "VTUBERVN_CROWDSOURCING_DATA",
                    videoId,
                    viewCount: 0,
                    ccv: liveCcv,
                    likeCount: 0, // Không gởi likeCount để Backend không bị đè số 0
                    likeStatus: "INDIFFERENT",
                  },
                  "*"
                );
              }
            }
          } catch (e) {
            console.error("[VtuberVN+] Crowdsourcing API error:", e);
          }
        }, 10000); // 10s cho realtime hơn
      }
    }
  }
}

export function initCrowdsourcing(): void {
  // Khởi chạy crowdsourcing nếu được bật
  startCrowdsourcing();

  // Cập nhật lại interval nếu user đổi cài đặt trong lúc đang xem
  window.addEventListener("message", async (event) => {
    if (
      validOrigin(event.origin) &&
      event.data?.event === "updateCrowdsourcing"
    ) {
      if (await Options.get("enableCrowdsourcing")) {
        startCrowdsourcing();
      } else {
        if (crowdsourcingInterval) {
          clearInterval(crowdsourcingInterval);
          crowdsourcingInterval = null;
        }
      }
    }
  });
}
