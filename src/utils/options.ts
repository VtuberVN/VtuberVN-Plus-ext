import { storage } from "webextension-polyfill";

// To add something to options, just add it to `schema`
const schema = {
  // key: default-value
  remoteYoutubeLikeButton: true,
  vtubervnButtonInYoutube: true,
  openVtuberVNInNewTab: true,
  // openInVtuberVNContextMenu: false,
};
type Schema = typeof schema;
const descriptions: Partial<Record<keyof Schema, { name: string, description: string }>> = {
  remoteYoutubeLikeButton: {
    name: "Nút Like trên VtuberVN",
    description: "Thêm nút 'Thích trên YouTube' vào video trên VtuberVN - khi bấm sẽ mở YouTube ở tab mới",
  },
  vtubervnButtonInYoutube: {
    name: "Nút VtuberVN trên YouTube",
    description: "Thêm nút 'Xem trên VtuberVN' bên dưới video YouTube để truy cập nhanh",
  },
  openVtuberVNInNewTab: {
    name: "Mở trong Tab mới",
    description: "Khi bấm vào biểu tượng tiện ích, mở VtuberVN trong tab mới thay vì tab hiện tại",
  },
  // openInVtuberVNContextMenu: {
  //   name: "VtuberVN Context Menu",
  //   description: "Add 'Open in VtuberVN' to the right-click menu for video links",
  // },
};

export const Options = {
  /** Get the options storage schema */
  schema(): Schema {
    return { ...schema };
  },

  /** Get an option's description */
  name<K extends keyof Schema>(key: K): string | null {
    return descriptions[key]?.name ?? null;
  },

  /** Get an option's description */
  description<K extends keyof Schema>(key: K): string | null {
    return descriptions[key]?.description ?? null;
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