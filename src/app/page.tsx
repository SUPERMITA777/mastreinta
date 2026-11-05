import { readCloudState } from "@/lib/cloudState.server";
import { BankSettings, EventItem } from "@/lib/types";
import HomePageClient from "./HomePageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Misma regla que isEventVisiblePublicly (store.ts es "use client" y no se puede usar acá). */
function isVisible(ev: EventItem, now = new Date()): boolean {
  if (ev.hidden || ev.archived || ev.status === "ARCHIVADO") return false;
  if (ev.publishAt && ev.publishAt.trim()) {
    const launch = new Date(ev.publishAt).getTime();
    if (!Number.isNaN(launch) && launch > now.getTime()) return false;
  }
  return true;
}

export default async function HomePage() {
  let initialEvents: EventItem[] | undefined;
  let initialBank: BankSettings | undefined;

  try {
    const cloud = await readCloudState();
    if (cloud) {
      if (Array.isArray(cloud.events)) {
        initialEvents = (cloud.events as EventItem[]).filter((ev) =>
          isVisible(ev)
        );
      }
      if (cloud.settings && typeof cloud.settings === "object") {
        const s = cloud.settings as Record<string, unknown>;
        const pick: Record<string, unknown> = {};
        for (const k of [
          "bankName",
          "accountHolder",
          "cbu",
          "alias",
          "cuit",
          "whatsappSupport",
          "instagramHandle",
          "shareTitle",
          "shareDescription",
          "shareImageUrl",
        ]) {
          if (typeof s[k] === "string") pick[k] = s[k];
        }
        initialBank = pick as unknown as BankSettings;
      }
    }
  } catch (err) {
    console.error("[HomePage] Error reading cloud state:", err);
  }

  return (
    <HomePageClient initialEvents={initialEvents} initialBank={initialBank} />
  );
}
