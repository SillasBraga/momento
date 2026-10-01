const BASE_THEME_NAMES = [
  "Início", "Despertar", "Energia", "Crescimento", "Chama",
  "Força", "Ascensão", "Épico", "Mestre", "Lendário",
] as const;

const ADVANCED_THEME_NAMES = [
  "Horizonte", "Aurora", "Prisma", "Impulso", "Fênix",
  "Solar", "Jardim", "Constelação", "Maré", "Infinito",
] as const;

const ADVANCED_TEXTURES = [
  "orbits", "rays", "contours", "stars", "lattice", "aurora",
] as const;

export function getLevelTheme(level: number) {
  const visualLevel = Number.isFinite(level) ? Math.max(1, Math.trunc(level)) : 1;

  if (visualLevel <= BASE_THEME_NAMES.length) {
    return {
      key: String(visualLevel),
      name: BASE_THEME_NAMES[visualLevel - 1],
      texture: undefined,
      properties: undefined,
    };
  }

  const index = visualLevel - 11;
  const hue = (190 + index * 47) % 360;

  return {
    key: "advanced",
    name: ADVANCED_THEME_NAMES[index] ?? "Além do lendário",
    texture: ADVANCED_TEXTURES[index % ADVANCED_TEXTURES.length],
    properties: {
      "--theme-hue": String(hue),
      "--theme-secondary-hue": String((hue + 34 + (index % 3) * 18) % 360),
      "--theme-chroma": (0.028 + (index % 4) * 0.006).toFixed(3),
      "--theme-primary-chroma": (0.12 + (index % 5) * 0.009).toFixed(3),
      "--theme-primary-lightness": (0.76 + (index % 4) * 0.025).toFixed(3),
      "--theme-glow-opacity": (0.11 + (index % 5) * 0.015).toFixed(3),
    },
  };
}
