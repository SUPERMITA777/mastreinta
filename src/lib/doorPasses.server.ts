import crypto from "crypto";
import {
  STATE_BUCKET,
  ensurePrivateState,
  getAdminSupabase,
} from "@/lib/cloudState.server";
import { AdminIdentity, isSuperIdentity } from "@/lib/adminAuth.server";
import type { EventItem } from "@/lib/types";

const DOOR_PASSES_FILE = "door-passes-v1.json";

export interface DoorScannerPass {
  eventId: string;
  token: string;
  enabled: boolean;
  doorLabel: string;
  createdAt: string;
  createdBy?: string;
  rotatedAt?: string;
}

let passesLock: Promise<unknown> = Promise.resolve();

function cleanDoorLabel(label?: string): string {
  const cleaned = String(label || "").trim().slice(0, 60);
  return cleaned || "Puerta Principal";
}

export function generateDoorToken(): string {
  return crypto.randomBytes(18).toString("base64url");
}

export async function readDoorPasses(): Promise<DoorScannerPass[]> {
  try {
    await ensurePrivateState();
    const { data, error } = await getAdminSupabase()
      .storage.from(STATE_BUCKET)
      .download(DOOR_PASSES_FILE);
    if (error || !data) return [];
    const parsed = JSON.parse(await data.text());
    return Array.isArray(parsed?.passes) ? (parsed.passes as DoorScannerPass[]) : [];
  } catch {
    return [];
  }
}

export async function writeDoorPasses(passes: DoorScannerPass[]): Promise<void> {
  await ensurePrivateState();
  const { error } = await getAdminSupabase()
    .storage.from(STATE_BUCKET)
    .upload(
      DOOR_PASSES_FILE,
      Buffer.from(JSON.stringify({ passes }), "utf-8"),
      {
        contentType: "application/json",
        upsert: true,
        cacheControl: "0",
      }
    );
  if (error) throw new Error(error.message);
}

function mutatePasses<T>(
  fn: (passes: DoorScannerPass[]) => { passes: DoorScannerPass[] | null; result: T } | Promise<{ passes: DoorScannerPass[] | null; result: T }>
): Promise<T> {
  const run = passesLock.then(async () => {
    const current = await readDoorPasses();
    const { passes, result } = await fn(current);
    if (passes !== null) {
      await writeDoorPasses(passes);
    }
    return result;
  });
  passesLock = run.catch(() => {});
  return run;
}

function safeTokenEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export async function findDoorPassByToken(
  token: string
): Promise<DoorScannerPass | null> {
  const clean = String(token || "").trim();
  if (!clean || clean.length > 128) return null;
  const passes = await readDoorPasses();
  for (const pass of passes) {
    if (pass?.token && safeTokenEqual(clean, pass.token)) {
      return pass;
    }
  }
  return null;
}

export async function ensureDoorPassForEvent(
  eventId: string,
  createdBy?: string,
  doorLabel?: string
): Promise<DoorScannerPass> {
  return mutatePasses((passes) => {
    const existing = passes.find((p) => p.eventId === eventId);
    if (existing) {
      return { passes: null, result: existing };
    }
    const created: DoorScannerPass = {
      eventId,
      token: generateDoorToken(),
      enabled: true,
      doorLabel: cleanDoorLabel(doorLabel),
      createdAt: new Date().toISOString(),
      createdBy,
    };
    return { passes: [created, ...passes], result: created };
  });
}

export async function rotateDoorPassForEvent(
  eventId: string,
  updatedBy?: string
): Promise<DoorScannerPass> {
  return mutatePasses((passes) => {
    const existing = passes.find((p) => p.eventId === eventId);
    const now = new Date().toISOString();
    if (existing) {
      const updated: DoorScannerPass = {
        ...existing,
        token: generateDoorToken(),
        enabled: true,
        rotatedAt: now,
      };
      return {
        passes: passes.map((p) => (p.eventId === eventId ? updated : p)),
        result: updated,
      };
    }
    const created: DoorScannerPass = {
      eventId,
      token: generateDoorToken(),
      enabled: true,
      doorLabel: "Puerta Principal",
      createdAt: now,
      createdBy: updatedBy,
      rotatedAt: now,
    };
    return { passes: [created, ...passes], result: created };
  });
}

export async function updateDoorPassForEvent(
  eventId: string,
  patch: { enabled?: boolean; doorLabel?: string },
  updatedBy?: string
): Promise<DoorScannerPass> {
  return mutatePasses((passes) => {
    const existing = passes.find((p) => p.eventId === eventId);
    const base: DoorScannerPass = existing || {
      eventId,
      token: generateDoorToken(),
      enabled: true,
      doorLabel: "Puerta Principal",
      createdAt: new Date().toISOString(),
      createdBy: updatedBy,
    };
    const updated: DoorScannerPass = {
      ...base,
      ...(typeof patch.enabled === "boolean" ? { enabled: patch.enabled } : {}),
      ...(typeof patch.doorLabel === "string"
        ? { doorLabel: cleanDoorLabel(patch.doorLabel) }
        : {}),
    };
    const nextPasses = existing
      ? passes.map((p) => (p.eventId === eventId ? updated : p))
      : [updated, ...passes];
    return { passes: nextPasses, result: updated };
  });
}

export function canAdminManageEventDoor(
  admin: AdminIdentity,
  event: EventItem
): boolean {
  if (isSuperIdentity(admin)) return true;
  const assigned = Array.isArray(admin.user?.assignedEventIds)
    ? admin.user!.assignedEventIds
    : [];
  if (assigned.length === 0) return true;
  const isCreator = Boolean(
    event.createdByUsername &&
      event.createdByUsername.trim().toLowerCase() ===
        admin.username.trim().toLowerCase()
  );
  return isCreator || assigned.includes(event.id);
}
