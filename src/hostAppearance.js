/** Keep host dialogs and public pages in the theme's black, white and yellow palette. */
export function hostAppearance(_settings = {}, dark = false) {
  return {
    surface: dark ? "#202020" : "#ffffff",
    subtle: dark ? "#111111" : "#f4f4f4",
    hover: dark ? "#333333" : "#eeeeee",
    text: dark ? "#ffffff" : "#000000",
    muted: dark ? "#c4c4c4" : "#545454",
    line: dark ? "#686868" : "#d0d0d0",
    stroke: dark ? "#b0b0b0" : "#000000",
    // The host also uses accent as link text, so yellow needs a dark surface.
    accent: dark ? "#fcc31e" : "#000000",
    accentHover: dark ? "#ffda55" : "#333333",
    accentText: dark ? "#000000" : "#ffffff",
    selected: dark ? "#473b12" : "#fff3c2",
    danger: dark ? "#ffaaa3" : "#a82121",
    dangerBackground: dark ? "#482222" : "#fff0ee",
    dangerFill: dark ? "#ffaaa3" : "#a82121",
    dangerFillHover: dark ? "#ffc6c1" : "#861616",
    dangerText: dark ? "#000000" : "#ffffff",
    warning: dark ? "#f6d775" : "#795700",
    warningBackground: dark ? "#473b12" : "#fff3c2",
    success: dark ? "#a4ddb4" : "#24713b",
    successBackground: dark ? "#203b28" : "#eaf5ed",
    radius: 12,
    controlRadius: 8,
    borderWidth: 2,
    // A black hard shadow vanishes on dark surfaces; the dark board uses yellow.
    shadow: {
      x: 0,
      y: 6,
      blur: 0,
      spread: 0,
      color: dark ? "#fcc31e" : "#000000",
    },
    controlShadow: { x: 0, y: 5, blur: 0, spread: 0, color: "#000000" },
    fontFamily: [
      "Century Gothic",
      "Avenir Next",
      "Avenir",
      "Segoe UI",
      "PingFang SC",
      "Microsoft YaHei",
      "sans-serif",
    ],
  };
}
