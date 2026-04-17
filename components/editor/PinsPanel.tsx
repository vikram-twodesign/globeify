"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Pin, PinInput } from "@/lib/types";
import { sanitizeExternalUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import { debounce } from "@/lib/debounce";
import { searchGeocode, type GeocodeResult } from "@/lib/geocode";

interface PinsPanelProps {
  pins: Pin[];
  selectedPinId: string | null;
  onFocus: (pin: Pin) => void;
  onAdd: (input: PinInput) => Promise<void> | void;
  onUpdate: (id: string, patch: Partial<PinInput>) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export function PinsPanel({
  pins,
  selectedPinId,
  onFocus,
  onAdd,
  onUpdate,
  onDelete,
}: PinsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleAdd(input: PinInput) {
    await onAdd(input);
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <section className="flex flex-col gap-3">
        <h3 className="font-display text-base text-foreground">Add a pin</h3>
        <AddPinForm
          nextSortOrder={(pins[pins.length - 1]?.sortOrder ?? -1) + 1}
          onSubmit={handleAdd}
        />
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-base text-foreground">Pins</h3>
          <span className="text-[11px] text-muted-foreground">
            {pins.length} total
          </span>
        </div>

        {pins.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-secondary/30 px-4 py-6 text-center text-xs text-muted-foreground">
            No pins yet. Add one above.
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {pins.map((pin) => {
              const expanded = expandedId === pin.id;
              return (
                <li key={pin.id}>
                  <PinRow
                    pin={pin}
                    expanded={expanded}
                    isSelected={selectedPinId === pin.id}
                    onToggle={() =>
                      setExpandedId(expanded ? null : pin.id)
                    }
                    onFocus={() => onFocus(pin)}
                    onUpdate={(patch) => onUpdate(pin.id, patch)}
                    onDelete={async () => {
                      if (expanded) setExpandedId(null);
                      await onDelete(pin.id);
                    }}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

interface AddPinFormProps {
  nextSortOrder: number;
  onSubmit: (input: PinInput) => Promise<void> | void;
}

function AddPinForm({ nextSortOrder, onSubmit }: AddPinFormProps) {
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Search-a-place state ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchUnavailable, setSearchUnavailable] = useState(false);
  const searchSeq = useRef(0);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useMemo(
    () =>
      debounce((q: string) => {
        const seq = ++searchSeq.current;
        if (!q.trim()) {
          setSearchResults([]);
          setSearchOpen(false);
          setSearchLoading(false);
          return;
        }
        setSearchLoading(true);
        searchGeocode(q)
          .then((results) => {
            if (seq !== searchSeq.current) return;
            setSearchResults(results.slice(0, 5));
            setSearchOpen(results.length > 0);
            setSearchLoading(false);
          })
          .catch(() => {
            if (seq !== searchSeq.current) return;
            setSearchLoading(false);
            setSearchResults([]);
            setSearchOpen(false);
            setSearchUnavailable(true);
            if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
            errorTimerRef.current = setTimeout(
              () => setSearchUnavailable(false),
              3000
            );
          });
      }, 350),
    []
  );

  useEffect(() => {
    return () => {
      runSearch.cancel();
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [runSearch]);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (!value.trim()) {
      runSearch.cancel();
      setSearchResults([]);
      setSearchOpen(false);
      setSearchLoading(false);
      return;
    }
    runSearch(value);
  }

  function pickResult(result: GeocodeResult) {
    setName(result.name);
    setLat(String(result.lat));
    setLng(String(result.lng));
    setSearchOpen(false);
    setSearchResults([]);
    setSearchQuery("");
    runSearch.cancel();
    // Focus description next.
    requestAnimationFrame(() => {
      descriptionRef.current?.focus();
    });
  }

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    const latNum = lat.trim() === "" ? NaN : Number(lat);
    const lngNum = lng.trim() === "" ? NaN : Number(lng);
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      setError("Latitude must be between -90 and 90");
      return;
    }
    if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
      setError("Longitude must be between -180 and 180");
      return;
    }
    const safeUrl = sanitizeExternalUrl(url);
    if (url.trim() && !safeUrl) {
      setError("URL must start with http:// or https://");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        lat: latNum,
        lng: lngNum,
        description: description.trim() ? description.trim() : null,
        url: safeUrl,
        sortOrder: nextSortOrder,
      });
      setName("");
      setLat("");
      setLng("");
      setDescription("");
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add pin");
    } finally {
      setSubmitting(false);
    }
  }

  function onKeyDownSubmit(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-2"
    >
      <div className="relative flex flex-col gap-1">
        <Label>Search a place</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setSearchOpen(true);
            }}
            onBlur={() => {
              // Delay close so clicks on the dropdown register first.
              setTimeout(() => setSearchOpen(false), 150);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchOpen(false);
              }
            }}
            placeholder="Search places, cities, landmarks…"
            className="pl-7"
            aria-autocomplete="list"
            aria-expanded={searchOpen}
          />
        </div>
        {searchOpen && searchResults.length > 0 ? (
          <ul
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-md"
            role="listbox"
          >
            {searchResults.map((r, idx) => (
              <li key={`${r.lat},${r.lng},${idx}`}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    // Prevent input blur before click registers.
                    e.preventDefault();
                  }}
                  onClick={() => pickResult(r)}
                  className="flex w-full flex-col items-start gap-0.5 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent"
                  role="option"
                  aria-selected="false"
                >
                  <span className="line-clamp-1 text-foreground">
                    {r.displayName}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {r.lat.toFixed(3)}, {r.lng.toFixed(3)}
                    {r.country ? ` · ${r.country}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {searchLoading ? (
          <div className="text-[11px] text-muted-foreground">Searching…</div>
        ) : null}
        {searchUnavailable ? (
          <div className="animate-in fade-in text-[11px] text-muted-foreground">
            Search unavailable
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <Label>Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onKeyDownSubmit}
          placeholder="e.g. Mumbai"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label>Latitude</Label>
          <Input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            onKeyDown={onKeyDownSubmit}
            placeholder="19.076"
            inputMode="decimal"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Longitude</Label>
          <Input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            onKeyDown={onKeyDownSubmit}
            placeholder="72.877"
            inputMode="decimal"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label>Description (optional)</Label>
        <Textarea
          ref={descriptionRef}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Supports **bold**, *italic*, [links](url)"
          rows={2}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label>URL (optional)</Label>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={onKeyDownSubmit}
          placeholder="https://…"
        />
      </div>
      {error ? (
        <div className="text-[11px] text-destructive">{error}</div>
      ) : null}
      <Button
        type="submit"
        size="sm"
        disabled={submitting}
        className="self-start"
      >
        <Plus className="h-3.5 w-3.5" />
        Add pin
      </Button>
    </form>
  );
}

interface PinRowProps {
  pin: Pin;
  expanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onFocus: () => void;
  onUpdate: (patch: Partial<PinInput>) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}

function PinRow({
  pin,
  expanded,
  isSelected,
  onToggle,
  onFocus,
  onUpdate,
  onDelete,
}: PinRowProps) {
  return (
    <div
      className={cn(
        "rounded-md border transition-colors",
        isSelected
          ? "border-ring bg-secondary/60"
          : "border-border bg-secondary/30 hover:border-ring/60"
      )}
    >
      <div className="flex items-center gap-2 px-2.5 py-2">
        <button
          type="button"
          onClick={onFocus}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          title="Focus on globe"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-foreground">{pin.name}</div>
            <div className="truncate font-mono text-[10px] text-muted-foreground">
              {pin.lat.toFixed(3)}, {pin.lng.toFixed(3)}
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="rounded px-1.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          {expanded ? "Close" : "Edit"}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete "${pin.name}"?`)) onDelete();
          }}
          className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
          aria-label="Delete pin"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded ? (
        <EditPinForm
          key={pin.id}
          pin={pin}
          onUpdate={onUpdate}
        />
      ) : null}
    </div>
  );
}

