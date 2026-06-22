import { storage } from "webextension-polyfill";

// To add something to options, just add it to `schema`
const schema = {
  // key: default-value
  vtubervnButtonInYoutube: true,
  visualizerMaxFps: 60,
  enableCrowdsourcing: false,
};
type Schema = typeof schema;
export const translations = {
  vi: {
    title: "VtuberVN+",
    subtitle: "Tùy chỉnh tiện ích",
    vtubervnButtonInYoutube: {
      name: "Nút VtuberVN trên YouTube",
      description:
        "Thêm nút 'Xem trên VtuberVN' bên dưới video YouTube để truy cập nhanh",
    },
    visualizerMaxFps: {
      name: "FPS sóng nhạc",
      description: "Cài đặt giới hạn FPS sóng nhạc (10 - 60)",
    },
    enableCrowdsourcing: {
      name: "Đóng góp dữ liệu",
      description:
        "Bật tính năng này sẽ kích hoạt chức năng đóng góp dữ liệu cho VtuberVN. Extension sẽ lấy số View, CCV, Like thực tế của video / Livestream đang xem và gửi về hệ thống VtuberVN để hiển thị cho video / livestream tương ứng.",
    },
    ytPlayer: {
      newMember: "Mới tham gia",
      videoLiked: "Đã thích video!",
      videoLikeFailed: "Thích video thất bại.",
      errorGettingYtLikeData:
        "[VtuberVN+] Không lấy được ytLikeData (chưa đăng nhập?)",
      errorSendingLike: "[VtuberVN+] Lỗi khi thực hiện thích video.",
      errorSubscribing: "[VtuberVN+] Lỗi khi thực hiện đăng ký kênh.",
      errorUnsubscribing: "[VtuberVN+] Lỗi khi thực hiện hủy đăng ký kênh.",
      errorReplyingComment: "[VtuberVN+] Lỗi khi phản hồi bình luận.",
      errorFetchingComments: "[VtuberVN+] Lỗi khi tải bình luận.",
      errorPostingComment: "[VtuberVN+] Lỗi khi đăng bình luận.",
      errorEditingComment: "[VtuberVN+] Lỗi khi chỉnh sửa bình luận.",
      errorLikingComment: "[VtuberVN+] Lỗi khi thích bình luận.",
      errorHeartingComment: "[VtuberVN+] Lỗi khi thả tim bình luận.",
      errorDeletingComment: "[VtuberVN+] Lỗi khi xóa bình luận.",
      errorFlaggingComment: "[VtuberVN+] Lỗi khi báo cáo bình luận.",
      errorBlockingUser: "[VtuberVN+] Lỗi khi ẩn người dùng khỏi kênh.",
      errorPinningComment: "[VtuberVN+] Lỗi khi ghim bình luận.",
      errorUnpinningComment: "[VtuberVN+] Lỗi khi bỏ ghim bình luận.",
      errorDeletingChatMessage: "[VtuberVN+] Lỗi khi xóa tin nhắn chat.",
      errorTimingOutUser: "[VtuberVN+] Lỗi khi tạm ẩn người dùng chat.",
      errorBanningUser: "[VtuberVN+] Lỗi khi cấm người dùng chat.",
      errorSyncingHistory: "[VtuberVN+] Lỗi khi đồng bộ lịch sử xem.",
      errorDetectingRole: "[VtuberVN+] Lỗi khi nhận diện vai trò người dùng.",
    },
  },
  en: {
    title: "VtuberVN+",
    subtitle: "Extension Options",
    vtubervnButtonInYoutube: {
      name: "VtuberVN Button on YouTube",
      description:
        "Adds a 'Watch on VtuberVN' button below YouTube videos for quick access",
    },
    visualizerMaxFps: {
      name: "Visualizer FPS",
      description: "Set the FPS limit for the audio visualizer (10 - 60)",
    },
    enableCrowdsourcing: {
      name: "Data Crowdsourcing",
      description:
        "Enabling this feature will activate the data contribution function for VtuberVN. The extension will retrieve the actual number of views, CCV, and likes of the video/livestream being watched and send them to the VtuberVN system to display for the corresponding video/livestream.",
    },
    ytPlayer: {
      newMember: "New Member",
      videoLiked: "Video liked!",
      videoLikeFailed: "Failed to like the video.",
      errorGettingYtLikeData:
        "[VtuberVN+] Error getting ytLikeData (not logged in?)",
      errorSendingLike: "[VtuberVN+] Error while sending video like.",
      errorSubscribing: "[VtuberVN+] Error subscribing.",
      errorUnsubscribing: "[VtuberVN+] Error unsubscribing.",
      errorReplyingComment: "[VtuberVN+] Error replying to comment.",
      errorFetchingComments: "[VtuberVN+] Error fetching comments.",
      errorPostingComment: "[VtuberVN+] Error posting comment.",
      errorEditingComment: "[VtuberVN+] Error editing comment.",
      errorLikingComment: "[VtuberVN+] Error liking comment.",
      errorHeartingComment: "[VtuberVN+] Error hearting comment.",
      errorDeletingComment: "[VtuberVN+] Error deleting comment.",
      errorFlaggingComment: "[VtuberVN+] Error flagging comment.",
      errorBlockingUser: "[VtuberVN+] Error blocking user.",
      errorPinningComment: "[VtuberVN+] Error pinning comment.",
      errorUnpinningComment: "[VtuberVN+] Error unpinning comment.",
      errorDeletingChatMessage: "[VtuberVN+] Error deleting chat message.",
      errorTimingOutUser: "[VtuberVN+] Error timing out user.",
      errorBanningUser: "[VtuberVN+] Error banning user.",
      errorSyncingHistory: "[VtuberVN+] Error syncing watch history.",
      errorDetectingRole: "[VtuberVN+] Error detecting user role.",
    },
  },
} as const;

export type Locale = "vi" | "en";

export const Options = {
  /** Get the options storage schema */
  schema(): Schema {
    return { ...schema };
  },

  /** Get an option's description */
  name<K extends keyof Schema>(key: K, locale: Locale = "vi"): string | null {
    // @ts-ignore
    return translations[locale]?.[key]?.name ?? null;
  },

  /** Get an option's description */
  description<K extends keyof Schema>(
    key: K,
    locale: Locale = "vi",
  ): string | null {
    // @ts-ignore
    return translations[locale]?.[key]?.description ?? null;
  },

  /** Get an option */
  async get<K extends keyof Schema>(key: K): Promise<Schema[K] | null> {
    const result = await storage.local.get(key);
    return key in result ? result[key] : schema[key];
  },

  /** Set an option */
  async set<K extends keyof Schema>(key: K, value: Schema[K]): Promise<void> {
    await storage.local.set({ [key]: value });
  },

  // This probably shouldn't be used as it is, because it doesn't listen for changes
  // in *just* the options storage.
  /**
   * Listen for changes in the options storage
   */
  /* subscribe(callback: (changes: { [K in keyof Schema]?: browser.Storage.StorageChange }) => void) {
    storage.onChanged.addListener((changes, type) => {
      if (type !== "local") return;
      callback(changes);
    });
  }, */
} as const;
