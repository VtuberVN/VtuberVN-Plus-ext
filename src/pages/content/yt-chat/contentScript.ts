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

  const { primary, secondary, accent, bgOpacity = 0, isDark = true, glassType = 'none', glassOpacity = 45, glassBlur = 16 } = themeData;
  const isTransparent = bgOpacity < 1;

  // Base background rule
  const bgRule = isTransparent ? `background: transparent !important;` : `background: rgba(${isDark ? '0,0,0' : '255,255,255'},${bgOpacity}) !important;`;
  
  // Input panel background rule
  const colorBase = isDark ? '0, 0, 0' : '255, 255, 255';
  const borderBase = isDark ? '255, 255, 255' : '0, 0, 0';
  let inputBgRule = `background: rgba(${colorBase}, 0.4) !important; border-top: 1px solid rgba(${borderBase}, 0.1) !important;`;
  if (glassType !== 'none') {
    const opacityValue = glassOpacity / 100;
    inputBgRule = `background: rgba(${colorBase}, ${opacityValue}) !important; backdrop-filter: blur(${glassBlur}px) !important; border-top: 1px solid rgba(${borderBase}, 0.1) !important;`;
  }
  
  // Custom properties for colors
  const cssText = `
    /* Custom properties for colors */
    :root {
      --vtubervn-primary: ${primary || '#6200ea'};
      --vtubervn-secondary: ${secondary || '#03dac6'};
      --vtubervn-accent: ${accent || '#2196f3'};
      
      /* Ghi đè biến CSS gốc của YouTube chat để sửa lỗi màu chữ / nền sáng ở chế độ tối */
      --yt-live-chat-primary-text-color: ${isDark ? '#ffffff' : '#000000'} !important;
      --yt-live-chat-secondary-text-color: ${isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'} !important;
      --yt-live-chat-tertiary-text-color: ${isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} !important;
      --yt-live-chat-background-color: transparent !important;
      --yt-live-chat-header-background-color: transparent !important;
      --yt-live-chat-action-panel-background-color: transparent !important;
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

    /* Input panel & Viewer Engagement */
    #input-panel, #action-panel, 
    yt-live-chat-viewer-engagement-message-renderer #card {
      ${bgRule}
      color: ${isDark ? '#fff' : '#000'} !important;
    }
    
    yt-live-chat-viewer-engagement-message-renderer #card * {
      color: ${isDark ? '#fff' : '#000'} !important;
    }

    /* Pinned Messages - Sửa lỗi gradient và thay bằng nền glass/solid theo inputBgRule */
    yt-live-chat-pinned-message-renderer {
      ${inputBgRule}
      color: ${isDark ? '#fff' : '#000'} !important;
      border-radius: 8px;
      margin: 4px;
    }
    
    yt-live-chat-pinned-message-renderer #header,
    yt-live-chat-pinned-message-renderer #banner,
    yt-live-chat-pinned-message-renderer #content {
      background: transparent !important;
      background-image: none !important;
      background-color: transparent !important;
    }

    yt-live-chat-pinned-message-renderer * {
      color: ${isDark ? '#fff' : '#000'} !important;
    }

    /* Channel Owner: No background as requested */
    yt-live-chat-text-message-renderer[author-type="owner"] {
      background: transparent !important;
    }

    yt-live-chat-text-message-renderer[author-type="owner"] #author-name,
    yt-live-chat-text-message-renderer[author-type="owner"] #message {
      color: ${isDark ? '#fff' : '#000'} !important;
    }

    /* Hide the gradient mask on chat list */
    #item-scroller {
      mask-image: none !important;
      -webkit-mask-image: none !important;
    }
    
    /* Header background fix */
    yt-live-chat-header-renderer {
      background-color: transparent !important;
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
