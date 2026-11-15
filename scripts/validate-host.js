import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const hostRoot = process.env.HOST_ROOT;
const args = process.argv.slice(2);
if (args.length > 1)
  throw new Error("Usage: node scripts/validate-host.js [theme.zip]");
if (!hostRoot)
  throw new Error(
    "Set HOST_ROOT to a 2FA host checkout with theme API 2 support.",
  );
const { normalizeAppThemeImport } = await import(
  pathToFileURL(resolve(hostRoot, "src/themes/appPackage.js")).href
);
const bytes = new Uint8Array(
  await readFile(
    args[0]
      ? resolve(args[0])
      : new URL("../dist/2fa-theme.zip", import.meta.url),
  ),
);
const pkg = await normalizeAppThemeImport({ bytes });
console.log(
  JSON.stringify(
    {
      validator: "2FA production v2 importer",
      id: pkg.manifest.id,
      packageId: pkg.packageId,
      files: pkg.files.length,
      totalBytes: pkg.totalBytes,
    },
    null,
    2,
  ),
);
