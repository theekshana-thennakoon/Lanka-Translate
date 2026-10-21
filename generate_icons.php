<?php
$sizes = [16, 32, 48, 128];
$dir = __DIR__ . '/icons';
if (!is_dir($dir)) {
    mkdir($dir, 0777, true);
}

// Generate SVG icon
$svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8D153A"/>
      <stop offset="100%" stop-color="#D47500"/>
    </linearGradient>
    <linearGradient id="bubbleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F3F4F6"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- Background Rounded Rect -->
  <rect x="4" y="4" width="120" height="120" rx="28" fill="url(#bgGrad)" filter="url(#shadow)"/>
  
  <!-- Left flag stripe accents (Sri Lankan Saffron & Green) -->
  <rect x="12" y="16" width="6" height="96" rx="3" fill="#00534E"/>
  <rect x="20" y="16" width="6" height="96" rx="3" fill="#FFBE29"/>

  <!-- Chat bubble representing translation -->
  <path d="M 36 34 C 36 28, 42 22, 50 22 L 102 22 C 110 22, 116 28, 116 34 L 116 76 C 116 82, 110 88, 102 88 L 78 88 L 60 102 L 64 88 L 50 88 C 42 88, 36 82, 36 76 Z" 
        fill="url(#bubbleGrad)" filter="url(#shadow)"/>

  <!-- Character / symbol: A -> සි/த -->
  <text x="50" y="58" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#1E293B">A</text>
  <path d="M 72 50 L 80 50 M 76 46 L 81 50 L 76 54" stroke="#8D153A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <text x="84" y="58" font-family="sans-serif" font-size="26" font-weight="bold" fill="#8D153A">සි</text>
  <text x="62" y="80" font-family="sans-serif" font-size="16" font-weight="bold" fill="#00534E">த</text>
  <text x="76" y="80" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748B">SL</text>
</svg>
SVG;
file_put_contents($dir . '/icon.svg', $svg);

// Generate crisp PNGs using GD
foreach ($sizes as $size) {
    $im = imagecreatetruecolor($size, $size);
    imagealphablending($im, false);
    imagesavealpha($im, true);
    $transparent = imagecolorallocatealpha($im, 0, 0, 0, 127);
    imagefilledrectangle($im, 0, 0, $size, $size, $transparent);
    imagealphablending($im, true);

    // Draw rounded badge with Sri Lanka maroon / gold tone
    $maroon = imagecolorallocate($im, 141, 21, 58);
    $gold = imagecolorallocate($im, 255, 190, 41);
    $teal = imagecolorallocate($im, 0, 83, 78);
    $white = imagecolorallocate($im, 255, 255, 255);
    $dark = imagecolorallocate($im, 30, 41, 59);

    // Fill rounded rect approx
    $radius = max(2, (int)($size * 0.22));
    imagefilledrectangle($im, $radius, 0, $size - $radius - 1, $size - 1, $maroon);
    imagefilledrectangle($im, 0, $radius, $size - 1, $size - $radius - 1, $maroon);
    imagefilledellipse($im, $radius, $radius, $radius * 2, $radius * 2, $maroon);
    imagefilledellipse($im, $size - $radius - 1, $radius, $radius * 2, $radius * 2, $maroon);
    imagefilledellipse($im, $radius, $size - $radius - 1, $radius * 2, $radius * 2, $maroon);
    imagefilledellipse($im, $size - $radius - 1, $size - $radius - 1, $radius * 2, $radius * 2, $maroon);

    // Side stripes
    $stripeW = max(1, (int)($size * 0.06));
    $s1 = (int)($size * 0.10);
    $s2 = (int)($size * 0.18);
    $sTop = (int)($size * 0.15);
    $sH = (int)($size * 0.70);
    imagefilledrectangle($im, $s1, $sTop, $s1 + $stripeW, $sTop + $sH, $teal);
    imagefilledrectangle($im, $s2, $sTop, $s2 + $stripeW, $sTop + $sH, $gold);

    // Inner chat bubble
    $bLeft = (int)($size * 0.30);
    $bTop = (int)($size * 0.18);
    $bRight = (int)($size * 0.90);
    $bBottom = (int)($size * 0.75);
    $bRadius = max(2, (int)($size * 0.10));
    imagefilledrectangle($im, $bLeft + $bRadius, $bTop, $bRight - $bRadius, $bBottom, $white);
    imagefilledrectangle($im, $bLeft, $bTop + $bRadius, $bRight, $bBottom - $bRadius, $white);
    imagefilledellipse($im, $bLeft + $bRadius, $bTop + $bRadius, $bRadius * 2, $bRadius * 2, $white);
    imagefilledellipse($im, $bRight - $bRadius, $bTop + $bRadius, $bRadius * 2, $bRadius * 2, $white);
    imagefilledellipse($im, $bLeft + $bRadius, $bBottom - $bRadius, $bRadius * 2, $bRadius * 2, $white);
    imagefilledellipse($im, $bRight - $bRadius, $bBottom - $bRadius, $bRadius * 2, $bRadius * 2, $white);

    // Little chat tail
    imagefilledpolygon($im, [
        (int)($size * 0.40), $bBottom,
        (int)($size * 0.55), $bBottom,
        (int)($size * 0.45), min($size - 2, (int)($size * 0.88))
    ], 3, $white);

    // Draw stylized text or symbol
    if ($size >= 32) {
        $font = (int)($size * 0.28);
        imagestring($im, min(5, max(1, (int)($size / 14))), (int)($size * 0.38), (int)($size * 0.28), "A", $dark);
        imagestring($im, min(5, max(1, (int)($size / 14))), (int)($size * 0.65), (int)($size * 0.32), ">", $maroon);
    } else {
        imagestring($im, 1, 5, 4, "LK", $white);
    }

    imagepng($im, $dir . "/icon{$size}.png");
    imagedestroy($im);
}
echo "Icons created successfully\n";
