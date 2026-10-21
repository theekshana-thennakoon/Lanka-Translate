# LankaTranslate 🇱🇰
### Cross-Browser Extension for Sinhala & Sri Lankan Tamil In-Page Translation

**LankaTranslate** is a Manifest V3 browser extension that allows users to select any text, sentence, or paragraph on any webpage and translate it into **Sinhala (සිංහල)** or **Sri Lankan Tamil (தமிழ்)** directly in-place without leaving the website.

---

## ✨ Features

- **In-Page Floating Action Button:** When you select text on any website, a sleek "🇱🇰 Translate" button pops up right next to your selection.
- **Shadow DOM CSS Isolation:** 100% isolated UI that will never clash with or be distorted by host website styles (Bootstrap, Tailwind, Dark Mode, etc.).
- **Sinhala & Sri Lankan Tamil Support:** 
  - Translate to Sinhala script with crisp typography.
  - Sri Lankan Tamil vocabulary normalization (adapts generic Indian Tamil terms to authentic Sri Lankan Tamil usage, such as *புகையிரதம்*, *பஸ்*, *வைத்தியசாலை*, *கைத்தொலைபேசி*, *பொலிஸ்*).
- **Multiple Ways to Translate:**
  1. **Floating Pill:** Click the floating pill button beside any selected text.
  2. **Right-Click Menu:** Highlight text &rarr; Right click &rarr; Choose *Translate to Sinhala* or *Translate to Sri Lankan Tamil*.
  3. **Keyboard Shortcut:** Highlight text &rarr; Press <kbd>Alt</kbd> + <kbd>T</kbd>.
  4. **Toolbar Action Popup:** Click the extension icon in the toolbar to translate any custom or pasted text.
- **Audio Pronunciation (TTS):** Listen to the translation aloud with the built-in Listen button.
- **One-Click Copy:** Copy translated text to your clipboard with instant visual confirmation.
- **Translation History:** Saves recent translations locally so you can review and reuse them anytime.
- **Dual Translation Engine:**
  - *Direct Cloud Engine (Default):* Works immediately out-of-the-box on any machine without needing a server running.
  - *PHP Backend (XAMPP):* Included in `api/translate.php` for local caching, rate limiting, and optional Google Cloud Translation API keys.

---

## 🚀 How to Install & Load in Your Browser

### 1. Google Chrome, Brave, & Opera
1. Open your browser and go to: `chrome://extensions` (or `brave://extensions`, `opera://extensions`).
2. Toggle on **Developer mode** in the top-right corner.
3. Click the **Load unpacked** button in the top-left.
4. Select the project folder:
   ```
   C:\xampp\htdocs\LankaTranslate
   ```
5. Pin the **LankaTranslate 🇱🇰** icon to your browser toolbar.

### 2. Microsoft Edge
1. Open Microsoft Edge and go to: `edge://extensions`.
2. Toggle on **Developer mode** in the left sidebar.
3. Click **Load unpacked**.
4. Select the `C:\xampp\htdocs\LankaTranslate` folder.

### 3. Mozilla Firefox
1. Open Firefox and go to: `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**
3. Select the `manifest.json` file inside `C:\xampp\htdocs\LankaTranslate`.

---

## 🧪 Testing the Extension

1. Open `test_page.html` directly in your browser:
   ```
   file:///C:/xampp/htdocs/LankaTranslate/test_page.html
   ```
   or if Apache is running in XAMPP:
   ```
   http://localhost/LankaTranslate/test_page.html
   ```
2. Highlight any sentence or paragraph with your mouse.
3. Click the floating **"Translate 🇱🇰"** button.
4. Toggle between **Sinhala (සිංහල)** and **Sri Lankan Tamil (தமிழ்)** tabs.
5. Try clicking **Copy** or **Listen**!

---

## ⚙️ Optional: Using the Local PHP Backend & Google Cloud API

The extension works out of the box with zero setup. If you wish to route all requests through your local XAMPP Apache/PHP server:

1. Start Apache in your **XAMPP Control Panel**.
2. Open extension **Settings** (Right-click LankaTranslate icon &rarr; *Options*).
3. Under **Translation Engine**, choose **Local PHP Backend (XAMPP)**.
4. Default URL is `http://localhost/LankaTranslate/api/translate.php`.
5. *(Optional)* If you have a Google Cloud Translation API key:
   - Open `api/config.php`
   - Paste your key into `'google_api_key' => 'YOUR_API_KEY'`
