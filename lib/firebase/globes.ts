"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "./client";
import { generateGlobeId } from "../nanoid";
import {
  DEFAULT_BEHAVIOUR,
  DEFAULT_METADATA,
  DEFAULT_PIN_STYLE,
  DEFAULT_THEME_COLORS,
} from "../defaults";
import type { Globe, GlobeInput, Pin, PinInput } from "../types";

const globesCol = () => collection(getDb(), "globes");
const pinsCol = (globeId: string) =>
  collection(getDb(), "globes", globeId, "pins");

export async function createGlobe(ownerId: string, name = "Untitled Globe"): Promise<string> {
  const id = generateGlobeId();
  const data: GlobeInput = {
    ownerId,
    name,
    themePreset: "graphite",
    themeColors: { ...DEFAULT_THEME_COLORS },
    behaviour: { ...DEFAULT_BEHAVIOUR },
    pinStyle: { ...DEFAULT_PIN_STYLE },
    metadata: { ...DEFAULT_METADATA },
    isPublished: true,
  };
  await setDoc(doc(globesCol(), id), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export async function getGlobe(id: string): Promise<Globe | null> {
  const snap = await getDoc(doc(globesCol(), id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Globe, "id">) };
}

export function subscribeToGlobe(
  id: string,
  onUpdate: (globe: Globe | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(globesCol(), id),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      onUpdate({ id: snap.id, ...(snap.data() as Omit<Globe, "id">) });
    },
    (err) => onError?.(err)
  );
}

export async function listGlobesForOwner(ownerId: string): Promise<Globe[]> {
  const q = query(
    globesCol(),
    where("ownerId", "==", ownerId),
    orderBy("updatedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Globe, "id">) }));
}

export function subscribeToOwnerGlobes(
  ownerId: string,
  onUpdate: (globes: Globe[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    globesCol(),
    where("ownerId", "==", ownerId),
    orderBy("updatedAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Globe, "id">) }))
      );
    },
    (err) => onError?.(err)
  );
}

export async function updateGlobe(
  id: string,
  patch: Partial<GlobeInput>
): Promise<void> {
  await updateDoc(doc(globesCol(), id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteGlobe(id: string): Promise<void> {
  // Delete pins first, then globe.
  const pins = await getDocs(pinsCol(id));
  await Promise.all(pins.docs.map((p) => deleteDoc(p.ref)));
  await deleteDoc(doc(globesCol(), id));
}

// ───── pins ─────

export function subscribeToPins(
  globeId: string,
  onUpdate: (pins: Pin[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(pinsCol(globeId), orderBy("sortOrder", "asc"));
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Pin, "id">) }))
      );
    },
    (err) => onError?.(err)
  );
}

export async function listPins(globeId: string): Promise<Pin[]> {
  const q = query(pinsCol(globeId), orderBy("sortOrder", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Pin, "id">) }));
}

export async function addPin(globeId: string, input: PinInput): Promise<string> {
  const ref = await addDoc(pinsCol(globeId), {
    ...input,
    createdAt: serverTimestamp(),
  });
  await updateGlobe(globeId, {});
  return ref.id;
}

export async function updatePin(
  globeId: string,
  pinId: string,
  patch: Partial<PinInput>
): Promise<void> {
  await updateDoc(doc(pinsCol(globeId), pinId), patch);
  await updateGlobe(globeId, {});
}

export async function deletePin(globeId: string, pinId: string): Promise<void> {
  await deleteDoc(doc(pinsCol(globeId), pinId));
  await updateGlobe(globeId, {});
}
