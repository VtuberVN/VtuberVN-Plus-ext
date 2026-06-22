import { EmojiCategory, EmojiItem, SponsorBadgeRenderer } from "./types";
import { setCurrentUserAvatarUrl, getCurrentUserAvatarUrl, getAvatarId, t } from "./context";

export function extractAndSendChannelEmojis(res: any): void {
  try {
    const endpoints: any[] = res?.onResponseReceivedEndpoints || [];
    const continuationItems: any[] = [];
    for (const ep of endpoints) {
      if (ep.appendContinuationItemsAction?.continuationItems) {
        continuationItems.push(
          ...ep.appendContinuationItemsAction.continuationItems,
        );
      } else if (ep.reloadContinuationItemsCommand?.continuationItems) {
        continuationItems.push(
          ...ep.reloadContinuationItemsCommand.continuationItems,
        );
      }
    }

    const headerItem = continuationItems.find(
      (item: any) => item.commentsHeaderRenderer,
    );
    if (!headerItem) return;

    const simplebox =
      headerItem.commentsHeaderRenderer?.createRenderer
        ?.commentSimpleboxRenderer;

    const avatarUrl = simplebox?.authorThumbnail?.thumbnails?.[0]?.url;
    if (avatarUrl) {
      setCurrentUserAvatarUrl(avatarUrl);
    }

    // YouTube có thể đặt emojiPicker ở 2 vị trí khác nhau tùy phiên bản
    const emojiPickerRenderer =
      simplebox?.emojiPicker?.emojiPickerRenderer ||
      simplebox?.emojiButton?.buttonRenderer?.navigationEndpoint
        ?.commentEmojiPickerRenderer;

    if (!emojiPickerRenderer?.categories) return;

    // Build lookup map cho emojis
    const emojiMap = new Map<string, any>();
    for (const emo of emojiPickerRenderer.emojis || []) {
      if (emo.emojiId) emojiMap.set(emo.emojiId, emo);
    }

    // YouTube API mới: root emojis rỗng → quét đệ quy toàn response
    if (emojiMap.size === 0) {
      const scanForEmojis = (obj: any, depth = 0) => {
        if (!obj || typeof obj !== "object" || depth > 12) return;
        if (obj.emojiId && obj.image?.thumbnails) {
          emojiMap.set(obj.emojiId, obj);
          return;
        }
        for (const val of Object.values(obj)) {
          if (Array.isArray(val)) {
            for (const item of val) scanForEmojis(item, depth + 1);
          } else if (val && typeof val === "object") {
            scanForEmojis(val, depth + 1);
          }
        }
      };
      scanForEmojis(res);
    }

    const categories: EmojiCategory[] = [];

    for (const cat of emojiPickerRenderer.categories) {
      const renderer = cat.emojiPickerCategoryRenderer;
      if (!renderer) continue;

      const categoryName: string =
        renderer.title?.simpleText || renderer.categoryId || "Unknown";
      
      const categoryImage: string = renderer.image?.thumbnails?.[0]?.url || "";

      const emojis: EmojiItem[] = [];

      // YouTube có 2 format:
      // 1. Mới: category chứa `emojiIds`, emoji objects nằm trong emojiMap (build từ root hoặc scan)
      // 2. Cũ: category chứa trực tiếp mảng `emojis` với cấu trúc đầy đủ
      let sourceEmojis: any[] = [];
      if (renderer.emojiIds && emojiMap.size > 0) {
        sourceEmojis = renderer.emojiIds.map((id: string) => emojiMap.get(id)).filter(Boolean);
      }
      if (sourceEmojis.length === 0) {
        sourceEmojis = renderer.emojis || [];
      }

      for (const emoWrapper of sourceEmojis) {
        // Trong format cũ, emoji wrapper có thể là { emoji: { emojiId, image, ... } }
        // Format mới lấy từ map thì `emoWrapper` chính là object emoji
        const emo = emoWrapper.emoji || emoWrapper;
        if (!emo) continue;

        const shortcut: string = emo.shortcuts?.[0] || emo.emojiId || "";
        const thumbs: Array<{ url: string; width?: number }> =
          emo.image?.thumbnails || [];
        const src: string =
          thumbs.reduce(
            (
              best: { url: string; width?: number },
              t: { url: string; width?: number },
            ) => ((t.width ?? 0) > (best.width ?? 0) ? t : best),
            thumbs[0] || { url: "" },
          ).url || "";
        const alt: string = emo.searchTerms?.[0] || shortcut;
        const isCustom = !!emo.isCustomEmoji;

        if (shortcut && src) {
          emojis.push({ shortcut, src, alt, isCustom });
        }
      }

      if (emojis.length > 0) {
        categories.push({ category: categoryName, categoryImage, emojis });
      }
    }

    // ── Detect membership category ─────────────────────────────────────────────
    let isMember = false;
    let membershipLabel = "";
    let membershipBadge = "";
    let membershipDuration = "";

    // Chỉ kiểm tra badge trực tiếp tại path cố định trong simplebox của user hiện tại.
    // KHÔNG quét đệ quy để tránh bắt nhầm badge của comment người khác trong response.
    // Path đúng: simplebox.authorCommentBadge.sponsorCommentBadgeRenderer
    const sponsorBadgeRenderer: SponsorBadgeRenderer | null =
      simplebox?.authorCommentBadge?.sponsorCommentBadgeRenderer ?? null;

    if (sponsorBadgeRenderer) {
      const badgeUrl =
        sponsorBadgeRenderer.customBadge?.image?.thumbnails?.[0]?.url ||
        sponsorBadgeRenderer.image?.thumbnails?.[0]?.url ||
        "";
      if (badgeUrl) {
        // Chỉ công nhận là hội viên nếu trong bộ chọn biểu tượng cảm xúc (categories) có chứa emoji tùy chỉnh của kênh (custom emoji).
        // Nếu không có bất kỳ emoji tùy chỉnh nào, đây chỉ là badge quảng cáo mẫu hoặc badge đã hết hạn của YouTube.
        const hasCustomEmojis = categories.some(cat => cat.emojis.some(e => e.isCustom));

        if (hasCustomEmojis) {
          isMember = true;
          membershipBadge = badgeUrl;
          const tooltipText =
            sponsorBadgeRenderer.tooltip || sponsorBadgeRenderer.iconTooltip || "";

          const durationMatch = tooltipText.match(/\(([^)]+)\)$/);
          if (durationMatch) {
            membershipDuration = durationMatch[1];
            const nameMatch = tooltipText.match(
              /(?:Hội viên|Member)\s*\(([^)]+)\)/,
            );
            if (nameMatch) {
              membershipLabel = nameMatch[1];
            } else {
              membershipLabel = tooltipText.replace(/\(([^)]+)\)$/, "").trim();
            }
          } else {
            const nameMatch = tooltipText.match(
              /(?:Hội viên|Member)\s*\(([^)]+)\)/,
            );
            membershipLabel = nameMatch ? nameMatch[1] : tooltipText;
            membershipDuration = t("newMember");
          }
        }
      }
    }

    window.parent.postMessage(
      {
        type: "VTUBERVN_CHANNEL_EMOJIS",
        emojis: categories,
        isMember,
        membershipLabel,
        membershipBadge,
        membershipDuration,
      },
      "*",
    );
  } catch (err) {
    console.error(t("errorFetchingComments"), err);
  }
}
