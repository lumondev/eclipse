
"use strict";

const config = window._CONFIG || {};
const SETTINGS = {
  searchEngine: config.searchEngine || "https://www.google.com/search?q=%s",
  musicUrl: config.musicUrl || "",
  moviesUrl: config.moviesUrl || "",
  musicProxied:
    typeof config.musicProxied === "boolean" ? config.musicProxied : true,
  moviesProxied:
    typeof config.moviesProxied === "boolean" ? config.moviesProxied : true,
  localGameBase: config.localGameBase || "/storage/games/",
  localGameImageBase: config.localGameImageBase || "/storage/game-images/",
  localAppImageBase: config.localAppImageBase || "/storage/app-images/",
};

const BUILTIN_SHORTCUTS = [
  { id: "games", label: "Games", url: "eclipse://games", icon: "Eclipse-2/game.png" },
  { id: "ai", label: "AI", url: "eclipse://ai", icon: "Eclipse-2/ai.png" },
  { id: "music", label: "Music", url: "eclipse://music", icon: "Eclipse-2/music.png" },
  { id: "movies", label: "Movies", url: "eclipse://movies", icon: "Eclipse-2/movie.png" },
  { id: "apps", label: "Apps", url: "eclipse://apps", icon: "Eclipse-2/apps.png" },
  { id: "chat", label: "Chat", url: "eclipse://chat", icon: "Eclipse-2/msg.svg" },
];

const GAMES = Array.isArray(config.games) ? config.games : [];
const APPS = Array.isArray(config.apps) ? config.apps : [];
const DEFAULT_EXTENSIONS = Array.isArray(config.extensions) ? config.extensions : [];

const DEVICE_PROFILES = {
  default: {
    label: "Default",
    userAgent: "",
    platform: "",
    maxTouchPoints: 0,
    mobile: false,
  },
  desktop: {
    label: "Desktop",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    platform: "Win32",
    maxTouchPoints: 0,
    mobile: false,
  },
  mobile: {
    label: "Mobile",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    maxTouchPoints: 5,
    mobile: true,
  },
  tablet: {
    label: "Tablet",
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    platform: "iPad",
    maxTouchPoints: 5,
    mobile: true,
  },
};

const INTERNAL_TITLES = {
  newtab: "New Tab",
  games: "Games",
  apps: "Apps",
  ai: "AI",
  music: "Music",
  movies: "Movies",
  chat: "Chat",
  bookmarks: "Bookmarks",
  extensions: "Extensions",
  settings: "Settings",
};

const SHORTCUTS_KEY = "eclipse.shortcuts";
const BOOKMARKS_KEY = "eclipse.bookmarks";
const EXTENSIONS_KEY = "eclipse.extensions";
const DEVICE_SPOOF_KEY = "eclipse.deviceSpoof";
const CONSOLE_IGNORE_KEY = "eclipse.consoleIgnore";

const dom = {
  sidebar: document.getElementById("sidebar"),
  sidebarToggle: document.getElementById("sidebar-toggle"),
  homeBtn: document.getElementById("home-btn"),
  newTabBtn: document.getElementById("new-tab-btn"),
  tabDots: document.getElementById("tab-dots"),
  tabList: document.getElementById("tab-list"),
  favoritesList: document.getElementById("favorites-list"),
  favoritesToggle: document.getElementById("favorites-toggle"),
  content: document.getElementById("content"),
  internalView: document.getElementById("internal-view"),
  frameHost: document.getElementById("frame-host"),
  urlInput: document.getElementById("url-input"),
  backBtn: document.getElementById("back-btn"),
  forwardBtn: document.getElementById("forward-btn"),
  refreshBtn: document.getElementById("refresh-btn"),
  gamesTop: document.getElementById("games-btn-top"),
  aiTop: document.getElementById("ai-btn-top"),
  chatTop: document.getElementById("chat-btn-top"),
  moreBtn: document.getElementById("more-btn"),
  moreMenu: document.getElementById("more-menu"),
  newtabForm: document.getElementById("newtab-form"),
  newtabSearch: document.getElementById("newtab-search"),
  shortcutGrid: document.getElementById("shortcut-grid"),
  shortcutModal: document.getElementById("shortcut-modal"),
  shortcutForm: document.getElementById("shortcut-form"),
  shortcutTitle: document.getElementById("shortcut-title"),
  shortcutUrl: document.getElementById("shortcut-url"),
  gamesGrid: document.getElementById("games-grid"),
  appsGrid: document.getElementById("apps-grid"),
  bookmarkForm: document.getElementById("bookmark-form"),
  bookmarkTitle: document.getElementById("bookmark-title"),
  bookmarkUrl: document.getElementById("bookmark-url"),
  bookmarkFolder: document.getElementById("bookmark-folder"),
  bookmarkList: document.getElementById("bookmark-list"),
  bookmarkFavorites: document.getElementById("bookmark-favorites"),
  extensionForm: document.getElementById("extension-form"),
  extensionName: document.getElementById("extension-name"),
  extensionMatch: document.getElementById("extension-match"),
  extensionCode: document.getElementById("extension-code"),
  extensionList: document.getElementById("extension-list"),
  deviceSpoof: document.getElementById("device-spoof"),
  consoleToggle: document.getElementById("console-toggle"),
  consolePanel: document.getElementById("console-panel"),
  consoleLog: document.getElementById("console-log"),
  consoleForm: document.getElementById("console-form"),
  consoleInput: document.getElementById("console-input"),
  consoleIgnore: document.getElementById("console-ignore"),
  elementsView: document.getElementById("elements-view"),
  sourcesView: document.getElementById("sources-view"),
  networkView: document.getElementById("network-view"),
  toast: document.getElementById("toast"),
};

