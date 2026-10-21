/**
 * LankaTranslate - Content Script
 * Injected into web pages to detect text selection and render an isolated Shadow DOM floating UI.
 */

(() => {
  // Prevent duplicate injection
  if (window.__LANKA_TRANSLATE_LOADED__) return;
  window.__LANKA_TRANSLATE_LOADED__ = true;

  let currentSelectionText = "";
  let currentSelectionRect = null;
  let activeTargetLang = "si"; // 'si' or 'ta'
  let hostElement = null;
  let shadowRoot = null;
  let isPanelOpen = false;

  // Safe settings retriever (handles standalone test mode or extension runtime errors)
  function getSettings(callback) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      try {
        chrome.storage.local.get(["showFloatingButton", "autoTranslate", "defaultTarget"], (res) => {
          if (chrome.runtime?.lastError) {
            callback({ showFloatingButton: true, autoTranslate: false, defaultTarget: "si" });
          } else {
            callback(res || {});
          }
        });
        return;
      } catch (e) {
        // Fallback
      }
    }
    callback({ showFloatingButton: true, autoTranslate: false, defaultTarget: "si" });
  }

  // Initialize Shadow DOM Container
  function ensureHost() {
    if (!hostElement) {
      hostElement = document.createElement("div");
      hostElement.id = "lanka-translate-host";
      hostElement.style.all = "initial";
      hostElement.style.position = "absolute";
      hostElement.style.top = "0";
      hostElement.style.left = "0";
      hostElement.style.zIndex = "2147483647";
      (document.body || document.documentElement).appendChild(hostElement);

      shadowRoot = hostElement.attachShadow({ mode: "open" });
      injectStyles();
    }
  }

  // Inject Styles into Shadow Root for total CSS isolation
  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans Sinhala", "Iskoola Pota", "Noto Sans Tamil", "Latha", Arial, sans-serif;
      }

      /* Floating Trigger Button */
      .lt-floating-btn {
        position: fixed;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: linear-gradient(135deg, #8D153A 0%, #B8224E 100%);
        color: #ffffff;
        border: none;
        outline: none;
        padding: 7px 14px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(141, 21, 58, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2);
        transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.15s ease;
        animation: ltFadeInScale 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        user-select: none;
        z-index: 2147483647;
      }
      .lt-floating-btn:hover {
        transform: scale(1.06);
        box-shadow: 0 6px 20px rgba(141, 21, 58, 0.55);
      }
      .lt-floating-btn .flag {
        font-size: 16px;
        line-height: 1;
      }

      /* Translation Card Modal */
      .lt-panel {
        position: fixed;
        width: 360px;
        max-width: calc(100vw - 32px);
        background: #ffffff;
        color: #1e293b;
        border-radius: 14px;
        box-shadow: 0 14px 40px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(226, 232, 240, 0.95);
        overflow: hidden;
        animation: ltFadeInSlide 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        z-index: 2147483647;
      }

      /* Panel Header */
      .lt-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        user-select: none;
      }
      .lt-brand {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13.5px;
        font-weight: 700;
        color: #8D153A;
      }
      .lt-header-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .lt-icon-btn {
        background: transparent;
        border: none;
        color: #64748b;
        cursor: pointer;
        width: 26px;
        height: 26px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        transition: background 0.15s, color 0.15s;
      }
      .lt-icon-btn:hover {
        background: #e2e8f0;
        color: #0f172a;
      }

      /* Language Selector Tabs */
      .lt-lang-selector {
        display: flex;
        background: #f1f5f9;
        padding: 3px;
        margin: 10px 14px 6px 14px;
        border-radius: 8px;
        gap: 4px;
      }
      .lt-lang-tab {
        flex: 1;
        text-align: center;
        padding: 6px 8px;
        font-size: 12.5px;
        font-weight: 600;
        border: none;
        background: transparent;
        color: #64748b;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.18s ease;
      }
      .lt-lang-tab.active {
        background: #ffffff;
        color: #8D153A;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      }

      /* Source Text Snippet Preview */
      .lt-source-box {
        padding: 8px 14px;
        font-size: 12px;
        color: #64748b;
        background: #fdfdfd;
        border-bottom: 1px dashed #e2e8f0;
        max-height: 60px;
        overflow-y: auto;
        line-height: 1.4;
      }
      .lt-source-box strong {
        color: #475569;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: block;
        margin-bottom: 2px;
      }

      /* Translated Output Area */
      .lt-output-box {
        padding: 14px;
        min-height: 90px;
        max-height: 240px;
        overflow-y: auto;
        position: relative;
      }
      .lt-translated-text {
        font-size: 15px;
        line-height: 1.6;
        color: #0f172a;
        word-break: break-word;
        white-space: pre-wrap;
      }
      .lt-translated-text.si {
        font-family: "Noto Sans Sinhala", "Iskoola Pota", sans-serif;
        font-size: 16px;
        line-height: 1.65;
      }
      .lt-translated-text.ta {
        font-family: "Noto Sans Tamil", "Latha", sans-serif;
        font-size: 15.5px;
        line-height: 1.65;
      }

      /* Loading State */
      .lt-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        color: #64748b;
        font-size: 13px;
        padding: 24px 0;
      }
      .lt-spinner {
        width: 20px;
        height: 20px;
        border: 2.5px solid #e2e8f0;
        border-top-color: #8D153A;
        border-radius: 50%;
        animation: ltSpin 0.7s linear infinite;
      }

      /* Error State */
      .lt-error {
        color: #dc2626;
        font-size: 13px;
        padding: 10px;
        background: #fef2f2;
        border-radius: 8px;
        border: 1px solid #fee2e2;
        line-height: 1.4;
      }
      .lt-retry-btn {
        margin-top: 8px;
        background: #dc2626;
        color: #ffffff;
        border: none;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
      }

      /* Panel Footer Toolbar */
      .lt-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 14px;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
      }
      .lt-actions-left {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .lt-btn-secondary {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        color: #334155;
        padding: 5px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .lt-btn-secondary:hover {
        background: #f1f5f9;
        border-color: #94a3b8;
      }
      .lt-btn-secondary.copied {
        background: #ecfdf5;
        border-color: #10b981;
        color: #059669;
      }
      .lt-footer-info {
        font-size: 11px;
        color: #94a3b8;
      }

      @keyframes ltFadeInScale {
        from { opacity: 0; transform: scale(0.85); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes ltFadeInSlide {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes ltSpin {
        to { transform: rotate(360deg); }
      }
    `;
    shadowRoot.appendChild(style);
  }

  function removeFloatingButton() {
    const btn = shadowRoot?.querySelector(".lt-floating-btn");
    btn?.remove();
  }

  function removePanel() {
    const panel = shadowRoot?.querySelector(".lt-panel");
    panel?.remove();
    isPanelOpen = false;
  }

  // Calculate coordinates near mouse cursor or selection end
  function calculateButtonPosition(mouseX, mouseY, rect) {
    const margin = 12;
    const btnW = 120;
    const btnH = 38;

    let left = mouseX ? (mouseX + 8) : (rect ? rect.right - btnW : 100);
    let top = mouseY ? (mouseY + 10) : (rect ? rect.bottom + 8 : 100);

    // Keep within viewport boundaries
    if (left + btnW > window.innerWidth - margin) {
      left = window.innerWidth - btnW - margin;
    }
    if (left < margin) left = margin;

    if (top + btnH > window.innerHeight - margin) {
      top = mouseY ? (mouseY - btnH - 10) : (rect ? rect.top - btnH - 8 : 100);
    }
    if (top < margin) top = margin;

    return { left, top };
  }

  function calculatePanelPosition(rect, mouseX, mouseY) {
    const margin = 12;
    const panelW = 360;
    const panelH = 280;

    let left = mouseX ? (mouseX - 20) : (rect ? rect.left : 100);
    let top = mouseY ? (mouseY + 12) : (rect ? rect.bottom + 10 : 100);

    if (left + panelW > window.innerWidth - margin) {
      left = window.innerWidth - panelW - margin;
    }
    if (left < margin) left = margin;

    if (top + panelH > window.innerHeight - margin) {
      top = rect ? (rect.top - panelH - 10) : (top - panelH - 20);
    }
    if (top < margin) top = margin;

    return { left, top };
  }

  // Render the floating "🇱🇰 Translate" button
  function showFloatingButton(mouseX, mouseY, rect, text) {
    ensureHost();
    removeFloatingButton();
    if (isPanelOpen) return;

    const btn = document.createElement("button");
    btn.className = "lt-floating-btn";
    btn.innerHTML = `<span class="flag">🇱🇰</span><span>Translate</span>`;

    const { left, top } = calculateButtonPosition(mouseX, mouseY, rect);
    btn.style.left = `${left}px`;
    btn.style.top = `${top}px`;

    btn.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      e.preventDefault();
    });

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      removeFloatingButton();
      openTranslationPanel(rect, mouseX, mouseY, text, activeTargetLang);
    });

    shadowRoot.appendChild(btn);
  }

  // Render the main translation modal
  function openTranslationPanel(rect, mouseX, mouseY, text, targetLang) {
    ensureHost();
    removeFloatingButton();
    removePanel();
    isPanelOpen = true;
    activeTargetLang = targetLang;

    const panel = document.createElement("div");
    panel.className = "lt-panel";

    const { left, top } = calculatePanelPosition(rect, mouseX, mouseY);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;

    panel.innerHTML = `
      <div class="lt-header">
        <div class="lt-brand">
          <span>🇱🇰</span>
          <span>LankaTranslate</span>
        </div>
        <div class="lt-header-actions">
          <button class="lt-icon-btn lt-close-btn" title="Close">✕</button>
        </div>
      </div>

      <div class="lt-lang-selector">
        <button class="lt-lang-tab ${targetLang === 'si' ? 'active' : ''}" data-lang="si">සිංහල (Sinhala)</button>
        <button class="lt-lang-tab ${targetLang === 'ta' ? 'active' : ''}" data-lang="ta">தமிழ் (SL Tamil)</button>
      </div>

      <div class="lt-source-box">
        <strong>Selected Text</strong>
        <span class="lt-source-text"></span>
      </div>

      <div class="lt-output-box">
        <div class="lt-loading">
          <div class="lt-spinner"></div>
          <span>Translating to ${targetLang === 'si' ? 'Sinhala' : 'Sri Lankan Tamil'}...</span>
        </div>
      </div>

      <div class="lt-footer">
        <div class="lt-actions-left">
          <button class="lt-btn-secondary lt-copy-btn" title="Copy to clipboard">
            <span>📋</span> Copy
          </button>
          <button class="lt-btn-secondary lt-speak-btn" title="Listen pronunciation">
            <span>🔊</span> Listen
          </button>
        </div>
        <div class="lt-footer-info">
          <span class="lt-target-name">${targetLang === 'si' ? 'සිංහල' : 'இலங்கை தமிழ்'}</span>
        </div>
      </div>
    `;

    panel.querySelector(".lt-source-text").textContent = text.length > 250 ? text.substring(0, 250) + "..." : text;

    // Close button
    panel.querySelector(".lt-close-btn").addEventListener("click", () => {
      removePanel();
    });

    // Language tabs
    panel.querySelectorAll(".lt-lang-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        const lang = tab.getAttribute("data-lang");
        if (lang === activeTargetLang) return;
        activeTargetLang = lang;
        panel.querySelectorAll(".lt-lang-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        panel.querySelector(".lt-target-name").textContent = lang === 'si' ? 'සිංහල' : 'இலங்கை தமிழ்';
        fetchAndDisplayTranslation(panel, text, lang);
      });
    });

    // Copy action
    const copyBtn = panel.querySelector(".lt-copy-btn");
    copyBtn.addEventListener("click", () => {
      const translatedEl = panel.querySelector(".lt-translated-text");
      if (translatedEl && translatedEl.textContent) {
        navigator.clipboard.writeText(translatedEl.textContent).then(() => {
          copyBtn.classList.add("copied");
          copyBtn.innerHTML = `<span>✓</span> Copied!`;
          setTimeout(() => {
            copyBtn.classList.remove("copied");
            copyBtn.innerHTML = `<span>📋</span> Copy`;
          }, 1800);
        });
      }
    });

    // Text-to-speech
    const speakBtn = panel.querySelector(".lt-speak-btn");
    speakBtn.addEventListener("click", () => {
      const translatedEl = panel.querySelector(".lt-translated-text");
      if (translatedEl && translatedEl.textContent) {
        speakText(translatedEl.textContent, activeTargetLang);
      }
    });

    panel.addEventListener("mousedown", (e) => e.stopPropagation());
    shadowRoot.appendChild(panel);

    fetchAndDisplayTranslation(panel, text, targetLang);
  }

  // Translation fetcher with automatic fallback to direct public endpoint if extension messaging is unavailable
  function fetchAndDisplayTranslation(panel, text, targetLang) {
    const outputBox = panel.querySelector(".lt-output-box");
    outputBox.innerHTML = `
      <div class="lt-loading">
        <div class="lt-spinner"></div>
        <span>Translating to ${targetLang === 'si' ? 'Sinhala' : 'Sri Lankan Tamil'}...</span>
      </div>
    `;

    const handleSuccess = (translation) => {
      outputBox.innerHTML = `<div class="lt-translated-text ${targetLang}"></div>`;
      outputBox.querySelector(".lt-translated-text").textContent = translation;

      if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        try {
          chrome.runtime.sendMessage({
            action: "SAVE_HISTORY",
            item: { source: text, translation: translation, targetLang: targetLang }
          });
        } catch {}
      }
    };

    const handleError = (errMsg) => {
      outputBox.innerHTML = `
        <div class="lt-error">
          <strong>Translation Notice</strong>
          <div>${errMsg}</div>
          <button class="lt-retry-btn">Retry</button>
        </div>
      `;
      outputBox.querySelector(".lt-retry-btn")?.addEventListener("click", () => {
        fetchAndDisplayTranslation(panel, text, targetLang);
      });
    };

    // Direct fetch helper
    const directFetch = () => {
      const encoded = encodeURIComponent(text);
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encoded}`;
      fetch(url)
        .then(res => res.json())
        .then(data => {
          let trans = "";
          if (Array.isArray(data) && Array.isArray(data[0])) {
            trans = data[0].map(c => c[0]).join("");
          }
          if (trans) {
            handleSuccess(trans);
          } else {
            handleError("Empty translation received. Please try again.");
          }
        })
        .catch(err => {
          handleError("Network error: " + (err.message || "Failed to reach translation engine."));
        });
    };

    // Use extension background service worker if available
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage && chrome.runtime?.id) {
      try {
        chrome.runtime.sendMessage({
          action: "EXECUTE_TRANSLATION",
          text: text,
          targetLang: targetLang
        }, (response) => {
          if (chrome.runtime?.lastError || !response || !response.success) {
            // Fallback to direct client fetch
            directFetch();
          } else {
            handleSuccess(response.translation);
          }
        });
      } catch (e) {
        directFetch();
      }
    } else {
      directFetch();
    }
  }

  // Speech synthesis
  function speakText(text, lang) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'si' ? 'si-LK' : 'ta-LK';
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(lang));
    if (matchingVoice) utterance.voice = matchingVoice;

    window.speechSynthesis.speak(utterance);
  }

  // Handle selection detection on mouseup and keyup
  function handleSelectionCheck(mouseX, mouseY) {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : "";

    if (!text || text.length < 2) {
      removeFloatingButton();
      return;
    }

    if (selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    const bounding = range.getBoundingClientRect();

    // Use the last rect (where the paragraph / sentence actually ends)
    const endRect = (rects && rects.length > 0) ? rects[rects.length - 1] : bounding;

    currentSelectionText = text;
    currentSelectionRect = endRect;

    getSettings((settings) => {
      const showBtn = settings.showFloatingButton !== false;
      const auto = settings.autoTranslate === true;
      const defTarget = settings.defaultTarget || "si";

      if (auto) {
        openTranslationPanel(endRect, mouseX, mouseY, text, defTarget);
      } else if (showBtn) {
        showFloatingButton(mouseX, mouseY, endRect, text);
      }
    });
  }

  // Mouse up event
  document.addEventListener("mouseup", (event) => {
    if (event.target === hostElement || hostElement?.contains(event.target)) {
      return;
    }
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    setTimeout(() => {
      handleSelectionCheck(mouseX, mouseY);
    }, 30);
  });

  // Keyboard selection (Shift + arrows)
  document.addEventListener("keyup", (event) => {
    if (["Shift", "ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(event.key)) {
      setTimeout(() => {
        handleSelectionCheck(null, null);
      }, 50);
    }
  });

  // Close panel on outside click
  document.addEventListener("mousedown", (event) => {
    if (event.target === hostElement || hostElement?.contains(event.target)) {
      return;
    }
    removeFloatingButton();
    removePanel();
  });

  // Background script listener
  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "TRANSLATE_SELECTION") {
        const selection = window.getSelection();
        let rect = currentSelectionRect;
        if (selection && selection.rangeCount > 0) {
          rect = selection.getRangeAt(0).getBoundingClientRect();
        }
        openTranslationPanel(rect, null, null, request.text, request.targetLang || "si");
        sendResponse({ received: true });
      }

      if (request.action === "GET_CURRENT_SELECTION") {
        const selection = window.getSelection();
        const text = selection ? selection.toString().trim() : currentSelectionText;
        sendResponse({ text: text || "" });
        return false;
      }

      if (request.action === "TRIGGER_SHORTCUT_TRANSLATION") {
        const selection = window.getSelection();
        const text = selection ? selection.toString().trim() : "";
        if (text) {
          const rect = selection.getRangeAt(0).getBoundingClientRect();
          getSettings((s) => {
            openTranslationPanel(rect, null, null, text, s.defaultTarget || "si");
          });
        }
        sendResponse({ received: true });
      }
    });
  }
})();
