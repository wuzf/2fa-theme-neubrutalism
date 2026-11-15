import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { mount } from "../src/theme.js";
import { createSyntheticSdk } from "../dev/synthetic-sdk.js";

function fixture(t, setup = () => {}) {
  const window = new Window({ url: "https://neubrutalism.test/" });
  const root = window.document.createElement("div");
  window.document.body.append(root);
  const mock = createSyntheticSdk();
  setup(mock);
  mock.emit();
  const app = mount({ root, sdk: mock.sdk, appearance: { settings: {} } });
  t.after(async () => {
    app.unmount();
    await window.happyDOM.abort();
  });
  return { root, mock };
}
const about = (root) => root.querySelector(".neubrutalism-about");

// The official footer is replaced by the theme. On a phone the fixed bottom
// bar sits over the end of the page, so what the footer showed moves to the
// management page, before the App group so that signing out stays last.
test("the management page shows the 2FA version and the project links before the App group", (t) => {
  const { root, mock } = fixture(t);
  const section = about(root);
  assert.ok(section, "about section");
  assert.equal(section.hidden, false);
  const application = root
    .querySelector('[data-action="management-group"][data-value="application"]')
    .closest(".neubrutalism-management-group");
  assert.equal(section.nextElementSibling, application);
  assert.equal(application.nextElementSibling, null);
  assert.equal(section.querySelector("h3").textContent, "2FA");
  assert.equal(
    section.getAttribute("aria-labelledby"),
    section.querySelector("h3").id,
  );
  assert.equal(
    section.querySelector(".neubrutalism-about-version").textContent,
    "v1.13.1",
  );
  assert.equal(
    section.querySelector(".neubrutalism-about-update").hidden,
    true,
  );
  const links = [...section.querySelectorAll("a.neubrutalism-about-item")];
  assert.deepEqual(
    links.map((link) => [link.textContent, link.getAttribute("href")]),
    [
      ["Documentation", "https://github.com/wuzf/2fa/blob/main/README.md"],
      ["Report an issue", "https://github.com/wuzf/2fa/issues"],
      ["Source code", "https://github.com/wuzf/2fa"],
    ],
  );
  for (const link of links) {
    assert.equal(link.target, "_blank");
    assert.equal(link.rel, "noopener noreferrer");
  }
  // The browser extension is listed once, in the App group above.
  assert.equal(section.querySelector('[data-value="extension"]'), null);
  assert.equal(section.querySelectorAll("button").length, 0);
  const extension = root.querySelectorAll('[data-value="extension"]');
  assert.equal(extension.length, 1);
  assert.equal(
    extension[0].closest(".neubrutalism-management-group"),
    root
      .querySelector(
        '[data-action="management-group"][data-value="application"]',
      )
      .closest(".neubrutalism-management-group"),
  );
  extension[0].click();
  assert.deepEqual(
    mock.calls.filter((call) => call.method === "host.open").at(-1).value
      .request,
    { kind: "extension" },
  );
});

test("the footer keeps only the theme credit and licence", (t) => {
  const { root } = fixture(t);
  const footer = root.querySelector(".neubrutalism-footer");
  assert.deepEqual(
    [...footer.children].map((node) => node.textContent),
    ["Neubrutalism · 2fa", "MIT"],
  );
  assert.equal(footer.querySelector(".neubrutalism-about"), null);
});

test("a newer release shows a link to it, and goes when there is none", (t) => {
  const { root, mock } = fixture(t);
  mock.state.host.about = {
    ...mock.state.host.about,
    latestVersion: "1.14.0",
    upToDate: false,
  };
  mock.emit();
  const update = about(root).querySelector(".neubrutalism-about-update");
  assert.equal(update.hidden, false);
  assert.equal(update.textContent, "🆕 New version available: v1.14.0");
  assert.equal(
    update.getAttribute("href"),
    "https://github.com/wuzf/2fa/releases/latest",
  );
  assert.equal(update.target, "_blank");
  assert.equal(update.rel, "noopener noreferrer");
  mock.state.host.about = { ...mock.state.host.about, latestVersion: null };
  mock.emit();
  assert.equal(update.hidden, true);
});

test("a link the host does not give stays hidden", (t) => {
  const { root, mock } = fixture(t);
  mock.state.host.about = {
    ...mock.state.host.about,
    links: { ...mock.state.host.about.links, feedback: undefined },
  };
  mock.emit();
  const section = about(root);
  assert.deepEqual(
    [...section.querySelectorAll("a.neubrutalism-about-item")]
      .filter((link) => !link.hidden)
      .map((link) => link.textContent),
    ["Documentation", "Source code"],
  );
});

test("a host without version data shows no about section", (t) => {
  const { root } = fixture(t, (mock) => {
    delete mock.state.host.about;
  });
  assert.equal(about(root).hidden, true);
});