const state = {
  tabs: [],
  currentTabId: null,
  zoom: 1,
  favoritesOpen: true,
  bookmarks: null,
  extensions: null,
  deviceSpoof: "default",
  consoleIgnore: false,
};

const { ScramjetController } = $scramjetLoadController();
const scramjet = new ScramjetController({
  files: {
    wasm: "/scram/scramjet.wasm.wasm",
    all: "/scram/scramjet.all.js",
    sync: "/scram/scramjet.sync.js",
  },
});

scramjet.init();
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
let transportReady = null;

function init() {
  state.bookmarks = loadBookmarks();
  state.extensions = loadExtensions();
  state.deviceSpoof = loadDeviceSpoof();
  state.consoleIgnore = loadConsoleIgnore();

  if (dom.deviceSpoof) dom.deviceSpoof.value = state.deviceSpoof;
  if (dom.consoleIgnore) dom.consoleIgnore.checked = state.consoleIgnore;

  wireEvents();
  renderShortcuts();
  renderGames();
  renderApps();
  renderBookmarks();
  renderExtensions();

  createTab("eclipse://newtab", { activate: true });
}
function wireEvents() {
  dom.sidebarToggle.addEventListener("click", toggleSidebar);
  dom.homeBtn.addEventListener("click", () => {
    const tab = currentTab();
    if (tab) navigate(tab, "eclipse://newtab");
  });
  if (dom.newTabBtn) {
    dom.newTabBtn.addEventListener("click", () => {
      createTab("eclipse://newtab", { activate: true });
    });
  }

  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => handleNav(btn.dataset.nav));
  });

  dom.gamesTop.addEventListener("click", () => handleNav("games"));
  dom.aiTop.addEventListener("click", () => handleNav("ai"));
  dom.chatTop.addEventListener("click", () => handleNav("chat"));

  dom.urlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddressSubmit(dom.urlInput.value);
    }
  });

  dom.newtabForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleAddressSubmit(dom.newtabSearch.value);
  });

  dom.backBtn.addEventListener("click", goBack);
  dom.forwardBtn.addEventListener("click", goForward);
  dom.refreshBtn.addEventListener("click", refreshTab);

  dom.moreBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu();
  });

  dom.moreMenu.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    handleMenuAction(button.dataset.action);
  });

  dom.shortcutGrid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-shortcut]");
    if (!card) return;
    const action = card.dataset.action;
    if (action === "add") {
      openShortcutModal();
      return;
    }
    const url = card.dataset.url;
    if (url) openShortcut(url);
  });

  dom.shortcutForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = dom.shortcutTitle.value.trim();
    const url = dom.shortcutUrl.value.trim();
    if (!title || !url) return;
    const shortcuts = loadShortcuts();
    shortcuts.push({ title, url });
    saveShortcuts(shortcuts);
    renderShortcuts();
    closeShortcutModal();
  });

  dom.shortcutModal.addEventListener("click", (event) => {
    if (event.target === dom.shortcutModal) closeShortcutModal();
    const closeBtn = event.target.closest("[data-close='shortcut']");
    if (closeBtn) closeShortcutModal();
  });

  dom.bookmarkForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = dom.bookmarkTitle.value.trim();
    const url = dom.bookmarkUrl.value.trim();
    if (!title || !url) return;
    const folder = dom.bookmarkFolder.value;
    addBookmark({ title, url }, folder === "favorites" ? "favorites" : "items");
    dom.bookmarkTitle.value = "";
    dom.bookmarkUrl.value = "";
    renderBookmarks();
  });

  dom.extensionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = dom.extensionName.value.trim();
    const match = dom.extensionMatch.value.trim();
    const code = dom.extensionCode.value.trim();
    if (!name || !match || !code) return;
    state.extensions.push({
      id: generateId(),
      name,
      match,
      code,
      enabled: true,
    });
    saveExtensions();
    renderExtensions();
    dom.extensionName.value = "";
    dom.extensionMatch.value = "";
    dom.extensionCode.value = "";
  });

  dom.extensionList.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-toggle-extension]");
    if (toggle) {
      const id = toggle.dataset.toggleExtension;
      const ext = state.extensions.find((item) => item.id === id);
      if (ext) {
        ext.enabled = !ext.enabled;
        saveExtensions();
        renderExtensions();
      }
      return;
    }
    const remove = event.target.closest("[data-remove-extension]");
    if (remove) {
      const id = remove.dataset.removeExtension;
      state.extensions = state.extensions.filter((item) => item.id !== id);
      saveExtensions();
      renderExtensions();
    }
  });

  dom.tabList.addEventListener("click", (event) => {
    const row = event.target.closest("[data-tab-id]");
    if (!row) return;
    const tabId = row.dataset.tabId;
    const action = event.target.closest("[data-action]");
    if (action) {
      handleTabAction(tabId, action.dataset.action);
      return;
    }
    setActiveTab(tabId);
  });

  dom.tabDots.addEventListener("click", (event) => {
    const dot = event.target.closest("[data-tab-id]");
    if (!dot) return;
    setActiveTab(dot.dataset.tabId);
  });

  dom.favoritesToggle.addEventListener("click", () => {
    state.favoritesOpen = !state.favoritesOpen;
    dom.favoritesToggle.classList.toggle("collapsed", !state.favoritesOpen);
    dom.favoritesList.classList.toggle("collapsed", !state.favoritesOpen);
  });

  if (dom.deviceSpoof) {
    dom.deviceSpoof.addEventListener("change", () => {
      state.deviceSpoof = dom.deviceSpoof.value;
      saveDeviceSpoof();
      applyDeviceSpoofToAllTabs();
      showToast(`Device spoof set to ${DEVICE_PROFILES[state.deviceSpoof]?.label || "Default"}.`);
    });
  }

  if (dom.consoleToggle) {
    dom.consoleToggle.addEventListener("click", () => {
      toggleConsolePanel();
    });
  }

  if (dom.consoleForm) {
    dom.consoleForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const code = dom.consoleInput.value.trim();
      if (!code) return;
      runConsoleCommand(code);
      dom.consoleInput.value = "";
    });
  }

  if (dom.consoleIgnore) {
    dom.consoleIgnore.addEventListener("change", () => {
      state.consoleIgnore = dom.consoleIgnore.checked;
      saveConsoleIgnore();
      showToast(state.consoleIgnore ? "Page logs hidden." : "Page logs visible.");
    });
  }

  document.querySelectorAll("[data-console-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setConsoleTab(btn.dataset.consoleTab);
    });
  });

  document.addEventListener("click", (event) => {
    if (!dom.moreMenu.contains(event.target) && !dom.moreBtn.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      focusNewtabSearch();
    }
  });

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.type !== "eclipse-console") return;
    appendConsoleEntry(data.level, data.args, "page");
  });

  window.addEventListener("resize", positionMenu);
}

