import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { readFile } from "node:fs/promises";
import { mount } from "../src/theme.js";
import { hostAppearance } from "../src/hostAppearance.js";
import { createSyntheticSdk } from "../dev/synthetic-sdk.js";

const sheets = ["tokens", "components", "application", "bento"];

async function fixture(t, theme) {
  const window = new Window({ url: "https://neubrutalism.test/" });
  for (const path of sheets) {
    const style = window.document.createElement("style");
    style.textContent = await readFile(
      new URL(`../src/styles/${path}.css`, import.meta.url),
      "utf8",
    );
    window.document.head.append(style);
  }
  const root = window.document.createElement("div");
  window.document.body.append(root);
  const mock = createSyntheticSdk();
  mock.emit();
  const app = mount({ root, sdk: mock.sdk, appearance: { settings: {} } });
  mock.sdk.preferences.set({ theme });
  // One flat grid, so the six cards take the six tile colours.
  const mode = root.querySelector('[data-setting="mode"]');
  mode.value = "flat";
  mode.dispatchEvent(new window.Event("change", { bubbles: true }));
  t.after(async () => {
    app.unmount();
    await window.happyDOM.abort();
  });
  return { window, root };
}

function rgb(value) {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits =
      hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return digits.match(/../g).map((part) => parseInt(part, 16));
  }
  const match = value.match(/rgba?\(([^)]+)\)/);
  assert.ok(match, `not a colour: ${value}`);
  const parts = match[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(parseFloat);
  assert.ok(parts.length === 3 || parts[3] === 1, `translucent: ${value}`);
  return parts.slice(0, 3);
}
function luminance(value) {
  const [r, g, b] = rgb(value).map((part) => {
    const channel = part / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (values[1] + 0.05) / (values[0] + 0.05);
}

test("dark tiles use their own muted colours with readable codes and labels", async (t) => {
  const h = await fixture(t, "dark");
  const surface = h.root.querySelector(".neubrutalism-theme");
  assert.equal(surface.dataset.colorScheme, "dark");
  const computed = (node) => h.window.getComputedStyle(node);
  const cards = [
    ...h.root.querySelectorAll(
      ".neubrutalism-account-grid > .neubrutalism-card",
    ),
  ];
  assert.ok(cards.length >= 6);
  const backgrounds = new Set();
  for (const card of cards) {
    const background = computed(card).backgroundColor;
    backgrounds.add(background);
    // A dark tile, not a light tile on a dark page.
    assert.ok(luminance(background) < 0.08, `dark tile: ${background}`);
    const texts = card.querySelectorAll(
      ".neubrutalism-account-name, .neubrutalism-account-address, .neubrutalism-otp-value, .neubrutalism-next-value, .neubrutalism-otp-next, .neubrutalism-expiry-label, .neubrutalism-hotp-label",
    );
    assert.ok(texts.length >= 3);
    for (const node of texts) {
      const ratio = contrast(computed(node).color, background);
      assert.ok(
        ratio >= 4.5,
        `${card.dataset.account} ${node.className}: ${ratio.toFixed(2)}`,
      );
    }
    // The outline that carries the colour clash stays visible on the tile.
    assert.ok(contrast(computed(card).borderTopColor, background) >= 3);
  }
  assert.ok(backgrounds.size >= 6, "every tile keeps its own colour");
});

test("dark action bar, search box and countdown follow the dark palette", async (t) => {
  const h = await fixture(t, "dark");
  const computed = (node) => h.window.getComputedStyle(node);
  const bar = h.root.querySelector(".neubrutalism-actionbar");
  const barBackground = computed(bar).backgroundColor;
  assert.ok(luminance(barBackground) < 0.08, `dark bar: ${barBackground}`);
  for (const item of bar.querySelectorAll(".neubrutalism-actionbar-item")) {
    const fill = item.classList.contains("is-primary")
      ? computed(item).backgroundColor
      : barBackground;
    assert.ok(contrast(computed(item).color, fill) >= 4.5, item.textContent);
  }
  const search = h.root.querySelector(".neubrutalism-search");
  assert.ok(luminance(computed(search).backgroundColor) < 0.08);
  const fill = h.root.querySelector(
    ".neubrutalism-account-grid .neubrutalism-progress-fill",
  );
  assert.ok(luminance(computed(fill).backgroundColor) > 0.3);
});

test("light tiles keep the bright colours and black ink", async (t) => {
  const h = await fixture(t, "light");
  const computed = (node) => h.window.getComputedStyle(node);
  const card = h.root.querySelector(
    ".neubrutalism-account-grid > .neubrutalism-card",
  );
  assert.deepEqual(rgb(computed(card).backgroundColor), [252, 195, 30]);
  assert.deepEqual(rgb(computed(card).borderTopColor), [0, 0, 0]);
  const code = card.querySelector(".neubrutalism-otp-value");
  assert.deepEqual(rgb(computed(code).color), [0, 0, 0]);
  const bar = h.root.querySelector(".neubrutalism-actionbar");
  assert.deepEqual(rgb(computed(bar).backgroundColor), [255, 255, 255]);
});

// Resolves the lengths the stylesheet leaves to the browser: calc(), max() and
// the safe-area inset, which happy-dom keeps as text.
function length(value, inset) {
  let text = value
    .replace(/\s+/g, " ")
    .replace(/env\(safe-area-inset-bottom\)/g, `${inset}px`);
  for (let previous; previous !== text; ) {
    previous = text;
    text = text.replace(/max\(([^()]*)\)/g, (_, list) =>
      String(
        Math.max(...list.split(",").map((part) => length(part, inset))) + "px",
      ),
    );
    text = text.replace(
      /calc\(([^()]*)\)/g,
      (_, sum) => String(length(sum, inset)) + "px",
    );
  }
  const terms = text.trim().split(/\s*\+\s*/);
  return terms.reduce((total, term) => {
    assert.match(term, /^-?[\d.]+px$/, `unresolved length: ${value}`);
    return total + parseFloat(term);
  }, 0);
}

test("the content area leaves room for the floating action bar", async (t) => {
  for (const width of [390, 1280]) {
    const h = await fixture(t, "light");
    h.window.happyDOM.setViewport({ width, height: 844 });
    const computed = (node) => h.window.getComputedStyle(node);
    const workspace = h.root.querySelector(".neubrutalism-workspace");
    const bar = h.root.querySelector(".neubrutalism-actionbar");
    // Media queries apply once the DOM changes after the resize.
    workspace.dataset.probe = String(width);
    const items = [...bar.querySelectorAll(".neubrutalism-actionbar-item")];
    assert.ok(items.length >= 1);
    const style = computed(bar);
    const height =
      Math.max(...items.map((item) => length(computed(item).minHeight, 0))) +
      length(style.paddingTop, 0) +
      length(style.paddingBottom, 0) +
      length(style.borderTopWidth, 0) +
      length(style.borderBottomWidth, 0);
    for (const inset of [0, 34, 48]) {
      const reserve = length(computed(workspace).paddingBottom, inset);
      assert.ok(
        reserve >= height,
        `${width}px: reserve ${reserve} < ${height}`,
      );
      const covered = height + length(style.bottom, inset);
      assert.ok(
        reserve >= covered,
        `${width}px, inset ${inset}: reserve ${reserve} < bar ${covered}`,
      );
    }
  }
});

test("host dialogs keep a visible hard shadow in the dark palette", () => {
  for (const density of ["comfortable", "compact"]) {
    const dark = hostAppearance({ density }, true);
    assert.ok(contrast(dark.shadow.color, dark.subtle) >= 3);
    assert.ok(contrast(dark.shadow.color, dark.surface) >= 3);
    const light = hostAppearance({ density }, false);
    assert.equal(light.shadow.color, "#000000");
  }
});
