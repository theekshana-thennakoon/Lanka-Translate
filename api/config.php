<?php
/**
 * LankaTranslate Configuration
 */

return [
    // Optional: Google Cloud Translation API Key
    // If empty, the backend will automatically use the public translation engine fallback
    'google_api_key' => '',

    // Allowed origins for CORS (set to '*' for extensions or specify exact extension IDs)
    'allowed_origins' => '*',

    // Default target language ('si' for Sinhala, 'ta' for Sri Lankan Tamil)
    'default_target' => 'si',

    // Max character length per request
    'max_characters' => 5000,

    // Enable Sri Lankan Tamil vocabulary normalization
    'enable_sl_tamil_filter' => true
];