function toggleSidebar() {
  dom.sidebar.classList.toggle("expanded");
}

function handleNav(target) {
  const tab = currentTab();
  if (!tab) return;
  if (target === "music") {
    openMusic(tab);
    return;
  }
  if (target === "movies") {
    openMovies(tab);
    return;
  }
  navigate(tab, `eclipse://${target}`);
}

function handleAddressSubmit(input) {
  const tab = currentTab();
  if (!tab) return;
  const target = resolveInput(input);
  if (!target) return;
  navigate(tab, target);
}

function resolveInput(input) {
  const value = (input || "").trim();
  if (!value) return "";
  if (value.startsWith("eclipse://")) return value;
  return search(value, SETTINGS.searchEngine);
}
function createTab(url, options = {}) {
  const tab = {
    id: generateId(),
    title: "New Tab",
    url,
    mode: "internal",
    pinned: false,
    favorite: false,
    history: [url],
    historyIndex: 0,
    scramjetFrame: null,
    directFrame: null,
  };
  state.tabs.push(tab);
  if (options.activate !== false) setActiveTab(tab.id);
  renderTabs();
}

function setActiveTab(tabId) {
  state.currentTabId = tabId;
  const tab = currentTab();
  if (tab) showTab(tab);
  renderTabs();
}

function currentTab() {
  return state.tabs.find((tab) => tab.id === state.currentTabId) || null;
}

function showTab(tab) {
  updateAddressBar(tab.url);
  if (tab.mode === "internal") {
    showInternal(tab.url);
  } else {
    showFrame(tab);
  }
}

function navigate(tab, url, options = {}) {
  const normalized = normalizeUrl(url);
  if (!normalized) return;
  if (options.pushHistory !== false) pushHistory(tab, normalized);
  tab.url = normalized;

  const internalView = getInternalView(normalized);
  if (internalView) {
    tab.mode = "internal";
    tab.title = INTERNAL_TITLES[internalView] || "Eclipse";
    showInternal(normalized);
    renderTabs();
    return;
  }

  const unproxied = options.unproxied === true;
  tab.mode = unproxied ? "direct" : "scramjet";
  tab.title = deriveTitleFromUrl(normalized);
  renderTabs();

  if (unproxied) {
    openDirect(tab, normalized);
  } else {
    openProxied(tab, normalized);
  }
}

function normalizeUrl(url) {
  if (!url) return "";
  if (url.startsWith("eclipse://")) return url;
  return url;
}

function getInternalView(url) {
  if (!url.startsWith("eclipse://")) return "";
  const path = url.slice("eclipse://".length).split(/[?#]/)[0];
  return path ? path.toLowerCase() : "newtab";
}

function showInternal(url) {
  const view = getInternalView(url) || "newtab";
  dom.content.classList.remove("show-frames");
  setActiveView(view);
  updateAddressBar(`eclipse://${view}`);
  if (view === "newtab") {
    setTimeout(() => dom.newtabSearch.focus(), 50);
  }
}

function setActiveView(view) {
  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("active", section.dataset.view === view);
  });
}

function showFrame(tab) {
  dom.content.classList.add("show-frames");
  const frames = dom.frameHost.querySelectorAll("iframe");
  frames.forEach((frame) => {
    frame.style.display = "none";
  });

  const frame = tab.mode === "direct" ? tab.directFrame : tab.scramjetFrame?.frame;
  if (frame) frame.style.display = "block";
}

