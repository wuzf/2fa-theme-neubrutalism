import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { mount } from "../src/theme.js";
import { createSyntheticSdk } from "../dev/synthetic-sdk.js";

function fixture(t) {
  const window = new Window({ url: "https://neubrutalism.test/" });
  const document = window.document;
  const root = document.createElement("div");
  document.body.append(root);
  const mock = createSyntheticSdk();
  mock.sdk.identity.mode = "live";
  const app = mount({ root, sdk: mock.sdk, appearance: { settings: {} } });
  const find = (selector) => root.querySelector(selector);
  const feature = (id) => find(`.neubrutalism-feature[data-value="${id}"]`);
  const more = find('[data-action="route"][data-value="more"]');
  const group = (id) =>
    find(`[data-action="management-group"][data-value="${id}"]`);
  const showManagement = () => more.click();
  const states = find(".neubrutalism-states");
  const queue = find(".neubrutalism-queue-region");
  const emit = () => mock.emit();
  t.after(async () => {
    app.unmount();
    await window.happyDOM.abort();
  });
  return {
    window,
    document,
    root,
    mock,
    app,
    find,
    feature,
    more,
    group,
    showManagement,
    states,
    queue,
    emit,
  };
}

test("normal management contains only available business entries and precise labels", (t) => {
  const h = fixture(t);
  h.showManagement();
  const expected = [
    "account-add",
    "scan-import",
    "import",
    "export",
    "backup",
    "tools",
    "settings:security",
    "settings:preferences",
    "settings:sync",
    "settings:custom-code",
    "settings:about",
    "appearance",
    "logout",
    "extension",
    "quick-otp",
  ];
  if ("neubrutalism" === "newspaper")
    expected.splice(expected.indexOf("account-add"), 1);
  assert.deepEqual(
    [...h.root.querySelectorAll(".neubrutalism-feature")]
      .map((n) => n.dataset.value)
      .sort(),
    expected.sort(),
  );
  assert.equal(
    h.find('.neubrutalism-management-list [data-action="refresh"]'),
    null,
  );
  assert.equal(h.states.hidden, true);
  assert.equal(h.queue.hidden, true);
  // The host's About page sits with the other settings.
  assert.ok(
    h.feature("settings:about").closest(".neubrutalism-management-group") ===
      h.group("settings").closest(".neubrutalism-management-group"),
  );
  // Safe mode is offered by the host's error bar, not the menu.
  assert.equal(h.feature("recovery") === null, true);
  assert.equal(
    h.feature("quick-otp").textContent,
    "Generate verification code",
  );
  // Generating a code from a key is a tool, so it sits in the tools group.
  for (const [kind, group] of [["quick-otp", "tools"]]) {
    if (h.group(group).getAttribute("aria-expanded") !== "true")
      h.group(group).click();
    h.feature(kind).click();
    assert.deepEqual(h.mock.calls.at(-1).value.request, { kind });
    assert.ok(h.mock.calls.at(-1).value.options.returnFocus === h.group(group));
  }
});

test("unchanged descriptors respond to every session state and strict install availability", (t) => {
  const h = fixture(t);
  const original = JSON.stringify(h.mock.sdk.host.listActions());
  for (const state of [
    "logged-out",
    "unconfirmed",
    "authenticated",
    "logged-out",
  ]) {
    h.mock.state.session.state = state;
    h.emit();
    assert.equal(Boolean(h.feature("login")), state === "logged-out", state);
    assert.equal(Boolean(h.feature("logout")), state !== "logged-out", state);
    assert.equal(JSON.stringify(h.mock.sdk.host.listActions()), original);
  }
  for (const available of [false, true, false, true]) {
    h.mock.state.host.installAvailable = available;
    h.emit();
    assert.equal(Boolean(h.feature("pwa-install")), available);
  }
  const pwa = h.mock.sdk.host
    .listActions()
    .find((item) => item.actionId === "pwa-install");
  pwa.enabled = false;
  h.emit();
  assert.equal(h.feature("pwa-install"), null);
  pwa.enabled = true;
  h.emit();
  assert.ok(h.feature("pwa-install"));
});

test("unknown globals survive exact internal filtering and contextual actions stay absent", (t) => {
  const h = fixture(t);
  const actions = h.mock.sdk.host.listActions();
  actions.push({
    actionId: "offline-queue-future",
    labelKey: "future",
    enabled: true,
    request: { kind: "future" },
  });
  actions.push({
    actionId: "future-account",
    labelKey: "future",
    requires: "account",
    enabled: true,
    request: { kind: "future-account" },
  });
  h.emit();
  h.showManagement();
  h.group("application").click();
  assert.ok(h.feature("offline-queue-future"));
  h.feature("offline-queue-future").click();
  assert.deepEqual(h.mock.calls.at(-1).value.request, { kind: "future" });
  for (const id of [
    "future-account",
    "hidden-accounts",
    "offline-queue",
    "offline-queue-status-retry",
  ])
    assert.equal(h.feature(id), null);
});

