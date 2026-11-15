import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(
  new URL("../src/styles/components.css", import.meta.url),
  "utf8",
);
const block = (selector) => {
  const at = css.indexOf(selector + " {");
  assert.notEqual(at, -1, selector);
  return css.slice(at, css.indexOf("}", at));
};

// The pixel check measured the font glyph about 2px off its button's centre.
test("the account menu dots are drawn and centred, not a font glyph", () => {
  const button = block(
    ".neubrutalism-theme .neubrutalism-account-menu > .neubrutalism-button",
  );
  assert.match(button, /font-size: 0;/);
  const dots = block(
    ".neubrutalism-theme .neubrutalism-account-menu > .neubrutalism-button::before",
  );
  assert.match(dots, /position: absolute;/);
  assert.match(dots, /transform: translate\(-50%, -50%\);/);
});
