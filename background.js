/**
 * LankaTranslate - Background Service Worker
 * Handles context menus, shortcut commands, CORS-free API proxying, and storage.
 */

// Sri Lankan Tamil dictionary normalization for direct translation
const SL_TAMIL_DICTIONARY = [
  [/\bரயில் நிலையம்\b/gu, 'புகையிரத நிலையம்'],
  [/\bரயில்\b/gu, 'புகையிரதம்'],
  [/\bரயில்கள்\b/gu, 'புகையிரதங்கள்'],
  [/\bதொடருந்து நிலையம்\b/gu, 'புகையிரத நிலையம்'],
  [/\bதொடருந்து\b/gu, 'புகையிரதம்'],
  [/\bதொடருந்துகள்\b/gu, 'புகையிரதங்கள்'],
  [/\bபுகைவண்டி\b/gu, 'புகையிரதம்'],
  [/\bபேருந்து நிலையம்\b/gu, 'பஸ் நிலையம்'],
  [/\bபேருந்து நிறுத்தம்\b/gu, 'பஸ் தரிப்பிடம்'],
  [/\bபேருந்து\b/gu, 'பஸ்'],
  [/\bபேருந்துகள்\b/gu, 'பஸ்கள்'],
  [/\bமகிழுந்து\b/gu, 'கார்'],
  [/\bமிதிவண்டி\b/gu, 'சைக்கிள்'],
  [/\bதானி\b/gu, 'முச்சக்கரவண்டி'],
  [/\bஆட்டோ\b/gu, 'திரீவீலர்'],
  [/\bஅலைபேசி\b/gu, 'கைத்தொலைபேசி'],
  [/\bகைபேசி\b/gu, 'கைத்தொலைபேசி'],
  [/\bகணினி\b/gu, 'கணனி'],
  [/\bமின்னஞ்சல்\b/gu, 'ஈமெயில்'],
  [/\bவலைத்தளம்\b/gu, 'இணையத்தளம்'],
  [/\bஉணவகம்\b/gu, 'ஹோட்டல்'],
  [/\bமருத்துவமனை\b/gu, 'வைத்தியசாலை'],
  [/\bமருத்துவமனைகள்\b/gu, 'வைத்தியசாலைகள்'],
  [/\bமருத்துவர்\b/gu, 'வைத்தியர்'],
  [/\bகாவல் நிலையம்\b/gu, 'பொலிஸ் நிலையம்'],
  [/\bகாவல்துறை\b/gu, 'பொலிஸ்'],
  [/\bகாவலர்\b/gu, 'பொலிஸ்காரர்'],
  [/\bபணியகம்\b/gu, 'அலுவலகம்'],
  [/\bதேர்வு\b/gu, 'பரீட்சை'],
  [/\bதேர்வுகள்\b/gu, 'பரீட்சைகள்'],
  [/\bதேர்வில்\b/gu, 'பரீட்சையில்'],
  [/\bசான்றிதழ்\b/gu, 'சான்றிதழ்'],
  [/\bகடவுச்சீட்டு\b/gu, 'பாஸ்போர்ட்'],
  [/\bஅங்காடி\b/gu, 'கடை'],
  [/\bபல்பொருள் அங்காடி\b/gu, 'சுப்பர்மார்க்கெட்']
];

function applySriLankanTamilRefinements(text) {
  let result = text;
  for (const [pattern, replacement] of SL_TAMIL_DICTIONARY) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// Setup context menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "lanka-translate-parent",
      title: "LankaTranslate 🇱🇰",
      contexts: ["selection"]
    });

    chrome.contextMenus.create({
      id: "translate-sinhala",
      parentId: "lanka-translate-parent",
      title: "Translate to Sinhala (සිංහල)",
      contexts: ["selection"]
    });

    chrome.contextMenus.create({
      id: "translate-tamil",
      parentId: "lanka-translate-parent",
      title: "Translate to Sri Lankan Tamil (தமிழ்)",
      contexts: ["selection"]
    });

    chrome.contextMenus.create({
      id: "translate-both",
      parentId: "lanka-translate-parent",
      title: "Show Translation Panel...",
      contexts: ["selection"]
    });
  });

  // Initialize default settings if not yet saved
  chrome.storage.local.get(["defaultTarget", "showFloatingButton", "autoTranslate", "engineType", "backendUrl"], (res) => {
    const defaults = {
      defaultTarget: res.defaultTarget || "si",
      showFloatingButton: res.showFloatingButton !== undefined ? res.showFloatingButton : true,
      autoTranslate: res.autoTranslate !== undefined ? res.autoTranslate : false,
      engineType: res.engineType || "direct", // "direct" or "backend"
      backendUrl: res.backendUrl || "http://localhost/LankaTranslate/api/translate.php",
      history: res.history || []
    };
    chrome.storage.local.set(defaults);
  });
});

