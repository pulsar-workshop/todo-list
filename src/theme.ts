import { catppuccinTheme, theme, type ColorValue } from "pulsar";
import { app, uiValue } from "./state.ts";

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
};

const darkPalette = {
  background: "#0f1117",
  surface: "#171a22",
  surfaceVariant: "#20242e",
  primary: "#8b9dff",
  text: "#e7e9f0",
  textSecondary: "#9aa1b2",
  border: "#272c38",
  layer3: "#1d212b",
  layer4: "#242936",
  radius: 12,
  spacing: 8,
};

export const isDarkTheme = (): boolean => {
  return uiValue("themeDark", true);
};

export const applyTheme = async (dark = isDarkTheme()): Promise<void> => {
  const base = catppuccinTheme(dark ? "frappe" : "latte");

  const palette = dark ? darkPalette : lightPalette;

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
  });

  await new Promise((resolve) => setTimeout(resolve, 120));
  app.store.set("themeEpoch", Date.now());
};

export const textColor = (muted = false): ColorValue => {
  if (isDarkTheme()) return muted ? "#9aa1b2" : "#e7e9f0";

  return muted ? "#6b7280" : "#1e2230";
};

export const surfaceColor = (): ColorValue => {
  return isDarkTheme() ? "#171a22" : "#ffffff";
};

export const backgroundColor = (): ColorValue => {
  return isDarkTheme() ? "#0f1117" : "#f5f6fa";
};

export const toggleTheme = (): void => {
  const dark = !isDarkTheme();

  app.store.set("themeDark", dark);
  void applyTheme(dark);
};

export const watchTheme = async (): Promise<void> => {
  await applyTheme(true);

  app.on("theme-changed", () => void applyTheme());
};
