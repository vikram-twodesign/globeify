"use client";

import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getDb, googleProvider } from "./client";
import type { UserDoc } from "../types";

const STORAGE_EMAIL_KEY = "globeify:signin-email";

export function actionCodeSettings() {
  const url =
    (typeof window !== "undefined" ? window.location.origin : "") +
    "/login/complete";
  return {
    url,
    handleCodeInApp: true,
  };
}

export async function sendMagicLink(email: string) {
  await sendSignInLinkToEmail(getFirebaseAuth(), email, actionCodeSettings());
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_EMAIL_KEY, email);
  }
}

export function isMagicLinkUrl(url: string) {
  return isSignInWithEmailLink(getFirebaseAuth(), url);
}

export async function completeMagicLinkSignIn(url: string, emailOverride?: string) {
  const email =
    emailOverride ??
    (typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_EMAIL_KEY)
      : null);
  if (!email) {
    throw new Error(
      "Missing email. Please re-enter the email that received the magic link."
    );
  }
  const credential = await signInWithEmailLink(getFirebaseAuth(), email, url);
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_EMAIL_KEY);
  }
  await ensureUserDoc(credential.user);
  return credential.user;
}

export async function signInWithGoogle() {
  const credential = await signInWithPopup(getFirebaseAuth(), googleProvider);
  await ensureUserDoc(credential.user);
  return credential.user;
}

export async function signOut() {
  await fbSignOut(getFirebaseAuth());
}

export async function ensureUserDoc(user: User) {
  const ref = doc(getDb(), "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  const payload: UserDoc = {
    email: user.email ?? "",
    displayName: user.displayName ?? null,
    createdAt: serverTimestamp() as unknown as Date,
    globeCount: 0,
    tier: "free",
  };
  await setDoc(ref, payload);
}
