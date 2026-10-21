/**
 * LankaTranslate - Popup Controller Script
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  const langPills = document.querySelectorAll(".pill-btn");
  const sourceInput = document.getElementById("source-input");
  const charCurrent = document.getElementById("char-current");
  const pasteBtn = document.getElementById("paste-btn");
  const clearInputBtn = document.getElementById("clear-input-btn");
  const translateBtn = document.getElementById("translate-btn");
  const btnSpinner = translateBtn.querySelector(".btn-spinner");
  const btnText = translateBtn.querySelector(".btn-text");

  const outputWrapper = document.getElementById("output-wrapper");
  const outputResult = document.getElementById("output-result");
  const outputLangBadge = document.getElementById("output-lang-badge");
  const copyResultBtn = document.getElementById("copy-result-btn");
  const speakResultBtn = document.getElementById("speak-result-btn");

  const historyList = document.getElementById("history-list");
  const clearHistoryBtn = document.getElementById("clear-history-btn");

  const defaultTargetSelect = document.getElementById("default-target-select");
  const toggleFloatingBtn = document.getElementById("toggle-floating-btn");
  const toggleAutoTranslate = document.getElementById("toggle-auto-translate");
  const engineTypeSelect = document.getElementById("engine-type-select");
  const backendUrlContainer = document.getElementById("backend-url-container");
  const backendUrlInput = document.getElementById("backend-url-input");
  const saveSettingsBtn = document.getElementById("save-settings-btn");
  const settingsToast = document.getElementById("settings-toast");

  let activeTarget = "si";

  // 1. Tab Switching
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetPane = document.getElementById(btn.getAttribute("data-tab"));
      if (targetPane) targetPane.classList.add("active");

      if (btn.getAttribute("data-tab") === "tab-history") {
        renderHistory();
      }
    });
  });

  // 2. Target Language Selection
  langPills.forEach(pill => {
    pill.addEventListener("click", () => {
      langPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeTarget = pill.getAttribute("data-target");

      // Re-translate if input is not empty and already has output
      if (sourceInput.value.trim() && !outputWrapper.classList.contains("hidden")) {
        executeTranslation();
      }
    });
  });

  // 3. Character Counter & Inputs
  sourceInput.addEventListener("input", () => {
    charCurrent.textContent = sourceInput.value.length;
  });

  clearInputBtn.addEventListener("click", () => {
    sourceInput.value = "";
    charCurrent.textContent = "0";
    outputWrapper.classList.add("hidden");
    outputResult.textContent = "";
  });

  pasteBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        sourceInput.value = text;
        charCurrent.textContent = text.length;
      }
    } catch {
      // Fallback
    }
  });

  // 4. Translate Execution
  translateBtn.addEventListener("click", executeTranslation);

  async function executeTranslation() {
    const text = sourceInput.value.trim();
    if (!text) {
      sourceInput.focus();
      return;
    }

    setLoading(true);

    chrome.runtime.sendMessage({
      action: "EXECUTE_TRANSLATION",
      text: text,
      targetLang: activeTarget
    }, (response) => {
      setLoading(false);

      if (chrome.runtime.lastError || !response || !response.success) {
        outputWrapper.classList.remove("hidden");
        outputResult.className = "output-content";
        outputResult.textContent = response?.error || "Translation failed. Check connection or settings.";
        return;
      }

      outputWrapper.classList.remove("hidden");
      outputResult.className = `output-content ${activeTarget}`;
      outputResult.textContent = response.translation;
      outputLangBadge.textContent = activeTarget === "si" ? "Sinhala (සිංහල)" : "Sri Lankan Tamil (தமிழ்)";

      // Save history
      chrome.runtime.sendMessage({
        action: "SAVE_HISTORY",
        item: {
          source: text,
          translation: response.translation,
          targetLang: activeTarget
        }
      });
    });
  }

  function setLoading(isLoading) {
    if (isLoading) {
      btnSpinner.classList.remove("hidden");
      btnText.textContent = "Translating...";
      translateBtn.disabled = true;
    } else {
      btnSpinner.classList.add("hidden");
      btnText.textContent = "Translate Now";
      translateBtn.disabled = false;
    }
  }

  // 5. Copy & Listen Actions
  copyResultBtn.addEventListener("click", () => {
    const text = outputResult.textContent;
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        copyResultBtn.classList.add("copied");
        copyResultBtn.textContent = "✓ Copied!";
        setTimeout(() => {
          copyResultBtn.classList.remove("copied");
          copyResultBtn.textContent = "📋 Copy";
        }, 1800);
      });
    }
  });

  speakResultBtn.addEventListener("click", () => {
    const text = outputResult.textContent;
    if (!text || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = activeTarget === "si" ? "si-LK" : "ta-LK";
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(activeTarget));
    if (voice) utterance.voice = voice;

    window.speechSynthesis.speak(utterance);
  });

  // 6. History Rendering
  async function renderHistory() {
    const store = await chrome.storage.local.get("history");
    const history = store.history || [];

    historyList.innerHTML = "";
    if (history.length === 0) {
      historyList.innerHTML = `<div class="empty-history">No translation history saved yet.</div>`;
      return;
    }

    history.forEach(item => {
      const el = document.createElement("div");
      el.className = "history-item";
      el.innerHTML = `
        <div class="history-item-top">
          <span class="history-tag">${item.targetLang === "si" ? "සිංහල" : "தமிழ்"}</span>
          <span class="history-time">${item.timestamp || ""}</span>
        </div>
        <div class="history-source">${escapeHtml(item.source)}</div>
        <div class="history-trans">${escapeHtml(item.translation)}</div>
      `;

      el.addEventListener("click", () => {
        // Load into translation tab
        sourceInput.value = item.source;
        charCurrent.textContent = item.source.length;
        activeTarget = item.targetLang;

        langPills.forEach(p => {
          p.classList.toggle("active", p.getAttribute("data-target") === activeTarget);
        });

        outputWrapper.classList.remove("hidden");
        outputResult.className = `output-content ${activeTarget}`;
        outputResult.textContent = item.translation;
        outputLangBadge.textContent = activeTarget === "si" ? "Sinhala (සිංහල)" : "Sri Lankan Tamil (தமிழ்)";

        // Switch to translate tab
        tabButtons[0].click();
      });

      historyList.appendChild(el);
    });
  }

  clearHistoryBtn.addEventListener("click", async () => {
    if (confirm("Are you sure you want to clear all translation history?")) {
      await chrome.storage.local.set({ history: [] });
      renderHistory();
    }
  });

  // 7. Settings Loading & Saving
  const settings = await chrome.storage.local.get([
    "defaultTarget",
    "showFloatingButton",
    "autoTranslate",
    "engineType",
    "backendUrl"
  ]);

  if (settings.defaultTarget) {
    defaultTargetSelect.value = settings.defaultTarget;
    activeTarget = settings.defaultTarget;
    langPills.forEach(p => {
      p.classList.toggle("active", p.getAttribute("data-target") === activeTarget);
    });
  }
  if (settings.showFloatingButton !== undefined) {
    toggleFloatingBtn.checked = settings.showFloatingButton;
  }
  if (settings.autoTranslate !== undefined) {
    toggleAutoTranslate.checked = settings.autoTranslate;
  }
  if (settings.engineType) {
    engineTypeSelect.value = settings.engineType;
    backendUrlContainer.classList.toggle("hidden", settings.engineType !== "backend");
  }
  if (settings.backendUrl) {
    backendUrlInput.value = settings.backendUrl;
  }

  engineTypeSelect.addEventListener("change", () => {
    backendUrlContainer.classList.toggle("hidden", engineTypeSelect.value !== "backend");
  });

  saveSettingsBtn.addEventListener("click", async () => {
    await chrome.storage.local.set({
      defaultTarget: defaultTargetSelect.value,
      showFloatingButton: toggleFloatingBtn.checked,
      autoTranslate: toggleAutoTranslate.checked,
      engineType: engineTypeSelect.value,
      backendUrl: backendUrlInput.value.trim()
    });

    activeTarget = defaultTargetSelect.value;
    langPills.forEach(p => {
      p.classList.toggle("active", p.getAttribute("data-target") === activeTarget);
    });

    settingsToast.classList.remove("hidden");
    setTimeout(() => {
      settingsToast.classList.add("hidden");
    }, 2500);
  });

  // 8. Auto-populate from active tab selection if open
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: "GET_CURRENT_SELECTION" }, (res) => {
        if (!chrome.runtime.lastError && res?.text) {
          sourceInput.value = res.text;
          charCurrent.textContent = res.text.length;
        }
      });
    }
  } catch {}

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
});
