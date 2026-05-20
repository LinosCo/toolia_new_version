/** Palette e gradienti della suite (themeable). Riflette i token CSS di Content Tuner. */
export const BRAND = {
  primary: "oklch(0.58 0.13 235)",   // azzurro
  secondary: "oklch(0.68 0.15 165)", // verde
} as const;

export const GRADIENTS = {
  primary: "linear-gradient(135deg, oklch(0.58 0.13 235), oklch(0.68 0.15 165))",
} as const;

/** Hue OKLCH per prodotto (per il theming futuro in @voler/ui). */
export const PRODUCT_HUE = { businessTuner: 40, contentTuner: 235, experienceTuner: 300 } as const;
