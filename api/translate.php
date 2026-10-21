<?php
/**
 * LankaTranslate - API Endpoint
 * Accepts POST JSON: { "text": "...", "target": "si"|"ta" }
 * Returns JSON: { "success": true, "translation": "...", "source_lang": "auto", "target_lang": "si"|"ta" }
 */

if (!headers_sent()) {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
}

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$config = file_exists(__DIR__ . '/config.php') ? require __DIR__ . '/config.php' : [];
$googleApiKey = $config['google_api_key'] ?? '';
$maxChars = $config['max_characters'] ?? 5000;
$enableSlFilter = $config['enable_sl_tamil_filter'] ?? true;

// Parse request payload
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!is_array($data)) {
    $data = $_POST;
}

$text = trim($data['text'] ?? '');
$target = strtolower(trim($data['target'] ?? 'si'));
$source = strtolower(trim($data['source'] ?? 'auto'));

// Validate inputs
if (empty($text)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'The "text" field is required.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

if (!in_array($target, ['si', 'ta'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Target language must be either "si" (Sinhala) or "ta" (Sri Lankan Tamil).'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

if (mb_strlen($text, 'UTF-8') > $maxChars) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => "Text exceeds maximum limit of {$maxChars} characters."
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

if (!function_exists('applySriLankanTamilRefinements')) {
    /**
     * Sri Lankan Tamil vocabulary normalization
     * Replaces common standard Indian Tamil words with traditional/contemporary Sri Lankan Tamil equivalents
     */
    function applySriLankanTamilRefinements($tamilText) {
        $slReplacements = [
            // Transport & Travel
            '/\bரயில் நிலையம்\b/u' => 'புகையிரத நிலையம்',
            '/\bரயில்\b/u' => 'புகையிரதம்',
            '/\bரயில்கள்\b/u' => 'புகையிரதங்கள்',
            '/\bதொடருந்து நிலையம்\b/u' => 'புகையிரத நிலையம்',
            '/\bதொடருந்து\b/u' => 'புகையிரதம்',
            '/\bதொடருந்துகள்\b/u' => 'புகையிரதங்கள்',
            '/\bபுகைவண்டி\b/u' => 'புகையிரதம்',
            '/\bபேருந்து நிலையம்\b/u' => 'பஸ் நிலையம்',
            '/\bபேருந்து நிறுத்தம்\b/u' => 'பஸ் தரிப்பிடம்',
            '/\bபேருந்து\b/u' => 'பஸ்',
            '/\bபேருந்துகள்\b/u' => 'பஸ்கள்',
            '/\bமகிழுந்து\b/u' => 'கார்',
            '/\bமிதிவண்டி\b/u' => 'சைக்கிள்',
            '/\bதானி\b/u' => 'முச்சக்கரவண்டி',
            '/\bஆட்டோ\b/u' => 'திரீவீலர்',

            // Technology & Communication
            '/\bஅலைபேசி\b/u' => 'கைத்தொலைபேசி',
            '/\bகைபேசி\b/u' => 'கைத்தொலைபேசி',
            '/\bகணினி\b/u' => 'கணனி',
            '/\bமின்னஞ்சல்\b/u' => 'ஈமெயில்',
            '/\bவலைத்தளம்\b/u' => 'இணையத்தளம்',

            // Daily Life, Health & Institutions
            '/\bஉணவகம்\b/u' => 'ஹோட்டல்',
            '/\bமருத்துவமனை\b/u' => 'வைத்தியசாலை',
            '/\bமருத்துவமனைகள்\b/u' => 'வைத்தியசாலைகள்',
            '/\bமருத்துவர்\b/u' => 'வைத்தியர்',
            '/\bகாவல் நிலையம்\b/u' => 'பொலிஸ் நிலையம்',
            '/\bகாவல்துறை\b/u' => 'பொலிஸ்',
            '/\bகாவலர்\b/u' => 'பொலிஸ்காரர்',
            '/\bபணியகம்\b/u' => 'அலுவலகம்',
            '/\bதேர்வு\b/u' => 'பரீட்சை',
            '/\bதேர்வுகள்\b/u' => 'பரீட்சைகள்',
            '/\bதேர்வில்\b/u' => 'பரீட்சையில்',
            '/\bசான்றிதழ்\b/u' => 'சான்றிதழ்',
            '/\bகடவுச்சீட்டு\b/u' => 'பாஸ்போர்ட்',
            '/\bஅங்காடி\b/u' => 'கடை',
            '/\bபல்பொருள் அங்காடி\b/u' => 'சுப்பர்மார்க்கெட்'
        ];

        return preg_replace(array_keys($slReplacements), array_values($slReplacements), $tamilText);
    }
}

/**
 * Execute translation
 */
$translation = '';
$detectedSource = $source;

if (!empty($googleApiKey)) {
    // 1. Google Cloud Translation API v2
    $url = 'https://translation.googleapis.com/language/translate/v2?key=' . urlencode($googleApiKey);
    $payload = [
        'q' => $text,
        'target' => $target,
        'format' => 'text'
    ];
    if ($source !== 'auto') {
        $payload['source'] = $source;
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT => 15
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $resData = json_decode($response, true);
        $translation = $resData['data']['translations'][0]['translatedText'] ?? '';
        $detectedSource = $resData['data']['translations'][0]['detectedSourceLanguage'] ?? $source;
    }
}

// 2. Fallback to free public endpoint if API key not provided or request failed
if (empty($translation)) {
    $encodedText = rawurlencode($text);
    $publicUrl = "https://translate.googleapis.com/translate_a/single?client=gtx&sl={$source}&tl={$target}&dt=t&q={$encodedText}";

    $ch = curl_init($publicUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        CURLOPT_TIMEOUT => 12,
        CURLOPT_SSL_VERIFYPEER => false
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $resData = json_decode($response, true);
        if (is_array($resData) && isset($resData[0]) && is_array($resData[0])) {
            $parts = [];
            foreach ($resData[0] as $segment) {
                if (isset($segment[0])) {
                    $parts[] = $segment[0];
                }
            }
            $translation = implode('', $parts);
            $detectedSource = $resData[2] ?? $source;
        }
    }
}

// 3. Fallback: MyMemory API if Google endpoint was rate limited
if (empty($translation)) {
    $pair = ($source === 'auto' ? 'en' : $source) . '|' . $target;
    $mymemoryUrl = "https://api.mymemory.translated.net/get?q=" . rawurlencode($text) . "&langpair=" . urlencode($pair);

    $ch = curl_init($mymemoryUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false
    ]);
    $response = curl_exec($ch);
    curl_close($ch);

    if ($response) {
        $resData = json_decode($response, true);
        if (!empty($resData['responseData']['translatedText'])) {
            $translation = $resData['responseData']['translatedText'];
        }
    }
}

if (empty($translation)) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'error' => 'Unable to fetch translation from providers. Please check your internet connection or configure an API key.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Refine Sri Lankan Tamil if target is Tamil
if ($target === 'ta' && $enableSlFilter) {
    $translation = applySriLankanTamilRefinements($translation);
}

// Return successful translation
echo json_encode([
    'success' => true,
    'translation' => $translation,
    'source_lang' => $detectedSource,
    'target_lang' => $target,
    'target_name' => $target === 'si' ? 'Sinhala' : 'Sri Lankan Tamil',
    'timestamp' => time()
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
