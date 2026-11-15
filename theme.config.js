export const theme = {
  themeApiVersion: 2,
  kind: "app",
  sdkApiVersion: 1,
  id: "neubrutalism-for-2fa",
  name: "Neubrutalism（新粗野主义）",
  version: "1.0.0",
  author: "2FA Theme Contributors",
  description:
    "新粗野主义 2FA 主题：撞色便当盒看板、粗黑描边与硬阴影，底部悬浮操作条。",
  entry: "src/theme.js",
  preview: "preview.webp",
  styles: [
    "src/styles/tokens.css",
    "src/styles/components.css",
    "src/styles/application.css",
    "src/styles/bento.css",
  ],
  capabilities: ["accounts", "host-flows", "preferences"],
  settings: [
    {
      key: "density",
      type: "select",
      label: "信息密度 / Density",
      default: "comfortable",
      options: [
        { value: "comfortable", label: "舒适 / Comfortable" },
        { value: "compact", label: "紧凑 / Compact" },
      ],
    },
  ],
};
