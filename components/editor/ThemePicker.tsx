"use client";

import { THEME_PRESETS, THEME_PRESET_ORDER } from "@/lib/themes";
import type { ThemeColors, ThemePresetId } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ThemeSwatchProps {
  colors: ThemeColors;
  label: string;
  active: boolean;
  onClick?: () => void;
}

export function ThemeSwatch({ colors, label, active, onClick }: ThemeSwatchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col items-stretch gap-1.5 rounded-md p-1.5 text-left transition-colors",
        active
          ? "ring-1 ring-ring bg-secondary/60"
          : "hover:bg-secondary/40"
      )}
    >
      <div
        className="flex h-12 w-full overflow-hidden rounded border border-border"
      >
        {(["background", "land", "border", "pin"] as const).map((k) => (
          <div
            key={k}
            className="flex-1"
            style={{ background: colors[k] }}
          />
        ))}
      </div>
      <div
        className={cn(
          "px-0.5 text-[11px] tracking-tight transition-colors",
          active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
        )}
      >
        {label}
      </div>
    </button>
  );
}

interface ThemePickerProps {
  selected: ThemePresetId;
  customColors: ThemeColors;
  onSelectPreset: (id: ThemePresetId, colors: ThemeColors) => void;
  onSelectCustom: () => void;
}

export function ThemePicker({
  selected,
  customColors,
  onSelectPreset,
  onSelectCustom,
}: ThemePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {THEME_PRESET_ORDER.map((id) => {
        if (id === "custom") return null;
        const preset = THEME_PRESETS[id as Exclude<ThemePresetId, "custom">];
        if (!preset) return null;
        return (
          <ThemeSwatch
            key={id}
            colors={preset.colors}
            label={preset.label}
            active={selected === id}
            onClick={() => onSelectPreset(id, preset.colors)}
          />
        );
      })}
      <ThemeSwatch
        colors={customColors}
        label="Custom"
        active={selected === "custom"}
        onClick={onSelectCustom}
      />
    </div>
  );
}
