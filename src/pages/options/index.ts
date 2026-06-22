import { entries, Options, translations, Locale } from "@utils";
import { storage } from "webextension-polyfill";

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("options") as HTMLFormElement;
  if (!form) return;

  // Lấy locale từ storage, mặc định 'vi'
  const storageResult = await storage.local.get("vtubervn_locale");
  const locale: Locale = storageResult.vtubervn_locale === "en" ? "en" : "vi";

  form.className = "options-form";

  // Tiêu đề
  const title = document.createElement("h1");
  title.className = "options-title";
  title.textContent = translations[locale].title;

  const subtitle = document.createElement("p");
  subtitle.className = "options-subtitle";
  subtitle.textContent = translations[locale].subtitle;

  form.prepend(subtitle);
  form.prepend(title);

  for (const [option, defaultValue] of entries(Options.schema())) {
    const container = document.createElement("div");
    container.className = "option-item";

    // Name wrapper containing heading and tooltip icon
    const nameWrapper = document.createElement("div");
    nameWrapper.className = "option-name-wrapper";

    const heading = document.createElement("h2");
    heading.className = "option-name";
    heading.textContent = Options.name(option, locale) || option;
    nameWrapper.appendChild(heading);

    const descText = Options.description(option, locale);
    if (descText) {
      const tooltip = document.createElement("span");
      tooltip.className = "option-tooltip";
      tooltip.textContent = "?";
      tooltip.title = descText;
      nameWrapper.appendChild(tooltip);
    }

    // Hàng nội dung: chỉ chứa control bên phải
    const contentRow = document.createElement("div");
    contentRow.className = "option-row";

    const controlWrapper = document.createElement("div");
    controlWrapper.className = "option-control";

    if (typeof defaultValue === "number") {
      // Slider cho giá trị số
      const input = document.createElement("input");
      input.type = "range";
      input.min = "10";
      input.max = "60";
      input.step = "1";
      input.className = "option-slider";

      const valueDisplay = document.createElement("span");
      valueDisplay.className = "option-slider-value";

      Options.get(option).then((val) => {
        const v = (val as number) ?? defaultValue;
        input.value = v.toString();
        valueDisplay.textContent = v.toString();
      });

      input.addEventListener("input", () => {
        valueDisplay.textContent = input.value;
      });
      input.addEventListener("change", () => {
        Options.set(option, parseInt(input.value));
      });

      controlWrapper.appendChild(input);
      controlWrapper.appendChild(valueDisplay);
    } else {
      // Toggle switch cho giá trị boolean
      const label = document.createElement("label");
      label.className = "option-toggle";
      label.setAttribute("aria-label", Options.name(option, locale) || option);

      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "option-toggle__input";

      Options.get(option).then((val) => {
        input.checked = ((val as boolean) ?? defaultValue) as boolean;
      });
      input.addEventListener("change", () => Options.set(option, input.checked));

      const track = document.createElement("span");
      track.className = "option-toggle__track";

      const thumb = document.createElement("span");
      thumb.className = "option-toggle__thumb";

      track.appendChild(thumb);
      label.appendChild(input);
      label.appendChild(track);
      controlWrapper.appendChild(label);
    }

    contentRow.appendChild(controlWrapper);

    container.appendChild(nameWrapper);
    container.appendChild(contentRow);

    form.appendChild(container);
  }
});

