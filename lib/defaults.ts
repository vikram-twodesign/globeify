import type { GlobeBehaviour, GlobeMetadata, PinStyle, ThemeColors } from "./types";
import { THEME_PRESETS } from "./themes";

export const DEFAULT_THEME_COLORS: ThemeColors = { ...THEME_PRESETS.graphite.colors };

export const DEFAULT_BEHAVIOUR: GlobeBehaviour = {
  autoRotate: true,
  rotationSpeed: "medium",
  showGraticule: true,
  showBorders: true,
  idleBehaviour: "resume",
};

export const DEFAULT_PIN_STYLE: PinStyle = {
  size: "medium",
  showRing: true,
  pulse: false,
};

export const DEFAULT_METADATA: GlobeMetadata = {
  title: null,
  description: null,
};

export const FREE_TIER_GLOBE_LIMIT = 3;