async function openProxied(tab, url) {
  try {
    await ensureTransport();
  } catch (err) {
    showToast("Scramjet failed to initialize.");
    console.error(err);
  }

  if (!tab.scramjetFrame) {
    tab.scramjetFrame = scramjet.createFrame();
    tab.scramjetFrame.frame.className = "scramjet-frame";
    dom.frameHost.appendChild(tab.scramjetFrame.frame);
    attachFrameListeners(tab, tab.scramjetFrame.frame);
  }

  showFrame(tab);
  tab.scramjetFrame.go(url);
}

function openDirect(tab, url) {
  if (!tab.directFrame) {
    const iframe = document.createElement("iframe");
    iframe.className = "direct-frame";
    iframe.setAttribute("allow", "fullscreen");
    dom.frameHost.appendChild(iframe);
    tab.directFrame = iframe;
    attachFrameListeners(tab, iframe);
  }
  showFrame(tab);
  tab.directFrame.src = url;
}

async function ensureTransport() {
  if (transportReady) return transportReady;
  transportReady = (async () => {
    await registerSW();
    const wispUrl =
      (location.protocol === "https:" ? "wss" : "ws") +
      "://" +
      location.host +
      "/wisp/";
    if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
      await connection.setTransport("/libcurl/index.mjs", [
        { websocket: wispUrl },
      ]);
    }
  })();
  return transportReady;
}

function attachFrameListeners(tab, frame) {
  frame.addEventListener("load", () => {
    applyDeviceSpoof(tab, frame);
    attachConsoleBridge(frame);
    updateTitleFromFrame(tab, frame);
    syncAddressFromFrame(tab, frame);
    runExtensions(tab, frame);
  });

  if (!frame.__eclipseNavHooked) {
    frame.__eclipseNavHooked = true;
    try {
      frame.contentWindow?.addEventListener("hashchange", () => syncAddressFromFrame(tab, frame));
      frame.contentWindow?.addEventListener("popstate", () => syncAddressFromFrame(tab, frame));
    } catch (err) {
      return;
    }
  }
}

function updateTitleFromFrame(tab, frame) {
  try {
    const title = frame.contentDocument?.title;
    if (title) {
      tab.title = title;
      renderTabs();
    }
  } catch (err) {
    return;
  }
}

function syncAddressFromFrame(tab, frame) {
  try {
    const href = frame.contentWindow?.location?.href;
    if (!href || href === "about:blank") return;
    if (href !== tab.url) {
      tab.url = href;
      updateAddressBar(href);
      renderTabs();
    }
  } catch (err) {
    return;
  }
}

function applyDeviceSpoofToAllTabs() {
  state.tabs.forEach((tab) => {
    const frame = tab.mode === "direct" ? tab.directFrame : tab.scramjetFrame?.frame;
    if (frame) applyDeviceSpoof(tab, frame);
  });
}

function applyDeviceSpoof(tab, frame) {
  const profile = DEVICE_PROFILES[state.deviceSpoof];
  if (!profile || !profile.userAgent) return;
  try {
    const doc = frame.contentDocument;
    if (!doc) return;
    const payload = {
      userAgent: profile.userAgent,
      platform: profile.platform,
      maxTouchPoints: profile.maxTouchPoints,
      mobile: profile.mobile,
    };
    const script = doc.createElement("script");
    script.textContent = `(function(){\n` +
      `const profile = ${JSON.stringify(payload)};\n` +
      `const override = (obj, prop, value) => { try { Object.defineProperty(obj, prop, { get: () => value, configurable: true }); } catch (e) {} };\n` +
      `override(Navigator.prototype, "userAgent", profile.userAgent);\n` +
      `override(Navigator.prototype, "platform", profile.platform);\n` +
      `override(Navigator.prototype, "maxTouchPoints", profile.maxTouchPoints);\n` +
      `if (navigator.userAgentData) { override(Navigator.prototype, "userAgentData", { mobile: profile.mobile, platform: profile.platform, brands: [] }); }\n` +
      `})();`;
    doc.documentElement.appendChild(script);
    script.remove();
  } catch (err) {
    return;
  }
}

function attachConsoleBridge(frame) {
  try {
    const doc = frame.contentDocument;
    if (!doc) return;
    const script = doc.createElement("script");
    script.textContent = `(function(){\n` +
      `if (window.__eclipseConsoleBridge) return; window.__eclipseConsoleBridge = true;\n` +
      `const send = (level, args) => { try { window.parent.postMessage({ type: "eclipse-console", level, args }, "*"); } catch (e) {} };\n` +
      `const format = (value) => { try { return typeof value === "string" ? value : JSON.stringify(value); } catch (e) { return String(value); } };\n` +
      `["log","info","warn","error","debug"].forEach((level) => {\n` +
      `  const original = console[level] ? console[level].bind(console) : null;\n` +
      `  console[level] = (...args) => { send(level, args.map(format)); if (original) original(...args); };\n` +
      `});\n` +
      `window.addEventListener("error", (event) => { send("error", [event.message || "Script error"]); });\n` +
      `})();`;
    doc.documentElement.appendChild(script);
    script.remove();
  } catch (err) {
    return;
  }
}

function runExtensions(tab, frame) {
  const url = tab.url;
  state.extensions.forEach((ext) => {
    if (!ext.enabled) return;
    if (!urlMatches(url, ext.match)) return;
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      const script = doc.createElement("script");
      script.textContent = ext.code;
      doc.documentElement.appendChild(script);
      script.remove();
    } catch (err) {
      console.error(err);
      showToast(`Extension failed: ${ext.name}`);
    }
  });
}

