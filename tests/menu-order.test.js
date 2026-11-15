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
  mock.sdk.identity.mode = "live";
  setup(mock);
  mock.emit();
  const app = mount({ root, sdk: mock.sdk, appearance: { settings: {} } });
  root.querySelector('[data-action="route"][data-value="more"]').click();
  t.after(async () => {
    app.unmount();
    await window.happyDOM.abort();
  });
  return { root, mock };
}
// The menu in reading order: each group's toggle value with its entries.
function menu(root) {
  return [
    ...root.querySelector(".neubrutalism-management-groups").children,
  ].map((block) =>
    block.matches(".neubrutalism-about")
      ? ["about-block", []]
      : [
          block.querySelector(".neubrutalism-group-toggle").dataset.value,
          [...block.querySelectorAll(".neubrutalism-feature")].map(
            (node) => node.dataset.value,
          ),
        ],
  );
}

test("the menu keeps four groups, with the 2FA block before the App group", (t) => {
  const { root } = fixture(t);
  assert.deepEqual(menu(root), [
    ["data", ["scan-import", "account-add", "import", "export", "backup"]],
    ["tools", ["tools", "quick-otp"]],
    [
      "settings",
      [
        "settings:security",
        "settings:sync",
        "settings:preferences",
        "settings:custom-code",
        "appearance",
        "settings:about",
      ],
    ],
    ["about-block", []],
    ["application", ["extension", "logout"]],
  ]);
});

test("About follows the theme settings and signing out closes the menu", (t) => {
  const { root, mock } = fixture(t);
  mock.state.host.installAvailable = true;
  // A host action the theme does not know still shows, before signing out.
  mock.sdk.host.listActions().push({
    actionId: "future-action",
    labelKey: "futureAction",
    enabled: true,
    request: { kind: "future-action" },
  });
  mock.emit();
  const entries = [...root.querySelectorAll(".neubrutalism-feature")].map(
    (node) => node.dataset.value,
  );
  assert.equal(entries[entries.indexOf("appearance") + 1], "settings:about");
  assert.equal(entries.at(-1), "logout");
  assert.deepEqual(menu(root).at(-1), [
    "application",
    ["extension", "pwa-install", "future-action", "logout"],
  ]);
  // No two entries share a name, the 2FA links included.
  const labels = [
    ...root.querySelectorAll(".neubrutalism-feature > span"),
    ...[...root.querySelectorAll(".neubrutalism-about-item")].filter(
      (node) => !node.hidden,
    ),
  ].map((node) => node.textContent);
  assert.equal(new Set(labels).size, labels.length, labels.join(" | "));
});

test("signing in is the last entry when signed out", (t) => {
  const { root } = fixture(t, (mock) => {
    mock.state.session.state = "logged-out";
  });
  const entries = [...root.querySelectorAll(".neubrutalism-feature")].map(
    (node) => node.dataset.value,
  );
  assert.equal(entries.at(-1), "login");
  assert.equal(entries.includes("logout"), false);
});
