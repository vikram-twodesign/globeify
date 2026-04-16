import type { Timestamp } from "firebase/firestore";

export type ThemePresetId =
  | "graphite"
  | "paper"
  | "midnight"
  | "ice"
  | "sand"
  | "forest"
  | "custom";

export interface ThemeColors {
  background: string;
  land: string;
  border: string;
  pin: string;
}

export interface GlobeBehaviour {
  autoRotate: boolean;
  rotationSpeed: "slow" | "medium" | "fast";
  showGraticule: boolean;
  showBorders: boolean;
  idleBehaviour: "resume" | "stay";
}

export interface PinStyle {
  size: "small" | "medium" | "large";
  showRing: boolean;
  pulse: boolean;
}

export interface GlobeMetadata {
  title: string | null;
  description: string | null;
}

export interface Globe {
  id: string;
  ownerId: string;
  name: string;
  themePreset: ThemePresetId;
  themeColors: ThemeColors;
  behaviour: GlobeBehaviour;
  pinStyle: PinStyle;
  metadata: GlobeMetadata;
  isPublished: boolean;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export type GlobeInput = Omit<Globe, "id" | "createdAt" | "updatedAt">;

export interface Pin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string | null;
  url: string | null;
  sortOrder: number;
  createdAt?: Timestamp | Date;
}

export type PinInput = Omit<Pin, "id" | "createdAt">;

export interface UserDoc {
  email: string;
  displayName: string | null;
  createdAt: Timestamp | Date;
  globeCount: number;
  tier: "free" | "pro";
}