function urlMatches(url, match) {
  if (!match) return false;
  if (match === "*") return true;
  if (match.startsWith("/") && match.endsWith("/")) {
    try {
      const regex = new RegExp(match.slice(1, -1));
      return regex.test(url);
    } catch (err) {
      return false;
    }
  }
  return url.includes(match);
}

function updateAddressBar(value) {
  dom.urlInput.value = value || "";
}

function pushHistory(tab, url) {
  if (!tab.history) tab.history = [];
  if (tab.historyIndex < tab.history.length - 1) {
    tab.history = tab.history.slice(0, tab.historyIndex + 1);
  }
  tab.history.push(url);
  tab.historyIndex = tab.history.length - 1;
}

function goBack() {
  const tab = currentTab();
  if (!tab) return;
  if (tab.historyIndex > 0) {
    tab.historyIndex -= 1;
    navigate(tab, tab.history[tab.historyIndex], { pushHistory: false });
  }
}

function goForward() {
  const tab = currentTab();
  if (!tab) return;
  if (tab.historyIndex < tab.history.length - 1) {
    tab.historyIndex += 1;
    navigate(tab, tab.history[tab.historyIndex], { pushHistory: false });
  }
}

function refreshTab() {
  const tab = currentTab();
  if (!tab) return;
  if (tab.mode === "internal") {
    showInternal(tab.url);
    return;
  }
  if (tab.mode === "direct" && tab.directFrame) {
    try {
      tab.directFrame.contentWindow.location.reload();
    } catch (err) {
      tab.directFrame.src = tab.url;
    }
    return;
  }
  if (tab.mode === "scramjet" && tab.scramjetFrame) {
    tab.scramjetFrame.go(tab.url);
  }
}

function handleMenuAction(action) {
  const tab = currentTab();
  switch (action) {
    case "new-tab":
      createTab("eclipse://newtab", { activate: true });
      break;
    case "close-tab":
      if (tab) closeTab(tab.id);
      break;
    case "close-all":
      closeAllTabs();
      break;
    case "zoom-in":
      adjustZoom(0.1);
      break;
    case "zoom-out":
      adjustZoom(-0.1);
      break;
    case "full-screen":
      toggleFullScreen();
      break;
    case "extensions":
      if (tab) navigate(tab, "eclipse://extensions");
      break;
    case "bookmarks":
      if (tab) navigate(tab, "eclipse://bookmarks");
      break;
    case "shortcut-games":
      if (tab) navigate(tab, "eclipse://games");
      break;
    case "shortcut-ai":
      if (tab) navigate(tab, "eclipse://ai");
      break;
    case "shortcut-music":
      if (tab) openMusic(tab);
      break;
    case "shortcut-movies":
      if (tab) openMovies(tab);
      break;
    case "shortcut-apps":
      if (tab) navigate(tab, "eclipse://apps");
      break;
    case "copy-url":
      if (tab) copyUrl(tab.url);
      break;
    case "settings":
      if (tab) navigate(tab, "eclipse://settings");
      break;
    default:
      break;
  }
  closeMenu();
}

function toggleMenu() {
  dom.moreMenu.classList.toggle("open");
  const isOpen = dom.moreMenu.classList.contains("open");
  dom.moreMenu.setAttribute("aria-hidden", String(!isOpen));
  if (isOpen) positionMenu();
}

function closeMenu() {
  dom.moreMenu.classList.remove("open");
  dom.moreMenu.setAttribute("aria-hidden", "true");
}

function positionMenu() {
  if (!dom.moreMenu.classList.contains("open")) return;
  const rect = dom.moreBtn.getBoundingClientRect();
  const right = window.innerWidth - rect.right;
  dom.moreMenu.style.top = `${rect.bottom + 8}px`;
  dom.moreMenu.style.right = `${right}px`;
}

function focusNewtabSearch() {
  const tab = currentTab();
  if (!tab) return;
  navigate(tab, "eclipse://newtab");
  setTimeout(() => dom.newtabSearch.focus(), 50);
}

function openShortcutModal() {
  dom.shortcutModal.classList.add("open");
  dom.shortcutTitle.value = "";
  dom.shortcutUrl.value = "";
  dom.shortcutTitle.focus();
}

function closeShortcutModal() {
  dom.shortcutModal.classList.remove("open");
}

function openShortcut(url) {
  const tab = currentTab();
  if (!tab) return;
  if (url.startsWith("eclipse://")) {
    navigate(tab, url);
    return;
  }
  navigate(tab, url);
}

function openMusic(tab) {
  if (!SETTINGS.musicUrl) {
    navigate(tab, "eclipse://music");
    return;
  }
  navigate(tab, SETTINGS.musicUrl, { unproxied: !SETTINGS.musicProxied });
}

function openMovies(tab) {
  if (!SETTINGS.moviesUrl) {
    navigate(tab, "eclipse://movies");
    return;
  }
  navigate(tab, SETTINGS.moviesUrl, { unproxied: !SETTINGS.moviesProxied });
}

