/**
 * Color parsing utility matching the Flutter mobile app's _parseColor() logic.
 * Resolves Chinese/English color names, hex strings, and rgb() values to hex colors.
 */

const NAMED_COLORS: Record<string, string> = {
  // Chinese color names
  "红": "#FF0000",
  "红色": "#FF0000",
  "蓝": "#0000FF",
  "蓝色": "#0000FF",
  "绿": "#008000",
  "绿色": "#008000",
  "黄": "#FFFF00",
  "黄色": "#FFFF00",
  "橙": "#FFA500",
  "橙色": "#FFA500",
  "紫": "#800080",
  "紫色": "#800080",
  "粉": "#FFC0CB",
  "粉色": "#FFC0CB",
  "粉红": "#FFC0CB",
  "棕": "#A52A2A",
  "棕色": "#A52A2A",
  "咖啡": "#6F4E37",
  "咖啡色": "#6F4E37",
  "灰": "#808080",
  "灰色": "#808080",
  "黑": "#000000",
  "黑色": "#000000",
  "白": "#FFFFFF",
  "白色": "#FFFFFF",
  "米": "#F5F5DC",
  "米色": "#F5F5DC",
  "米白": "#FFFFF0",
  "卡其": "#C3B091",
  "卡其色": "#C3B091",
  "金": "#FFD700",
  "金色": "#FFD700",
  "银": "#C0C0C0",
  "银色": "#C0C0C0",
  "深蓝": "#000080",
  "藏青": "#000080",
  "浅蓝": "#87CEEB",
  "天蓝": "#87CEEB",
  "深绿": "#006400",
  "浅绿": "#90EE90",
  "墨绿": "#013220",
  "军绿": "#4B5320",
  "酒红": "#722F37",
  "玫红": "#FF007F",
  "玫瑰": "#FF007F",
  "杏": "#FBCEB1",
  "杏色": "#FBCEB1",
  "驼色": "#C19A6B",
  "裸色": "#E3BC9A",
  "肤色": "#E3BC9A",
  "彩色": "#800080", // multi-color → purple
  "混色": "#800080",

  // English color names
  "red": "#FF0000",
  "blue": "#0000FF",
  "green": "#008000",
  "yellow": "#FFFF00",
  "orange": "#FFA500",
  "purple": "#800080",
  "pink": "#FFC0CB",
  "brown": "#A52A2A",
  "grey": "#808080",
  "gray": "#808080",
  "black": "#000000",
  "white": "#FFFFFF",
  "cyan": "#00FFFF",
  "teal": "#008080",
  "indigo": "#4B0082",
  "amber": "#FFBF00",
  "lime": "#00FF00",
  "navy": "#000080",
  "beige": "#F5F5DC",
  "khaki": "#C3B091",
  "gold": "#FFD700",
  "silver": "#C0C0C0",
  "maroon": "#800000",
  "olive": "#808000",
  "coral": "#FF7F50",
  "salmon": "#FA8072",
  "turquoise": "#40E0D0",
  "magenta": "#FF00FF",
  "violet": "#EE82EE",
  "lavender": "#E6E6FA",
  "cream": "#FFFDD0",
  "ivory": "#FFFFF0",
  "tan": "#D2B48C",
  "chocolate": "#D2691E",
  "coffee": "#6F4E37",
  "caramel": "#FFD59A",
  "rose": "#FF007F",
  "burgundy": "#800020",
  "wine": "#722F37",
  "mint": "#98FF98",
  "aqua": "#00FFFF",
  "sky": "#87CEEB",
  "royal": "#4169E1",
  "nude": "#E3BC9A",
  "apricot": "#FBCEB1",
  "peach": "#FFDAB9",
  "plum": "#DDA0DD",
};

/** Blacklisted placeholder hex values */
const BLACKLISTED = new Set(["#CCCCCC", "#CCC"]);

/**
 * Parse a color string (hex, rgb, or named color) into a hex value.
 * Returns null if nothing matches.
 */
export function parseColor(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Hex: #RGB or #RRGGBB
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    if (hex.length === 6 && /^[0-9a-fA-F]{6}$/.test(hex)) {
      return `#${hex.toUpperCase()}`;
    }
    if (hex.length === 3 && /^[0-9a-fA-F]{3}$/.test(hex)) {
      const expanded = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      return `#${expanded.toUpperCase()}`;
    }
    return null;
  }

  // RGB/RGBA: rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = Number.parseInt(rgbMatch[1], 10);
    const g = Number.parseInt(rgbMatch[2], 10);
    const b = Number.parseInt(rgbMatch[3], 10);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
  }

  // Named: exact match first
  const lower = trimmed.toLowerCase();
  if (NAMED_COLORS[lower]) return NAMED_COLORS[lower];

  // Named: partial / contains match (Chinese names like "深蓝色加白" → matches "深蓝")
  for (const [key, hex] of Object.entries(NAMED_COLORS)) {
    if (lower.includes(key)) return hex;
  }

  return null;
}

/** Fallback color used when option is a color type but no color could be resolved */
export const FALLBACK_COLOR = "#D4A574";

/**
 * Determine if an option is a "color" option based on flag + name detection.
 */
export function isColorOption(
  isColorFlag: number | null,
  optionName: string | null
): boolean {
  if (isColorFlag === 1) return true;
  if (!optionName) return false;
  const lower = optionName.toLowerCase();
  return lower.includes("color") || lower.includes("colour") || lower.includes("颜色");
}

/**
 * Check if a hex value is a blacklisted placeholder.
 */
export function isBlacklistedColor(hex: string | null): boolean {
  if (!hex) return false;
  return BLACKLISTED.has(hex.toUpperCase());
}

/**
 * Resolve the display color for an option value.
 * Priority: explicit color field (non-blacklisted) → parse value name → fallback.
 */
export function resolveDisplayColor(
  colorField: string | null,
  valueName: string | null,
  isColor: boolean
): string | null {
  // 1. Use explicit color if present and not blacklisted
  if (colorField && !isBlacklistedColor(colorField)) {
    const parsed = parseColor(colorField);
    if (parsed) return parsed;
  }

  // 2. Try parsing the value name (Chinese/English color name)
  if (valueName) {
    const parsed = parseColor(valueName);
    if (parsed) return parsed;
  }

  // 3. Fallback for color options
  if (isColor) return FALLBACK_COLOR;

  return null;
}

/**
 * Check if a color is "light" (for choosing dark/light text over it).
 * Uses relative luminance.
 */
export function isLightColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  const r = Number.parseInt(clean.substring(0, 2), 16);
  const g = Number.parseInt(clean.substring(2, 4), 16);
  const b = Number.parseInt(clean.substring(4, 6), 16);
  // Perceived brightness
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}
