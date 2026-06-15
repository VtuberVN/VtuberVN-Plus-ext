import { inject, validOrigin } from "@utils";
import injectPath from "./inject?script&module";

inject(injectPath);

// Inject base transparent CSS NGAY LẬP TỨC — không chờ theme sync
// Xóa nền trắng/đen mặc định của YouTube chat để tránh flash khi tải
const baseStyleEl = document.createElement("style");
baseStyleEl.id = "vtubervn-chat-base";
baseStyleEl.textContent = `
  html, body,
  yt-live-chat-app,
  yt-live-chat-renderer,
  yt-live-chat-item-list-renderer,
  yt-live-chat-header-renderer,
  #primary-content,
  #item-scroller,
  #item-list,
  #chat-messages,
  #contents,
  #ticker {
    background: transparent !important;
  }
`;
(document.head || document.documentElement).appendChild(baseStyleEl);

// Re-emit events from wrong origins (only from parent/external, not from ourselves)
window.addEventListener("message", (event) => {
  // Guard: do not re-post messages that originated from this window itself → prevents infinite loop
  if (event.source === window) return;

  if (validOrigin(event.origin)) {
    window.postMessage(event.data, "*");
    
    // Check if message is for theme sync
    if (event.data?.type === "VTUBERVN_THEME_SYNC") {
      applyThemeCss(event.data.payload);
    }
  }
});

function applyThemeCss(themeData: any) {
  let styleEl = document.getElementById("vtubervn-chat-theme");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "vtubervn-chat-theme";
    document.head.appendChild(styleEl);
  }

  const { primary, secondary, accent, bgOpacity = 0, glassType = 'none', glassOpacity = 45, glassBlur = 16 } = themeData;
  const isTransparent = bgOpacity < 1;

  // Base background rule
  const bgRule = isTransparent ? `background: transparent !important;` : `background: rgba(0,0,0,${bgOpacity}) !important;`;
  
  // Input panel background rule
  let inputBgRule = `background: rgba(0, 0, 0, 0.4) !important; border-top: 1px solid rgba(255, 255, 255, 0.1) !important;`;
  if (glassType !== 'none') {
    const opacityValue = glassOpacity / 100;
    inputBgRule = `background: rgba(0, 0, 0, ${opacityValue}) !important; backdrop-filter: blur(${glassBlur}px) !important; border-top: 1px solid rgba(255, 255, 255, 0.1) !important;`;
  }
  
  // Custom properties for colors
  const cssText = `
    :root {
      --vtubervn-primary: ${primary || '#6200ea'};
      --vtubervn-secondary: ${secondary || '#03dac6'};
      --vtubervn-accent: ${accent || '#2196f3'};
    }

    /* Make background transparent for glassmorphism */
    html, body,
    yt-live-chat-app, 
    yt-live-chat-renderer, 
    yt-live-chat-item-list-renderer, 
    yt-live-chat-header-renderer,
    #primary-content,
    #item-scroller, 
    #item-list, 
    #chat-messages,
    #contents,
    #ticker {
      ${bgRule}
    }

    /* Author badges */
    yt-live-chat-author-badge-renderer {
      color: var(--vtubervn-secondary) !important;
    }

    /* Input panel background */
    #input-panel, #action-panel {
      ${inputBgRule}
    }

    /* Custom scrollbar matching secondary color */
    ::-webkit-scrollbar {
      width: 6px !important;
    }
    ::-webkit-scrollbar-track {
      background: transparent !important;
    }
    ::-webkit-scrollbar-thumb {
      background: var(--vtubervn-secondary) !important;
      border-radius: 3px !important;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: var(--vtubervn-primary) !important;
    }
  `;

  styleEl.textContent = cssText;
}