interface EditPinFormProps {
  pin: Pin;
  onUpdate: (patch: Partial<PinInput>) => Promise<void> | void;
}

function EditPinForm({ pin, onUpdate }: EditPinFormProps) {
  const [name, setName] = useState(pin.name);
  const [lat, setLat] = useState(String(pin.lat));
  const [lng, setLng] = useState(String(pin.lng));
  const [description, setDescription] = useState(pin.description ?? "");
  const [url, setUrl] = useState(pin.url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      setError("Latitude must be between -90 and 90");
      return;
    }
    if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
      setError("Longitude must be between -180 and 180");
      return;
    }
    const safeUrl = sanitizeExternalUrl(url);
    if (url.trim() && !safeUrl) {
      setError("URL must start with http:// or https://");
      return;
    }
    setSaving(true);
    try {
      await onUpdate({
        name: name.trim(),
        lat: latNum,
        lng: lngNum,
        description: description.trim() ? description.trim() : null,
        url: safeUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function onKeyDownSave(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border px-2.5 py-3">
      <div className="flex flex-col gap-1">
        <Label>Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onKeyDownSave}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label>Latitude</Label>
          <Input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            onKeyDown={onKeyDownSave}
            inputMode="decimal"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Longitude</Label>
          <Input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            onKeyDown={onKeyDownSave}
            inputMode="decimal"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label>URL</Label>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={onKeyDownSave}
          placeholder="https://…"
        />
      </div>
      {error ? (
        <div className="text-[11px] text-destructive">{error}</div>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={save}
        disabled={saving}
        className="self-start"
      >
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