test("hidden and queue state actions are conditional and return to stable management button", (t) => {
  const h = fixture(t);
  h.mock.state.library.hidden.count = 1;
  h.mock.state.queue = {
    unavailable: true,
    operations: [
      { operationId: "op-1", canEdit: true, canRetry: true, canCancel: true },
    ],
  };
  h.emit();
  assert.equal(h.states.hidden, false);
  assert.equal(h.queue.hidden, false);
  for (const kind of [
    "hidden-accounts",
    "offline-queue",
    "offline-queue-status-retry",
    "offline-queue-edit",
    "offline-queue-retry",
    "offline-queue-cancel",
  ]) {
    const node = h.find(`[data-value="${kind}"]`);
    assert.ok(node && !node.closest("[hidden]"));
    node.click();
    assert.deepEqual(
      h.mock.calls.at(-1).value.request,
      [
        "offline-queue-edit",
        "offline-queue-retry",
        "offline-queue-cancel",
      ].includes(kind)
        ? { kind, operationId: "op-1" }
        : { kind },
    );
    assert.ok(h.mock.calls.at(-1).value.options.returnFocus === h.more);
  }
  h.mock.state.library.hidden.count = 0;
  h.mock.state.queue = { operations: [] };
  h.emit();
  assert.equal(h.states.hidden, true);
  assert.equal(h.queue.hidden, true);
  h.mock.state.queue.authRequired = true;
  h.emit();
  assert.equal(h.queue.hidden, false);
  assert.equal(
    h.find('[data-value="offline-queue-status-retry"]').hidden,
    true,
  );
});

for (const scenario of [
  "hidden-action",
  "state-region",
  "queue-region",
  "queue-view",
  "queue-retry",
  "queue-row",
  "queue-operation",
]) {
  for (const modal of [false, true]) {
    test(`disappearing ${scenario} moves focus only outside host modal (${modal})`, (t) => {
      const h = fixture(t);
      h.mock.state.library.hidden.count = 1;
      if (scenario === "hidden-action")
        h.mock.state.connectivity.onlineHint = false;
      h.mock.state.queue = {
        unavailable: true,
        operations: [
          {
            operationId: "op-1",
            canEdit: true,
            canRetry: true,
            canCancel: true,
          },
          { operationId: "op-2", canRetry: true },
        ],
      };
      h.emit();
      let target;
      let update;
      if (scenario.startsWith("hidden") || scenario === "state-region") {
        target =
          scenario === "state-region"
            ? h.states
            : h.find('[data-state="hidden"]');
        update = () => {
          h.mock.state.library.hidden.count = 0;
        };
      } else if (scenario === "queue-row" || scenario === "queue-operation") {
        const action = h.find(
          '[data-operation="op-1"][data-value="offline-queue-retry"]',
        );
        target = scenario === "queue-row" ? action.parentElement : action;
        update = () => {
          if (scenario === "queue-row") h.mock.state.queue.operations.shift();
          else h.mock.state.queue.operations[0].canRetry = false;
        };
      } else {
        target =
          scenario === "queue-region"
            ? h.queue
            : h.find(
                `[data-value="${scenario === "queue-view" ? "offline-queue" : "offline-queue-status-retry"}"]`,
              );
        update = () => {
          h.mock.state.queue.unavailable = false;
          if (scenario !== "queue-retry") h.mock.state.queue.operations = [];
        };
      }
      target.tabIndex = 0;
      target.focus();
      assert.ok(h.document.activeElement === target);
      h.mock.state.host.dialogOpen = modal;
      let focusMoves = 0;
      h.more.addEventListener("focus", () => focusMoves++);
      update();
      h.emit();
      assert.equal(focusMoves, modal ? 0 : 1);
      if (!modal) {
        assert.ok(h.document.activeElement === h.more);
        assert.equal(h.more.closest("[hidden]"), null);
        h.more.click();
        h.group("application").click();
        h.feature("quick-otp").click();
        assert.equal(h.mock.calls.at(-1).value.request.kind, "quick-otp");
      }
    });
  }
}

test("host dialog focus is preserved as conditional state and management entries resolve", (t) => {
  const h = fixture(t);
  h.mock.state.library.hidden.count = 1;
  h.mock.state.queue.unavailable = true;
  h.mock.state.host.installAvailable = true;
  h.emit();
  const modalInput = h.document.createElement("input");
  h.document.body.append(modalInput);
  modalInput.focus();
  h.mock.state.host.dialogOpen = true;
  h.mock.state.library.hidden.count = 0;
  h.mock.state.queue.unavailable = false;
  h.mock.state.host.installAvailable = false;
  h.emit();
  assert.ok(h.document.activeElement === modalInput);
});

for (const modal of [false, true])
  test(`dynamic management removal keeps group focus protocol with modal guard (${modal})`, (t) => {
    const h = fixture(t);
    h.showManagement();
    h.group("application").click();
    h.feature("logout").focus();
    let moves = 0;
    h.group("application").addEventListener("focus", () => moves++);
    h.mock.state.host.dialogOpen = modal;
    h.mock.state.session.state = "logged-out";
    h.emit();
    assert.equal(moves, modal ? 0 : 1);
    if (!modal) assert.ok(h.document.activeElement === h.group("application"));
  });

test("state read-failure retry and empty read-failure retry still refresh accounts", (t) => {
  const h = fixture(t);
  h.mock.state.library.refreshState = "error";
  h.emit();
  h.find('[data-state="refresh-error"]').click();
  assert.equal(h.mock.calls.at(-1).method, "accounts.refresh");
  h.mock.state.library.accounts = [];
  h.mock.state.library.state = "error";
  h.emit();
  const emptyRetry = h.find(
    '.neubrutalism-empty-state [data-action="refresh"]',
  );
  assert.ok(emptyRetry && !emptyRetry.closest("[hidden]"));
  const before = h.mock.calls.length;
  emptyRetry.click();
  assert.equal(h.mock.calls.length, before + 1);
  assert.equal(h.mock.calls.at(-1).method, "accounts.refresh");
});
