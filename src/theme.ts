import {
  catppuccinTheme,
  direction,
  setLocale,
  storage,
  system,
  theme,
  type ColorValue,
} from "pulsar"
import { app, ui } from "./state.ts"

const lightPalette = {
  background: "#f5f6fa",
  surface: "#ffffff",
  surfaceVariant: "#eceef4",
  primary: "#6c5ce7",
  text: "#1e2230",
  textSecondary: "#6b7280",
  border: "#e3e6ee",
  layer3: "#ffffff",
  layer4: "#ffffff",
  radius: 12,
  spacing: 8,
}

const darkPalette = {
  background: "#0a0b12",
  surface: "#12141e",
  surfaceVariant: "#1a1d2a",
  primary: "#b388ff",
  text: "#e8eaf6",
  textSecondary: "#8b90a8",
  border: "#262a3b",
  layer3: "#161925",
  layer4: "#1e2130",
  radius: 14,
  spacing: 8,
}

export const isDarkTheme = (): boolean => {
  return ui.themeDark
}

export const applyTheme = async (dark = isDarkTheme()): Promise<void> => {
  const base = catppuccinTheme(dark ? "frappe" : "latte")

  const palette = dark ? darkPalette : lightPalette
  const locale = await system
    .locale()
    .then((info) => info.locale)
    .catch(() => "ru")

  setLocale(locale)

  await theme.set({
    ...base,
    palette,
    colors: {
      ...base.colors,
      text: palette.text,
      subtext: palette.textSecondary,
      overlay: palette.textSecondary,
      surface: palette.surface,
      base: palette.background,
      mantle: palette.background,
      crust: palette.background,
    },
    fontFamily: "Noto Sans",
    fontScale: 1,
    density: 1,
    direction: direction(locale),
  })
}

export const textColor = (muted = false): ColorValue => {
  if (isDarkTheme()) return muted ? "#8b90a8" : "#e8eaf6"

  return muted ? "#6b7280" : "#1e2230"
}

export const surfaceColor = (): ColorValue => {
  return isDarkTheme() ? "#12141e" : "#ffffff"
}

export const backgroundColor = (): ColorValue => {
  return isDarkTheme() ? "#0a0b12" : "#f5f6fa"
}

export const borderColor = (): ColorValue => {
  return isDarkTheme() ? "#262a3b" : "#e3e6ee"
}

export const hoverSurfaceColor = (): ColorValue => {
  return isDarkTheme() ? "#1a1d2a" : "#f0f1f7"
}

export const accentFrom = (): ColorValue => {
  return isDarkTheme() ? "#5ce1e6" : "#0ea5b7"
}

export const accentTo = (): ColorValue => {
  return isDarkTheme() ? "#b388ff" : "#6c5ce7"
}

export const dangerColor = (): ColorValue => {
  return isDarkTheme() ? "#ff5c8a" : "#e11d48"
}

export const onAccentColor = (): ColorValue => {
  return isDarkTheme() ? "#0a0b12" : "#ffffff"
}

export const toggleTheme = (): void => {
  const dark = !isDarkTheme()

  ui.themeDark = dark
  void storage.set("themeDark", dark)
  void applyTheme(dark)
}

export const watchTheme = async (): Promise<void> => {
  ui.themeDark = (await storage.get("themeDark")) !== false

  await applyTheme()

  app.on("theme-changed", () => void applyTheme())
}
