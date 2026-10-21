/**
 * LankaTranslate - Options Page Script
 */

document.addEventListener("DOMContentLoaded", async () => {
  const optDefaultTarget = document.getElementById("opt-default-target");
  const optFloatingBtn = document.getElementById("opt-floating-btn");
  const optAutoTranslate = document.getElementById("opt-auto-translate");
  const optEngine = document.getElementById("opt-engine");
  const optBackendUrl = document.getElementById("opt-backend-url");
  const backendFields = document.getElementById("backend-fields");
  const optSlFilter = document.getElementById("opt-sl-filter");
  const saveBtn = document.getElementById("save-btn");
  const saveMsg = document.getElementById("save-msg");

  // Load current settings
  const settings = await chrome.storage.local.get([
    "defaultTarget",
    "showFloatingButton",
    "autoTranslate",
    "engineType",
    "backendUrl",
    "enableSlTamilFilter"
  ]);

  if (settings.defaultTarget) {
    optDefaultTarget.value = settings.defaultTarget;
  }
  if (settings.showFloatingButton !== undefined) {
    optFloatingBtn.checked = settings.showFloatingButton;
  }
  if (settings.autoTranslate !== undefined) {
    optAutoTranslate.checked = settings.autoTranslate;
  }
  if (settings.engineType) {
    optEngine.value = settings.engineType;
    backendFields.classList.toggle("hidden", settings.engineType !== "backend");
  }
  if (settings.backendUrl) {
    optBackendUrl.value = settings.backendUrl;
  }
  if (settings.enableSlTamilFilter !== undefined) {
    optSlFilter.checked = settings.enableSlTamilFilter;
  }

  // Toggle backend input field visibility
  optEngine.addEventListener("change", () => {
    backendFields.classList.toggle("hidden", optEngine.value !== "backend");
  });

  // Save button click
  saveBtn.addEventListener("click", async () => {
    await chrome.storage.local.set({
      defaultTarget: optDefaultTarget.value,
      showFloatingButton: optFloatingBtn.checked,
      autoTranslate: optAutoTranslate.checked,
      engineType: optEngine.value,
      backendUrl: optBackendUrl.value.trim(),
      enableSlTamilFilter: optSlFilter.checked
    });

    saveMsg.classList.remove("hidden");
    setTimeout(() => {
      saveMsg.classList.add("hidden");
    }, 2800);
  });
});
