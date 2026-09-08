import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#312e81"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="shield" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>
  
  <!-- Rounded Base Canvas -->
  <rect width="512" height="512" rx="128" fill="url(#bg)"/>
  
  <!-- Outer Glow Ring -->
  <rect x="24" y="24" width="464" height="464" rx="104" fill="none" stroke="#6366f1" stroke-width="4" stroke-opacity="0.3"/>
  
  <!-- Inner Institutional Crest Shield -->
  <path d="M 256 90 L 376 135 C 376 250 256 345 256 345 C 256 345 136 250 136 135 Z" fill="url(#shield)" filter="drop-shadow(0 12px 24px rgba(0,0,0,0.5))"/>
  
  <!-- Inner Shield Contrast Border -->
  <path d="M 256 102 L 362 142 C 362 242 256 325 256 325 C 256 325 150 242 150 142 Z" fill="#0f172a" opacity="0.4"/>
  
  <!-- Graduation Cap / Mortarboard Outline in Shield -->
  <polygon points="256,130 330,165 256,200 182,165" fill="#f8fafc"/>
  <path d="M 215 185 L 215 220 C 215 235 297 235 297 220 L 297 185" fill="#e2e8f0"/>
  <path d="M 320 170 L 330 215 L 324 218" fill="none" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>

  <!-- Golden Badge / EMIS Attendance Checkmark -->
  <circle cx="256" cy="275" r="46" fill="url(#emeraldGrad)" stroke="#ffffff" stroke-width="4"/>
  <path d="M 240 274 L 251 285 L 274 262" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  
  <!-- Typographic Label -->
  <text x="256" y="420" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="4">EMIS</text>
  <text x="256" y="455" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" fill="#a5b4fc" text-anchor="middle" letter-spacing="2">ATTENDANCE</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');

// Function to draw PNG with rounded corners and shield/check
function createPngIcon(size, isMaskable = false) {
  const png = new PNG({ width: size, height: size });

  const cx = size / 2;
  const cy = size / 2;
  const safeRadius = isMaskable ? size * 0.4 : size * 0.46;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;

      // Distance from center
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background color: deep indigo/navy
      let r = 24, g = 30, b = 60, a = 255;

      // Dark radial gradient
      const normY = y / size;
      r = Math.floor(20 + 35 * (1 - normY));
      g = Math.floor(24 + 30 * (1 - normY));
      b = Math.floor(55 + 75 * (1 - normY));

      // Shield boundaries
      const relX = (x - cx) / (size * 0.38);
      const relY = (y - cy + size * 0.05) / (size * 0.38);

      const inShield = relY > -0.8 && relY < 0.9 && Math.abs(relX) <= (relY < 0 ? 0.8 : (0.8 * (1 - (relY * 0.7))));

      if (inShield) {
        // Indigo shield
        r = 79; g = 70; b = 229;

        // Inner shield crest highlight
        if (Math.abs(relX) < 0.65 && relY > -0.65 && relY < 0.7) {
          r = 49; g = 46; b = 129;
        }
      }

      // Checkmark circle badge
      const checkCenterY = cy + size * 0.08;
      const checkDist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - checkCenterY, 2));
      const badgeRadius = size * 0.16;

      if (checkDist <= badgeRadius) {
        // Emerald green
        r = 16; g = 185; b = 129;
        if (checkDist > badgeRadius - (size * 0.02)) {
          r = 255; g = 255; b = 255;
        }

        // Draw simple checkmark inside circle
        const chkX = (x - cx) / badgeRadius;
        const chkY = (y - checkCenterY) / badgeRadius;
        // Checkmark line segments: (-0.4, 0) to (-0.1, 0.3) and (-0.1, 0.3) to (0.4, -0.3)
        const d1 = Math.abs(chkY - (chkX * 1.0 + 0.4));
        const d2 = Math.abs(chkY - (-chkX * 1.2 + 0.18));
        if ((d1 < 0.16 && chkX >= -0.45 && chkX <= -0.05) || (d2 < 0.16 && chkX >= -0.15 && chkX <= 0.45)) {
          r = 255; g = 255; b = 255;
        }
      }

      // Round mask if not maskable
      if (!isMaskable && dist > safeRadius) {
        // Anti-aliased outer edge
        const edge = dist - safeRadius;
        if (edge > 2) {
          a = 0;
        } else {
          a = Math.floor(255 * (1 - edge / 2));
        }
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }

  return PNG.sync.write(png);
}

// Write files
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPngIcon(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPngIcon(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPngIcon(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPngIcon(180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPngIcon(64, false));

console.log('Successfully generated all PWA icons in public/ directory!');
