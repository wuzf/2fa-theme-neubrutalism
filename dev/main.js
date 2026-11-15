import { mount } from "../src/theme.js";
import { createSyntheticSdk } from "./synthetic-sdk.js";
import { languages } from "../src/i18n.js";
const previewDialog = document.querySelector("#dev-host-dialog");
let previewReturnFocus = null;
previewDialog.addEventListener("close", () => {
  if (
    previewReturnFocus?.isConnected &&
    !previewReturnFocus.closest("[hidden]")
  )
    previewReturnFocus.focus({ preventScroll: true });
  previewReturnFocus = null;
});
const shell = createSyntheticSdk({
  onCall(method, value) {
    document.querySelector("#dev-output").textContent =
      method +
      "\n" +
      JSON.stringify(
        value,
        (key, item) => (key === "options" ? undefined : item),
        2,
      );
    if (method === "host.open") {
      const request = value.request;
      const action = shell.sdk.host
        .listActions()
        .find((item) =>
          Object.entries(item.request).every(
            ([key, expected]) => request[key] === expected,
          ),
        );
      const chinese = shell.state.preferences.resolvedLanguage.startsWith("zh");
      document.querySelector("#dev-host-title").textContent = action
        ? shell.sdk.i18n.t(action.labelKey)
        : chinese
          ? "示例预览"
          : "Theme preview";
      document.querySelector("#dev-host-description").textContent = chinese
        ? "当前是示例预览。此操作会在正式 2FA 中打开对应窗口；这里不会保存账号或修改数据。请导入主题后在正式页面使用。"
        : "This is a theme preview. This action opens its window in your 2FA app. No accounts or data are saved here. Import the theme to use it in your app.";
      document.querySelector("#dev-host-close").textContent = chinese
        ? "关闭"
        : "Close";
      previewReturnFocus = value.options?.returnFocus || document.activeElement;
      if (!previewDialog.open) previewDialog.showModal();
    }
  },
});
const chineseLabels = {
  loginSubmitBtn: "登录",
  logoutBtn: "退出登录",
  fabAddSecret: "添加账号",
  cardMenuEdit: "编辑",
  cardMenuDelete: "删除",
  cardMenuQRCode: "二维码",
  cardMenuCopyURI: "复制 URI",
  cardMenuCopyLink: "复制链接",
  cardMenuAriaLabel: "账号菜单",
  fabScanQR: "扫码添加",
  fabImport: "导入",
  fabExport: "导出",
  fabBackup: "备份",
  fabTools: "实用工具",
  toolQrDecodeTitle: "识别二维码",
  toolQrGenTitle: "生成二维码",
  toolBase32Title: "Base32 转换",
  pageTimestampTitle: "时间戳转换",
  toolKeyCheckerTitle: "检查密钥",
  toolKeyGenTitle: "生成密钥",
  settingsTabSecurity: "安全设置",
  settingsTabPreferences: "偏好设置",
  settingsTabSync: "同步设置",
  settingsTabCustomCode: "自定义代码",
  settingsTabAbout: "关于",
  pageDocumentation: "使用文档",
  pageFeedback: "反馈问题",
  aboutSourceCode: "源代码",
  versionUpdateAvailable: "🆕 有新版本 {version}",
  appearanceTitle: "外观与主题",
  appearanceSafeMode: "安全恢复",
  pageHiddenAccounts: "隐藏账号",
  offlineQueueView: "待同步更改",
  offlineQueueEditRetry: "编辑并重试",
  retry: "重试",
  offlineQueueCancelChange: "取消更改",
  restoreRefresh: "刷新",
  pageBrowserExtension: "浏览器扩展",
  pwaInstallBtn: "安装应用",
  appTitle: "快速验证码",
  themeLight: "浅色模式",
  themeDark: "深色模式",
  searchInputPlaceholder: "搜索服务或账号",
  searchInputAriaLabel: "搜索账号",
  searchClearAriaLabel: "清除搜索",
  viewModeLabel: "显示方式",
  viewModeGrouped: "按服务分组",
  viewModeFlat: "平铺账号",
  sortModeFlatLabel: "排序",
  sortModeLabel: "组内排序",
  sortOldestFirst: "最早添加",
  sortNewestFirst: "最近添加",
  sortServiceNameAsc: "服务名称 A–Z",
  sortServiceNameDesc: "服务名称 Z–A",
  sortAccountNameAsc: "账号名称 A–Z",
  sortAccountNameDesc: "账号名称 Z–A",
  groupSortLabel: "分组排序",
  groupSortNameAsc: "名称 A–Z",
  groupSortNameDesc: "名称 Z–A",
  searchFoundCount: "{found} / {total}",
  loadingSecrets: "正在加载账号…",
  searchNoMatch: "没有找到匹配的账号",
  emptyTitle: "添加你的第一个账号",
  emptyDesc: "添加账号后，即可在这里查看并复制验证码。",
  emptyAddBtn: "添加账号",
  copyOtpBtnAriaLabel: "复制当前验证码",
  copyOtpBtnTitle: "复制验证码",
  copyNextOtpBtnTitle: "复制下一验证码",
  otpNextLabel: "下一组",
  counterLabel: "计数器",
  loginRequired: "请先登录",
  loginTitle: "登录后查看账号",
  syncWebdavTitle: "WebDAV",
  syncS3Title: "S3",
  syncOneDriveTitle: "OneDrive",
  syncGoogleDriveTitle: "Google Drive",
};
const baseTranslation = shell.sdk.i18n.t;
shell.sdk.i18n.t = (key, params) => {
  let text =
    shell.sdk.getSnapshot().preferences.resolvedLanguage === "zh-CN"
      ? chineseLabels[key] || baseTranslation(key, params)
      : baseTranslation(key, params);
  for (const [name, value] of Object.entries(params || {}))
    text = text.replaceAll("{" + name + "}", String(value));
  return text;
};
await shell.sdk.preferences.set({ language: "zh-CN", theme: "light" });
const sampleAccounts = {
  google: ["Google", "hello@example.invalid"],
  github: ["GitHub", "my-workspace"],
  long: ["Microsoft", "work@example.invalid"],
  hotp: ["YubiKey", "Hardware token"],
  empty: ["Cloudflare", "personal@example.invalid"],
  unicode: ["Figma", "design-team@example.invalid"],
};
for (const account of shell.state.library.accounts) {
  const [service, label] = sampleAccounts[account.ref.id];
  account.service.label = service;
  account.accountLabel = label;
}
shell.sdk.view.setMode("flat");
const appearance = {
  package: {
    id: "neubrutalism-for-2fa",
    name: "Neubrutalism（新粗野主义）",
    version: "1.0.0",
  },
  settings: {
    density: "comfortable",
  },
};
const app = mount({
  root: document.querySelector("#app"),
  sdk: shell.sdk,
  appearance,
});
const initial = structuredClone(shell.state);
const language = document.querySelector("#dev-language");
for (const [value, label] of languages.filter(([value]) => value !== "auto")) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  language.append(option);
}
language.value = "zh-CN";
language.addEventListener("change", () =>
  shell.sdk.preferences.set({ language: language.value }),
);
document
  .querySelector("#dev-theme")
  .addEventListener("change", (event) =>
    shell.sdk.preferences.set({ theme: event.target.value }),
  );
