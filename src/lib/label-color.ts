export type LabelColors = {
  border: string
  background: string
  text: string
}

export type LabelColorScheme = {
  light: LabelColors
  lightHighlight: LabelColors
  dark: LabelColors
  darkHighlight: LabelColors
}

export const LABEL_COLOR_PRESETS = [
  '#e11d48',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
] as const

export function randomLabelColor(): string {
  const hue = Math.floor(Math.random() * 360)
  return hslToHex(hue, 70, 55)
}

type RoleLightness = {
  background: readonly [number, number]
  border: readonly [number, number]
  text: readonly [number, number]
}

const LIGHT_THEME = {
  background: [0.95, 0.04],
  border: [0.8, 0.1],
  text: [0.4, 0.12],
} as const

const LIGHT_THEME_HIGHLIGHT = {
  background: [0.91, 0.08],
  border: [0.72, 0.13],
  text: [0.38, 0.14],
} as const

const DARK_THEME = {
  background: [0.27, 0.06],
  border: [0.42, 0.1],
  text: [0.82, 0.14],
} as const

const DARK_THEME_HIGHLIGHT = {
  background: [0.34, 0.1],
  border: [0.5, 0.13],
  text: [0.86, 0.16],
} as const

export function deriveLabelColorScheme(base: string): LabelColorScheme {
  const { c, h } = hexToOklch(base)
  const triplet = (roles: RoleLightness): LabelColors => ({
    background: oklch(roles.background[0], Math.min(c, roles.background[1]), h),
    border: oklch(roles.border[0], Math.min(c, roles.border[1]), h),
    text: oklch(roles.text[0], Math.min(c, roles.text[1]), h),
  })

  return {
    light: triplet(LIGHT_THEME),
    lightHighlight: triplet(LIGHT_THEME_HIGHLIGHT),
    dark: triplet(DARK_THEME),
    darkHighlight: triplet(DARK_THEME_HIGHLIGHT),
  }
}

function oklch(l: number, c: number, h: number): string {
  return `oklch(${round(l)} ${round(c)} ${round(h)})`
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const { r, g, b } = hexToRgb(hex)
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  const okL = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const okA = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const okB = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_

  const c = Math.sqrt(okA * okA + okB * okB)
  const h = ((Math.atan2(okB, okA) * 180) / Math.PI + 360) % 360

  return { l: okL, c, h }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace('#', '')
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255,
  }
}

function srgbToLinear(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4)
}

function hslToHex(h: number, s: number, l: number): string {
  const sFraction = s / 100
  const lFraction = l / 100
  const chroma = (1 - Math.abs(2 * lFraction - 1)) * sFraction
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1))
  const min = lFraction - chroma / 2

  let r = 0
  let g = 0
  let b = 0
  if (h < 60) {
    ;[r, g, b] = [chroma, x, 0]
  } else if (h < 120) {
    ;[r, g, b] = [x, chroma, 0]
  } else if (h < 180) {
    ;[r, g, b] = [0, chroma, x]
  } else if (h < 240) {
    ;[r, g, b] = [0, x, chroma]
  } else if (h < 300) {
    ;[r, g, b] = [x, 0, chroma]
  } else {
    ;[r, g, b] = [chroma, 0, x]
  }

  const toHex = (channel: number): string =>
    Math.round((channel + min) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
