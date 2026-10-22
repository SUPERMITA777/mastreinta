import { NextResponse } from "next/server";
import type { OrderItem } from "@/lib/types";
import { readCloudState } from "@/lib/cloudState.server";

export const dynamic = "force-dynamic";

/** Estado público mínimo de una orden (por id no adivinable). No expone entradas ni datos personales. */
export async function GET(req: Request) {
  const ref = new URL(req.url).searchParams.get("ref") || "";
  const state = await readCloudState();
  const order = ((state?.orders as OrderItem[]) || []).find((o) => o.id === ref);
  if (!order) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({
    ok: true,
    status: order.status,
    orderCode: order.orderCode,
    eventTitle: order.eventTitle,
  });
}
