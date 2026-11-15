import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Window } from "happy-dom";
import { mount, tileSpans } from "../src/theme.js";
import { theme } from "../theme.config.js";
import { createSyntheticSdk } from "../dev/synthetic-sdk.js";

const css = async () =>
  (
    await Promise.all(
      theme.styles.map((path) =>
        readFile(new URL("../" + path, import.meta.url), "utf8"),
      ),
    )
  ).join("\n");

test("every group's rows are filled with a wide lead tile beside small ones", () => {
  for (const columns of [2, 3, 4]) {
    for (let count = 2; count <= 13; count++) {
      const spans = tileSpans(count, columns);
      assert.equal(spans.length, count);
      const sum = spans.reduce((total, span) => total + span, 0);
      assert.equal(sum % columns, 0, `${count} tiles on ${columns} columns`);
      assert.ok(spans.every((span) => span >= 1 && span <= columns));
    }
  }
  assert.deepEqual(tileSpans(2, 4), [2, 2]);
  assert.deepEqual(tileSpans(3, 4), [2, 1, 1]);
  // A last tile alone joins the row above: two wide tiles in each row.
  assert.deepEqual(tileSpans(4, 4), [2, 2, 2, 2]);
  // The lead tile changes sides every row.
  assert.deepEqual(tileSpans(6, 4), [2, 1, 1, 1, 1, 2]);
  assert.deepEqual(tileSpans(1, 4), [2]);
  assert.deepEqual(tileSpans(3, 1), [1, 1, 1]);
});

test("no tile spans two rows any more", async () => {
  const styles = await css();
  assert.doesNotMatch(styles, /grid-row:\s*span/);
  assert.doesNotMatch(styles, /nth-child\(6n \+ 1\)\s*\{[^}]*grid-column/);
  // The card-era compact rules that bento.css overrode are gone.
  const application = await readFile(
    new URL("../src/styles/application.css", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(application, /data-density="compact"/);
});

async function fixture(t, settings = {}) {
  const window = new Window({ url: "https://neubrutalism.test/" });
  const style = window.document.createElement("style");
  style.textContent = await css();
  window.document.head.append(style);
  const root = window.document.createElement("div");
  window.document.body.append(root);
  const mock = createSyntheticSdk();
  const template = mock.state.library.accounts[0];
  let index = 0;
  mock.state.library.accounts = [
    ["Two", 2],
    ["Four", 4],
  ].flatMap(([label, count]) =>
    Array.from({ length: count }, () => ({
      ...structuredClone(template),
      ref: { id: `account-${index++}`, generation: 1 },
      service: { label, groupId: label },
    })),
  );
  mock.emit();
  const app = mount({ root, sdk: mock.sdk, appearance: { settings } });
  t.after(async () => {
    app.unmount();
    await window.happyDOM.abort();
  });
  return { window, root, app };
}

test("tiles take their spans from the board's real column count", async (t) => {
  const h = await fixture(t);
  // happy-dom does not lay out grids: report the resolved tracks.
  const computed = h.window.getComputedStyle.bind(h.window);
  let columns = 4;
  h.window.getComputedStyle = (node) =>
    node.classList?.contains("neubrutalism-account-grid")
      ? { gridTemplateColumns: Array(columns).fill("300px").join(" ") }
      : computed(node);
  // Groups by size: the view's group order does not matter here.
  const spans = () =>
    [...h.root.querySelectorAll(".neubrutalism-account-grid")]
      .map((grid) =>
        [...grid.children].map((tile) => [
          tile.style.gridColumn,
          tile.dataset.wide,
        ]),
      )
      .sort((a, b) => a.length - b.length);
  h.window.dispatchEvent(new h.window.Event("resize"));
  assert.deepEqual(spans(), [
    [
      ["span 2", "true"],
      ["span 2", "true"],
    ],
    [
      ["span 2", "true"],
      ["span 2", "true"],
      ["span 2", "true"],
      ["span 2", "true"],
    ],
  ]);
  columns = 1;
  h.window.dispatchEvent(new h.window.Event("resize"));
  assert.ok(
    spans()
      .flat()
      .every(([span, wide]) => span === "" && wide === "false"),
  );
});

test("compact tiles lose padding and the large code shrinks", async (t) => {
  const comfortable = await fixture(t, { density: "comfortable" });
  const compact = await fixture(t, { density: "compact" });
  const tile = (h) =>
    h.window.getComputedStyle(h.root.querySelector(".neubrutalism-card"));
  assert.ok(
    parseFloat(tile(compact).paddingTop) <
      parseFloat(tile(comfortable).paddingTop),
  );
  const value = (h) =>
    parseFloat(
      h.window.getComputedStyle(h.root.querySelector(".neubrutalism-otp-value"))
        .fontSize,
    );
  assert.ok(value(compact) < value(comfortable));
});
