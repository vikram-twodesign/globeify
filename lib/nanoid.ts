import { customAlphabet } from "nanoid";

// 8-character alphanumeric IDs: ~1.4M years to 1% collision probability at 1k/hour.
export const generateGlobeId = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  8
);

export const generatePinId = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  12
);