function closeTab(tabId) {
  const index = state.tabs.findIndex((tab) => tab.id === tabId);
  if (index === -1) return;
  const tab = state.tabs[index];
  if (tab.scramjetFrame?.frame) tab.scramjetFrame.frame.remove();
  if (tab.directFrame) tab.directFrame.remove();
  state.tabs.splice(index, 1);

  if (state.tabs.length === 0) {
    createTab("eclipse://newtab", { activate: true });
    return;
  }

  if (tabId === state.currentTabId) {
    const next = state.tabs[Math.max(0, index - 1)];
    setActiveTab(next.id);
  }

  renderTabs();
}

function closeAllTabs() {
  state.tabs.forEach((tab) => {
    if (tab.scramjetFrame?.frame) tab.scramjetFrame.frame.remove();
    if (tab.directFrame) tab.directFrame.remove();
  });
  state.tabs = [];
  createTab("eclipse://newtab", { activate: true });
}

function handleTabAction(tabId, action) {
  const tab = state.tabs.find((item) => item.id === tabId);
  if (!tab) return;
  if (action === "close") {
    closeTab(tabId);
    return;
  }
  if (action === "pin") {
    tab.pinned = !tab.pinned;
    renderTabs();
    return;
  }
  if (action === "favorite") {
    tab.favorite = !tab.favorite;
    if (tab.favorite) {
      addBookmark({ title: tab.title, url: tab.url }, "favorites");
    } else {
      removeBookmark(tab.url, "favorites");
    }
    renderTabs();
    renderBookmarks();
  }
}

function renderTabs() {
  const sorted = [...state.tabs].sort((a, b) => {
    if (a.pinned === b.pinned) return 0;
    return a.pinned ? -1 : 1;
  });

  dom.tabList.innerHTML = "";
  dom.tabDots.innerHTML = "";

  sorted.forEach((tab) => {
    const row = document.createElement("div");
    row.className = "tab-row" + (tab.id === state.currentTabId ? " active" : "");
    row.dataset.tabId = tab.id;

    const title = document.createElement("div");
    title.className = "tab-title";
    title.textContent = tab.title || tab.url;

    const actions = document.createElement("div");
    actions.className = "tab-actions";
    actions.innerHTML = `
      <button class="tab-action" data-action="pin">${tab.pinned ? "Unpin" : "Pin"}</button>
      <button class="tab-action" data-action="favorite">${tab.favorite ? "Unfav" : "Fav"}</button>
      <button class="tab-action" data-action="close">Close</button>
    `;

    row.appendChild(title);
    row.appendChild(actions);
    dom.tabList.appendChild(row);

    const dot = document.createElement("div");
    dot.className = "tab-dot" + (tab.id === state.currentTabId ? " active" : "");
    dot.dataset.tabId = tab.id;
    dom.tabDots.appendChild(dot);
  });

  renderFavoritesSidebar();
}
function renderShortcuts() {
  const custom = loadShortcuts();
  const shortcuts = [...BUILTIN_SHORTCUTS, ...custom];
  dom.shortcutGrid.innerHTML = "";

  shortcuts.forEach((item) => {
    const card = document.createElement("div");
    card.className = "shortcut-card";
    card.dataset.shortcut = "true";
    card.dataset.url = item.url;

    const icon = document.createElement("div");
    icon.className = "shortcut-icon";
    if (item.icon) {
      const img = document.createElement("img");
      img.src = item.icon;
      img.alt = "";
      icon.appendChild(img);
    } else {
      icon.textContent = (item.label || item.title || "?").slice(0, 1);
    }

    const label = document.createElement("div");
    label.className = "shortcut-label";
    label.textContent = item.label || item.title || "Shortcut";

    card.appendChild(icon);
    card.appendChild(label);
    dom.shortcutGrid.appendChild(card);
  });

  const add = document.createElement("div");
  add.className = "shortcut-card shortcut-add";
  add.dataset.shortcut = "true";
  add.dataset.action = "add";
  add.innerHTML = "Add Shortcut";
  dom.shortcutGrid.appendChild(add);
}

function renderGames() {
  dom.gamesGrid.innerHTML = "";
  if (!GAMES.length) {
    dom.gamesGrid.innerHTML = `<div class="empty-state">Add games in config.js to populate this grid.</div>`;
    return;
  }
  GAMES.forEach((game) => {
    const card = createMediaCard(game, {
      defaultSubtitle: "Tap to play",
      imageBase: SETTINGS.localGameImageBase,
    });
    card.addEventListener("click", () => {
      const tab = currentTab();
      if (!tab) return;
      const resolvedUrl = resolveGameUrl(game.url || "");
      const unproxied = game.proxied === true ? false : true;
      navigate(tab, resolvedUrl, { unproxied });
    });
    dom.gamesGrid.appendChild(card);
  });
}

function renderApps() {
  dom.appsGrid.innerHTML = "";
  if (!APPS.length) {
    dom.appsGrid.innerHTML = `<div class="empty-state">Add apps in config.js to populate this grid.</div>`;
    return;
  }
  APPS.forEach((app) => {
    const card = createMediaCard(app, {
      defaultSubtitle: "Open",
      imageBase: SETTINGS.localAppImageBase,
    });
    card.addEventListener("click", () => {
      const tab = currentTab();
      if (!tab) return;
      const unproxied = app.proxied === true ? false : true;
      navigate(tab, app.url, { unproxied });
    });
    dom.appsGrid.appendChild(card);
  });
}