// Context Menu Clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info.selectionText || !tab?.id) return;

  let targetLang = "si";
  if (info.menuItemId === "translate-tamil") {
    targetLang = "ta";
  } else if (info.menuItemId === "translate-sinhala") {
    targetLang = "si";
  } else {
    // Check saved default
    chrome.storage.local.get("defaultTarget", (res) => {
      sendTranslateMessage(tab.id, info.selectionText, res.defaultTarget || "si");
    });
    return;
  }

  sendTranslateMessage(tab.id, info.selectionText, targetLang);
});

function sendTranslateMessage(tabId, text, targetLang) {
  chrome.tabs.sendMessage(tabId, {
    action: "TRANSLATE_SELECTION",
    text: text,
    targetLang: targetLang
  }).catch(() => {
    // If content script was not ready, inject or ignore
  });
}

// Keyboard shortcuts (e.g. Alt+T)
chrome.commands.onCommand.addListener((command) => {
  if (command === "translate-selection") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "TRIGGER_SHORTCUT_TRANSLATION" }).catch(() => {});
      }
    });
  }
});

// Handle requests from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "EXECUTE_TRANSLATION") {
    handleTranslation(request.text, request.targetLang)
      .then((data) => sendResponse({ success: true, ...data }))
      .catch((err) => sendResponse({ success: false, error: err.message || "Translation failed" }));
    return true; // Keep channel open for async response
  }

  if (request.action === "SAVE_HISTORY") {
    saveToHistory(request.item);
    sendResponse({ success: true });
    return false;
  }
});

/**
 * Perform translation using preferred engine
 */
async function handleTranslation(text, targetLang) {
  const settings = await chrome.storage.local.get(["engineType", "backendUrl", "googleApiKey"]);
  const engineType = settings.engineType || "direct";
  const backendUrl = settings.backendUrl || "http://localhost/LankaTranslate/api/translate.php";

  if (engineType === "backend") {
    // Try PHP backend
    try {
      const res = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          target: targetLang
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          return {
            translation: json.translation,
            sourceLang: json.source_lang || "auto",
            targetLang: json.target_lang || targetLang
          };
        }
      }
    } catch (e) {
      console.warn("Backend unavailable, falling back to direct public engine", e);
    }
  }

  // Direct client engine (Google Translate v1 single endpoint)
  const encoded = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encoded}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Translation service returned HTTP ${response.status}`);
  }

  const data = await response.json();
  let translatedText = "";
  let detectedSource = "en";

  if (Array.isArray(data) && Array.isArray(data[0])) {
    translatedText = data[0].map(chunk => chunk[0]).join("");
    detectedSource = data[2] || "auto";
  }

  if (!translatedText) {
    throw new Error("Empty translation result received.");
  }

  // If target is Tamil, refine to Sri Lankan Tamil dialect
  if (targetLang === "ta") {
    translatedText = applySriLankanTamilRefinements(translatedText);
  }

  return {
    translation: translatedText,
    sourceLang: detectedSource,
    targetLang: targetLang
  };
}

/**
 * Save translation entry to local history (capped at 50)
 */
async function saveToHistory(item) {
  if (!item || !item.source || !item.translation) return;
  const store = await chrome.storage.local.get("history");
  let history = store.history || [];

  // Avoid consecutive duplicates
  if (history.length > 0 && history[0].source === item.source && history[0].targetLang === item.targetLang) {
    return;
  }

  const entry = {
    id: Date.now().toString(),
    source: item.source.slice(0, 300),
    translation: item.translation.slice(0, 500),
    targetLang: item.targetLang,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  history.unshift(entry);
  if (history.length > 50) {
    history = history.slice(0, 50);
  }

  await chrome.storage.local.set({ history });
}
