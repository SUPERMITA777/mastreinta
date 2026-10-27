import { readCloudState } from "@/lib/cloudState.server";
import {
  INITIAL_EVENTS,
  INITIAL_SETTINGS,
  isEventVisiblePublicly,
} from "@/lib/store";
import { BankSettings, EventItem } from "@/lib/types";
import HomePageClient from "./HomePageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  let initialEvents: EventItem[] = INITIAL_EVENTS;
  let initialBank: BankSettings = INITIAL_SETTINGS;

  try {
    const cloud = await readCloudState();
    if (cloud) {
      if (Array.isArray(cloud.events) && cloud.events.length > 0) {
        initialEvents = (cloud.events as EventItem[]).filter((ev) =>
          isEventVisiblePublicly(ev)
        );
      }
      if (cloud.settings && typeof cloud.settings === "object") {
        initialBank = {
          ...INITIAL_SETTINGS,
          ...(cloud.settings as Partial<BankSettings>),
        };
      }
    }
  } catch (err) {
    console.error("[HomePage] Error reading cloud state:", err);
  }

  return (
    <HomePageClient
      initialEvents={initialEvents}
      initialBank={initialBank}
    />
  );
}
