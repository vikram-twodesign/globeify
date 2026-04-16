"use client";

import { useMemo } from "react";
import { ChevronsLeftRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { THEME_PRESETS } from "@/lib/themes";
import type {
  GlobeBehaviour,
  GlobeInput,
  GlobeMetadata,
  PinStyle,
  ThemeColors,
  ThemePresetId,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { ThemePicker } from "./ThemePicker";

type GlobeLike = {
  name: string;
  themePreset: ThemePresetId;
  themeColors: ThemeColors;
  behaviour: GlobeBehaviour;
  pinStyle: PinStyle;
  metadata: GlobeMetadata;
};

interface SettingsPanelProps {
  globe: GlobeLike;
  onChange: (patch: Partial<GlobeInput>) => void;
}

export function SettingsPanel({ globe, onChange }: SettingsPanelProps) {
  const pairedPreset = useMemo(() => {
    if (globe.themePreset === "custom") return null;
    const preset =
      THEME_PRESETS[globe.themePreset as Exclude<ThemePresetId, "custom">];
    if (!preset?.pair) return null;
    const paired =
      THEME_PRESETS[preset.pair as Exclude<ThemePresetId, "custom">];
    return paired ?? null;
  }, [globe.themePreset]);

  return (
    <div className="flex flex-col gap-7 p-5">
      <Section title="Name">
        <Input
          value={globe.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Untitled Globe"
        />
      </Section>

      <Section title="Theme">
        <ThemePicker
          selected={globe.themePreset}
          customColors={globe.themeColors}
          onSelectPreset={(id, colors) =>
            onChange({ themePreset: id, themeColors: colors })
          }
          onSelectCustom={() => onChange({ themePreset: "custom" })}
        />

        {pairedPreset ? (
          <button
            type="button"
            onClick={() =>
              onChange({
                themePreset: pairedPreset.id,
                themeColors: pairedPreset.colors,
              })
            }
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-transparent px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
          >
            <ChevronsLeftRight className="h-3 w-3" />
            Switch to {pairedPreset.label} ({pairedPreset.mode})
          </button>
        ) : null}

        {globe.themePreset === "custom" ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["background", "land", "border", "pin"] as const).map((key) => (
              <ColorField
                key={key}
                label={key}
                value={globe.themeColors[key]}
                onChange={(v) =>
                  onChange({
                    themeColors: { ...globe.themeColors, [key]: v },
                  })
                }
              />
            ))}
          </div>
        ) : null}
      </Section>

      <Section title="Behaviour">
        <ToggleRow
          label="Auto-rotate"
          value={globe.behaviour.autoRotate}
          onChange={(v) =>
            onChange({ behaviour: { ...globe.behaviour, autoRotate: v } })
          }
        />
        <div className="flex flex-col gap-1.5">
          <Label>Rotation speed</Label>
          <Segmented
            value={globe.behaviour.rotationSpeed}
            options={[
              { value: "slow", label: "Slow" },
              { value: "medium", label: "Medium" },
              { value: "fast", label: "Fast" },
            ]}
            onChange={(v) =>
              onChange({
                behaviour: {
                  ...globe.behaviour,
                  rotationSpeed: v as GlobeBehaviour["rotationSpeed"],
                },
              })
            }
          />
        </div>
        <ToggleRow
          label="Show graticule"
          value={globe.behaviour.showGraticule}
          onChange={(v) =>
            onChange({ behaviour: { ...globe.behaviour, showGraticule: v } })
          }
        />
        <ToggleRow
          label="Show borders"
          value={globe.behaviour.showBorders}
          onChange={(v) =>
            onChange({ behaviour: { ...globe.behaviour, showBorders: v } })
          }
        />
        <div className="flex flex-col gap-1.5">
          <Label>After interaction</Label>
          <Segmented
            value={globe.behaviour.idleBehaviour}
            options={[
              { value: "resume", label: "Resume" },
              { value: "stay", label: "Stay still" },
            ]}
            onChange={(v) =>
              onChange({
                behaviour: {
                  ...globe.behaviour,
                  idleBehaviour: v as GlobeBehaviour["idleBehaviour"],
                },
              })
            }
          />
        </div>
      </Section>

      <Section title="Pin style">
        <div className="flex flex-col gap-1.5">
          <Label>Size</Label>
          <Segmented
            value={globe.pinStyle.size}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
            onChange={(v) =>
              onChange({
                pinStyle: {
                  ...globe.pinStyle,
                  size: v as PinStyle["size"],
                },
              })
            }
          />
        </div>
        <ToggleRow
          label="Show base ring"
          value={globe.pinStyle.showRing}
          onChange={(v) =>
            onChange({ pinStyle: { ...globe.pinStyle, showRing: v } })
          }
        />
        <ToggleRow
          label="Pulse animation"
          value={globe.pinStyle.pulse}
          onChange={(v) =>
            onChange({ pinStyle: { ...globe.pinStyle, pulse: v } })
          }
        />
      </Section>

      <Section title="Metadata">
        <div className="flex flex-col gap-1.5">
          <Label>Title (embed SEO)</Label>
          <Input
            value={globe.metadata.title ?? ""}
            onChange={(e) =>
              onChange({
                metadata: {
                  ...globe.metadata,
                  title: e.target.value || null,
                },
              })
            }
            placeholder="Optional title"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Description</Label>
          <Textarea
            value={globe.metadata.description ?? ""}
            onChange={(e) =>
              onChange({
                metadata: {
                  ...globe.metadata,
                  description: e.target.value || null,
                },
              })
            }
            placeholder="Optional description"
            rows={3}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-display text-base text-foreground">{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
          value
            ? "border-foreground/60 bg-foreground"
            : "border-border bg-secondary"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3.5 w-3.5 rounded-full transition-transform",
            value
              ? "translate-x-[18px] bg-background"
              : "translate-x-0.5 bg-muted-foreground"
          )}
        />
      </button>
    </div>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className="inline-flex rounded-md border border-border bg-secondary/40 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 rounded-[5px] px-2.5 py-1 text-xs transition-colors",
            value === opt.value
              ? "bg-background text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-secondary/40 px-2 py-1.5 transition-colors hover:border-ring">
      <span
        className="h-5 w-5 shrink-0 rounded border border-border"
        style={{ background: value }}
      />
      <div className="flex min-w-0 flex-col">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="truncate font-mono text-[11px] text-foreground">
          {value}
        </span>
      </div>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
    </label>
  );
}
