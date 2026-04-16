import type { ThemeColors, ThemePresetId } from "./types";

export interface ThemePreset {
  id: ThemePresetId;
  label: string;
  mode: "dark" | "light";
  pair?: ThemePresetId;
  colors: ThemeColors;
}

export const THEME_PRESETS: Record<Exclude<ThemePresetId, "custom">, ThemePreset> = {
  graphite: {
    id: "graphite",
    label: "Graphite",
    mode: "dark",
    pair: "paper",
    colors: {
      background: "#0a0a0a",
      land: "#252525",
      border: "#3d3d3d",
      pin: "#ffffff",
    },
  },
  paper: {
    id: "paper",
    label: "Paper",
    mode: "light",
    pair: "graphite",
    colors: {
      background: "#f6f4ef",
      land: "#e2ddd3",
      border: "#b8b0a1",
      pin: "#1a1a1a",
    },
  },
  midnight: {
    id: "midnight",
    label: "Midnight",
    mode: "dark",
    pair: "ice",
    colors: {
      background: "#0a0f1c",
      land: "#1a2236",
      border: "#2d3a56",
      pin: "#cfd8e8",
    },
  },
  ice: {
    id: "ice",
    label: "Ice",
    mode: "light",
    pair: "midnight",
    colors: {
      background: "#eef3f8",
      land: "#d5e0ec",
      border: "#9fb0c3",
      pin: "#1a2a3d",
    },
  },
  sand: {
    id: "sand",
    label: "Sand",
    mode: "light",
    pair: "forest",
    colors: {
      background: "#f3ede4",
      land: "#d9c9b4",
      border: "#a68f73",
      pin: "#3b2e23",
    },
  },
  forest: {
    id: "forest",
    label: "Forest",
    mode: "dark",
    pair: "sand",
    colors: {
      background: "#0c1410",
      land: "#1e2b22",
      border: "#35493b",
      pin: "#e8ebe4",
    },
  },
};

export const THEME_PRESET_ORDER: ThemePresetId[] = [
  "graphite",
  "paper",
  "midnight",
  "ice",
  "sand",
  "forest",
];

export function getThemeColors(
  presetId: ThemePresetId,
  customColors?: ThemeColors
): ThemeColors {
  if (presetId === "custom" && customColors) return customColors;
  const preset = THEME_PRESETS[presetId as Exclude<ThemePresetId, "custom">];
  return preset ? preset.colors : THEME_PRESETS.graphite.colors;
}
