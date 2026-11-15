import { hostAppearance } from "../src/hostAppearance.js";

/** Static data for login pages and host dialogs; no theme script runs before login. */
export function createPublicAppearance() {
  return {
    formatVersion: 1,
    light: hostAppearance({}, false),
    dark: hostAppearance({}, true),
    fonts: [],
    variants: [],
  };
}