const unsubscribe = shell.sdk.subscribe((snapshot) => {
  document.documentElement.lang = snapshot.preferences.resolvedLanguage;
  document.querySelector("#dev-theme").value =
    snapshot.preferences.resolvedTheme;
  language.value = snapshot.preferences.resolvedLanguage;
});
function setScenario(value) {
  const next = structuredClone(initial);
  next.preferences = structuredClone(shell.state.preferences);
  next.library.view = {
    ...next.library.view,
    ...shell.state.library.view,
    query: "",
    serviceFilter: null,
  };
  if (["empty", "loading", "error", "signed-out"].includes(value))
    next.library.accounts = [];
  if (value === "loading") next.library.state = "loading";
  if (value === "error") next.library.state = "error";
  if (value === "long-text") {
    next.library.accounts[0].service.label =
      "很长的企业服务名称 · A service name that needs room";
    next.library.accounts[0].accountLabel =
      "a-very-long-account-name@synthetic.example.invalid";
  }
  if (value === "offline") {
    next.connectivity = { onlineHint: false, serverState: "offline" };
    next.library.source = "local";
    for (const account of next.library.accounts)
      if (account.type === "HOTP")
        account.otp.current.copyAvailability = "offline";
  }
  if (value === "signed-out")
    next.session = { state: "logged-out", accessVerified: false };
  shell.replace(next);
}
document
  .querySelector("#dev-state")
  .addEventListener("change", (event) => setScenario(event.target.value));
const timer = window.setInterval(() => {
  const now = shell.sdk.clock.now();
  for (const account of shell.state.library.accounts) {
    if (account.type === "HOTP") continue;
    const period = account.period * 1000;
    const start = Math.floor(now / period) * period;
    Object.assign(account.otp.current, {
      validFrom: start,
      validUntil: start + period,
    });
    Object.assign(account.otp.next, {
      validFrom: start + period,
      validUntil: start + 2 * period,
    });
  }
  shell.emit();
}, 1000);
window.neubrutalismPreview = { app, shell, appearance, setScenario };
window.addEventListener(
  "pagehide",
  () => {
    window.clearInterval(timer);
    previewReturnFocus = null;
    previewDialog.close();
    unsubscribe();
    app.unmount();
  },
  { once: true },
);