function createMediaCard(item, options) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "card";

  const image = document.createElement("div");
  image.className = "card-image";
  const imageUrl = resolveAsset(item.image, options.imageBase);
  if (imageUrl) image.style.backgroundImage = `url("${imageUrl}")`;

  const meta = document.createElement("div");
  meta.className = "card-meta";

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = item.title || "Untitled";

  const sub = document.createElement("div");
  sub.className = "card-sub";
  sub.textContent = item.subtitle || options.defaultSubtitle || "Open";

  meta.appendChild(title);
  meta.appendChild(sub);
  card.appendChild(image);
  card.appendChild(meta);

  return card;
}

function resolveGameUrl(raw) {
  if (!raw) return "";
  if (raw.startsWith("eclipse://")) return raw;
  if (/^[a-zA-Z]+:\/\//.test(raw)) return raw;
  return joinPath(SETTINGS.localGameBase, raw);
}

function resolveAsset(path, base) {
  if (!path) return "";
  if (path.startsWith("data:")) return path;
  if (/^[a-zA-Z]+:\/\//.test(path) || path.startsWith("/")) return path;
  return joinPath(base || "", path);
}

function joinPath(base, tail) {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return normalizedBase + tail.replace(/^\/+/, "");
}

function renderBookmarks() {
  dom.bookmarkFavorites.innerHTML = "";
  dom.bookmarkList.innerHTML = "";

  state.bookmarks.favorites.forEach((item) => {
    dom.bookmarkFavorites.appendChild(createBookmarkRow(item, "favorites"));
  });
  state.bookmarks.items.forEach((item) => {
    dom.bookmarkList.appendChild(createBookmarkRow(item, "items"));
  });
  renderFavoritesSidebar();
}

function createBookmarkRow(item, folder) {
  const row = document.createElement("div");
  row.className = "bookmark-item";

  const info = document.createElement("div");
  info.className = "bookmark-info";
  const title = document.createElement("div");
  title.className = "bookmark-title";
  title.textContent = item.title;
  const url = document.createElement("div");
  url.className = "bookmark-url";
  url.textContent = item.url;
  info.appendChild(title);
  info.appendChild(url);

  const actions = document.createElement("div");
  actions.className = "bookmark-actions";
  const open = document.createElement("button");
  open.className = "tab-action";
  open.textContent = "Open";
  open.addEventListener("click", () => {
    const tab = currentTab();
    if (tab) navigate(tab, item.url);
  });
  const remove = document.createElement("button");
  remove.className = "tab-action";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => {
    removeBookmark(item.url, folder === "favorites" ? "favorites" : "items");
    renderBookmarks();
  });
  actions.appendChild(open);
  actions.appendChild(remove);

  row.appendChild(info);
  row.appendChild(actions);
  return row;
}

function renderFavoritesSidebar() {
  dom.favoritesList.innerHTML = "";
  state.bookmarks.favorites.forEach((item) => {
    const row = document.createElement("div");
    row.className = "favorite-item";
    row.textContent = item.title;
    row.addEventListener("click", () => {
      const tab = currentTab();
      if (tab) navigate(tab, item.url);
    });
    dom.favoritesList.appendChild(row);
  });
}

function addBookmark(item, list) {
  const bucket = list === "favorites" ? state.bookmarks.favorites : state.bookmarks.items;
  const existing = bucket.find((entry) => entry.url === item.url);
  if (existing) {
    existing.title = item.title;
  } else {
    bucket.push(item);
  }
  saveBookmarks();
}

function removeBookmark(url, list) {
  if (list === "favorites") {
    state.bookmarks.favorites = state.bookmarks.favorites.filter((item) => item.url !== url);
  } else {
    state.bookmarks.items = state.bookmarks.items.filter((item) => item.url !== url);
  }
  saveBookmarks();
}

function loadBookmarks() {
  const raw = localStorage.getItem(BOOKMARKS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return {
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
        items: Array.isArray(parsed.items) ? parsed.items : [],
      };
    } catch (err) {
      return { favorites: [], items: [] };
    }
  }
  return { favorites: [], items: [] };
}

function saveBookmarks() {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(state.bookmarks));
}

function renderExtensions() {
  dom.extensionList.innerHTML = "";
  if (!state.extensions.length) {
    dom.extensionList.innerHTML = `<div class="empty-state">No extensions yet. Add one below.</div>`;
    return;
  }

  state.extensions.forEach((ext) => {
    const card = document.createElement("div");
    card.className = "extension-card";

    const info = document.createElement("div");
    info.className = "extension-info";
    const name = document.createElement("div");
    name.className = "extension-name";
    name.textContent = ext.name;
    const match = document.createElement("div");
    match.className = "extension-match";
    match.textContent = `Match: ${ext.match}`;
    info.appendChild(name);
    info.appendChild(match);

    const actions = document.createElement("div");
    actions.className = "bookmark-actions";
    const toggle = document.createElement("button");
    toggle.className = "tab-action";
    toggle.dataset.toggleExtension = ext.id;
    toggle.textContent = ext.enabled ? "Disable" : "Enable";
    const remove = document.createElement("button");
    remove.className = "tab-action";
    remove.dataset.removeExtension = ext.id;
    remove.textContent = "Remove";
    actions.appendChild(toggle);
    actions.appendChild(remove);

    card.appendChild(info);
    card.appendChild(actions);
    dom.extensionList.appendChild(card);
  });
}

