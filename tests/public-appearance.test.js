import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createPublicAppearance } from "../scripts/publicAppearance.js";
import { hostAppearance } from "../src/hostAppearance.js";
import { theme } from "../theme.config.js";

const description = createPublicAppearance();
const defaults = Object.fromEntries(
  theme.settings.map(({ key, default: value }) => [key, value]),
);
const combinations = theme.settings.reduce(
  (current, field) =>
    current.flatMap((settings) =>
      (field.type === "boolean"
        ? [false, true]
        : field.options.map(({ value }) => value)
      ).map((value) => ({ ...settings, [field.key]: value })),
    ),
  [{}],
);

test("public data resolves to runtime tokens for every declared setting combination", () => {
  assert.equal(combinations.length, 2);
  for (const settings of combinations) {
    for (const mode of ["light", "dark"]) {
      const resolved = { ...description[mode] };
      for (const variant of description.variants)
        Object.assign(
          resolved,
          variant.values[String(settings[variant.setting])][mode],
        );
      assert.deepEqual(
        resolved,
        hostAppearance(settings, mode === "dark"),
        JSON.stringify({ settings, mode }),
      );
    }
  }
  assert.deepEqual(description.light, hostAppearance(defaults, false));
  assert.deepEqual(description.dark, hostAppearance(defaults, true));
});

test("public descriptor contains only finite visual variants within the public budget", () => {
  assert.deepEqual(Object.keys(description), [
    "formatVersion",
    "light",
    "dark",
    "fonts",
    "variants",
  ]);
  assert.equal(description.formatVersion, 1);
  assert.deepEqual(
    description.variants.map(({ setting }) => setting),
    [],
  );
  assert.ok(
    Buffer.byteLength(JSON.stringify(description, null, 2)) < 128 * 1024,
  );
  for (const variant of description.variants) {
    const field = theme.settings.find(({ key }) => key === variant.setting);
    assert.deepEqual(
      Object.keys(variant.values).sort(),
      (field.type === "boolean"
        ? ["false", "true"]
        : field.options.map(({ value }) => value)
      ).sort(),
    );
    assert.ok(Object.keys(variant.values).length <= 16);
    for (const tokens of Object.values(variant.values))
      assert.deepEqual(Object.keys(tokens), ["light", "dark"]);
  }
});

test("public typography uses local system fonts without external assets", async () => {
  assert.deepEqual(description.fonts, []);
  const css = await readFile(
    new URL("../src/styles/tokens.css", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(css, /@font-face|https?:\/\//);
  for (const mode of ["light", "dark"]) {
    assert.ok(description[mode].fontFamily.includes("Century Gothic"));
    assert.ok(description[mode].fontFamily.includes("sans-serif"));
  }
});
