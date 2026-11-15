import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { mount } from "../src/theme.js";
import { localText } from "../src/i18n.js";
import { createSyntheticSdk } from "../dev/synthetic-sdk.js";

const PREFIX = "neubrutalism";
const NOTICE = "Neon Vault\n\nMIT License\nCopyright (c) example";

function fixture(t, fetch) {
  const window = new Window({ url: `https://${PREFIX}.test/` });
  const root = window.document.createElement("div");
  window.document.body.append(root);
  const requests = [];
  window.fetch = (url) => {
    requests.push(String(url));
    return fetch(url);
  };
  const opened = [];
  window.open = (...args) => {
    opened.push(args);
    return null;
  };
  const mock = createSyntheticSdk();
  mock.emit();
  const app = mount({ root, sdk: mock.sdk, appearance: { settings: {} } });
  t.after(async () => {
    app.unmount();
    await window.happyDOM.abort();
  });
  const lang = mock.sdk.getSnapshot().preferences.resolvedLanguage || "en";
  const link = root.querySelector(`.${PREFIX}-footer a`);
  const panel = root.querySelector(`.${PREFIX}-license`);
  const text = root.querySelector(`.${PREFIX}-license-text`);
  const title = root.querySelector(`.${PREFIX}-license-title`);
  const close = root.querySelector('[data-action="license-close"]');
  const press = (options = {}) =>
    link.dispatchEvent(
      new window.MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        button: 0,
        ...options,
      }),
    );
  return {
    window,
    root,
    app,
    lang,
    link,
    panel,
    text,
    title,
    close,
    press,
    requests,
    opened,
  };
}
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
const ok = (body) => async () => ({ ok: true, text: async () => body });

test("the license link stays a real link but no longer opens a new window", (t) => {
  const h = fixture(t, ok(NOTICE));
  assert.ok(h.link, "footer license link");
  assert.equal(h.link.hasAttribute("target"), false);
  assert.equal(h.link.hasAttribute("rel"), false);
  assert.match(h.link.href, /\/licenses\/NOTICE\.txt$/);
  assert.ok(h.panel, "license panel");
  assert.equal(h.link.getAttribute("aria-controls"), h.panel.id);
  assert.equal(h.link.getAttribute("aria-expanded"), "false");
  assert.equal(h.panel.hidden, true);
  assert.ok(h.root.contains(h.panel));
});

test("a click opens the notice in the page, loads it once and toggles closed", async (t) => {
  const h = fixture(t, ok(NOTICE));
  assert.equal(h.press(), false, "default prevented");
  assert.equal(h.opened.length, 0);
  assert.equal(h.panel.hidden, false);
  assert.equal(h.link.getAttribute("aria-expanded"), "true");
  assert.equal(h.text.textContent, localText(h.lang, "waiting"));
  assert.ok(h.window.document.activeElement === h.title);
  await flush();
  assert.equal(h.text.textContent, NOTICE);
  assert.deepEqual(h.requests, [h.link.href]);
  assert.ok(h.close.textContent.trim());

  h.press();
  assert.equal(h.panel.hidden, true);
  assert.equal(h.link.getAttribute("aria-expanded"), "false");
  assert.ok(h.window.document.activeElement === h.link);

  h.press();
  await flush();
  assert.equal(h.panel.hidden, false);
  assert.equal(h.text.textContent, NOTICE);
  assert.equal(h.requests.length, 1);
  h.close.click();
  assert.equal(h.panel.hidden, true);
  assert.ok(h.window.document.activeElement === h.link);
});

test("Escape inside the panel closes it and returns focus to the link", async (t) => {
  const h = fixture(t, ok(NOTICE));
  h.press();
  await flush();
  h.title.dispatchEvent(
    new h.window.KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
  assert.equal(h.panel.hidden, true);
  assert.ok(h.window.document.activeElement === h.link);
});

test("a modified click keeps the browser's own link behavior", (t) => {
  const h = fixture(t, ok(NOTICE));
  assert.equal(h.press({ ctrlKey: true }), true);
  assert.equal(h.panel.hidden, true);
  assert.equal(h.requests.length, 0);
});

test("a failed load shows the failure text and a later open tries again", async (t) => {
  let fail = true;
  const h = fixture(t, async () => {
    if (fail) return { ok: false, status: 404, text: async () => "missing" };
    return { ok: true, text: async () => NOTICE };
  });
  h.press();
  await flush();
  assert.equal(h.text.textContent, localText(h.lang, "failed"));
  h.press();
  fail = false;
  h.press();
  await flush();
  assert.equal(h.text.textContent, NOTICE);
  assert.equal(h.requests.length, 2);

  const rejected = fixture(t, async () => {
    throw new Error("offline");
  });
  rejected.press();
  await flush();
  assert.equal(rejected.text.textContent, localText(rejected.lang, "failed"));
});

test("a load finishing after unmount writes nothing", async (t) => {
  let resolve;
  const h = fixture(
    t,
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  h.press();
  await flush();
  assert.equal(h.requests.length, 1);
  const waiting = h.text.textContent;
  h.app.unmount();
  resolve({ ok: true, text: async () => NOTICE });
  await flush();
  assert.equal(h.text.textContent, waiting);
  assert.equal(h.root.contains(h.panel), false);
});