function loadExtensions() {
  const raw = localStorage.getItem(EXTENSIONS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }
  return DEFAULT_EXTENSIONS.map((ext) => ({
    id: generateId(),
    name: ext.name || "Extension",
    match: ext.match || "*",
    code: ext.code || "",
    enabled: true,
  }));
}

function saveExtensions() {
  localStorage.setItem(EXTENSIONS_KEY, JSON.stringify(state.extensions));
}

function loadShortcuts() {
  const raw = localStorage.getItem(SHORTCUTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function saveShortcuts(shortcuts) {
  localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(shortcuts));
}

function loadDeviceSpoof() {
  const value = localStorage.getItem(DEVICE_SPOOF_KEY);
  return DEVICE_PROFILES[value] ? value : "default";
}

function saveDeviceSpoof() {
  localStorage.setItem(DEVICE_SPOOF_KEY, state.deviceSpoof);
}

function loadConsoleIgnore() {
  const value = localStorage.getItem(CONSOLE_IGNORE_KEY);
  return value === "true";
}

function saveConsoleIgnore() {
  localStorage.setItem(CONSOLE_IGNORE_KEY, state.consoleIgnore ? "true" : "false");
}

function copyUrl(url) {
  if (!navigator.clipboard) {
    showToast("Clipboard not available.");
    return;
  }
  navigator.clipboard.writeText(url || "").then(() => {
    showToast("URL copied.");
  });
}

function toggleConsolePanel(force) {
  if (!dom.consolePanel) return;
  const shouldOpen = typeof force === "boolean" ? force : !dom.consolePanel.classList.contains("open");
  dom.consolePanel.classList.toggle("open", shouldOpen);
  dom.consolePanel.setAttribute("aria-hidden", String(!shouldOpen));
  if (shouldOpen) {
    setConsoleTab("console");
    dom.consoleInput?.focus();
  }
}

function setConsoleTab(tab) {
  document.querySelectorAll("[data-console-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.consoleTab === tab);
  });
  document.querySelectorAll("[data-console-view]").forEach((view) => {
    view.classList.toggle("active", view.dataset.consoleView === tab);
  });
  if (tab === "elements") refreshElementsView();
}

function runConsoleCommand(code) {
  const frame = getActiveFrame();
  if (!frame) {
    appendConsoleEntry("error", ["Console unavailable for this page."], "command");
    return;
  }
  appendConsoleEntry("input", [code], "command");
  try {
    const result = frame.contentWindow?.eval(code);
    appendConsoleEntry("result", [formatConsoleArg(result)], "command");
  } catch (err) {
    appendConsoleEntry("error", [err?.message || String(err)], "command");
  }
}

function appendConsoleEntry(level, args, source) {
  if (!dom.consoleLog) return;
  if (source === "page" && state.consoleIgnore) return;
  const entry = document.createElement("div");
  entry.className = `console-entry ${level}`;
  const label = document.createElement("span");
  label.className = "console-level";
  label.textContent = level;
  const message = document.createElement("span");
  message.className = "console-message";
  message.textContent = (args || []).map(formatConsoleArg).join(" ");
  entry.appendChild(label);
  entry.appendChild(message);
  dom.consoleLog.appendChild(entry);
  dom.consoleLog.scrollTop = dom.consoleLog.scrollHeight;
}

function formatConsoleArg(arg) {
  if (arg === undefined) return "undefined";
  if (arg === null) return "null";
  if (typeof arg === "string") return arg;
  if (typeof arg === "number" || typeof arg === "boolean") return String(arg);
  try {
    return JSON.stringify(arg);
  } catch (err) {
    return String(arg);
  }
}

function refreshElementsView() {
  if (!dom.elementsView) return;
  const frame = getActiveFrame();
  if (!frame) {
    dom.elementsView.textContent = "Open a page to inspect its DOM.";
    return;
  }
  try {
    const html = frame.contentDocument?.documentElement?.outerHTML;
    if (html) {
      dom.elementsView.textContent = html;
    } else {
      dom.elementsView.textContent = "Elements view unavailable.";
    }
  } catch (err) {
    dom.elementsView.textContent = "Elements view unavailable for this page (cross-origin).";
  }
}

function getActiveFrame() {
  const tab = currentTab();
  if (!tab) return null;
  if (tab.mode === "direct") return tab.directFrame;
  if (tab.mode === "scramjet") return tab.scramjetFrame?.frame;
  return null;
}

function adjustZoom(delta) {
  state.zoom = Math.min(2, Math.max(0.5, state.zoom + delta));
  const scale = state.zoom;
  dom.internalView.style.transform = `scale(${scale})`;
  dom.internalView.style.transformOrigin = "0 0";
  dom.internalView.style.width = `${100 / scale}%`;
  dom.internalView.style.height = `${100 / scale}%`;
  dom.frameHost.style.transform = `scale(${scale})`;
  dom.frameHost.style.transformOrigin = "0 0";
  dom.frameHost.style.width = `${100 / scale}%`;
  dom.frameHost.style.height = `${100 / scale}%`;
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {
      showToast("Fullscreen blocked.");
    });
  } else {
    document.exitFullscreen();
  }
}

function deriveTitleFromUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace("www.", "");
  } catch (err) {
    return url;
  }
}

function generateId() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
}

function showToast(message) {
  if (!dom.toast) return;
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  setTimeout(() => dom.toast.classList.remove("show"), 2000);
}

init();
