import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      toEmail,
      buyerName,
      orderCode,
      eventTitle,
      eventDateLabel,
      eventTime,
      eventVenue,
      tickets,
      resendApiKey,
      originUrl,
    } = body;

    if (!toEmail || !orderCode || !Array.isArray(tickets)) {
      return NextResponse.json(
        { ok: false, error: "Faltan datos de la orden o destinatario." },
        { status: 400 }
      );
    }

    const activeResendKey =
      resendApiKey || process.env.RESEND_API_KEY || "";

    const ticketUrl = `${originUrl || "https://mastreinta.vercel.app"}/mi-entrada/${orderCode}`;

    const ticketsHtml = tickets
      .map(
        (t: {
          ticketNumber: number;
          totalInOrder: number;
          holderName: string;
          holderDni: string;
          shortCode: string;
          qrCode: string;
          tierName: string;
        }) => {
          const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
            t.qrCode
          )}`;
          return `
            <div style="background:#1c1c1c;border:1px solid #353535;border-radius:10px;overflow:hidden;margin-bottom:20px;color:#ffffff;font-family:Poppins,Arial,sans-serif;">
              <div style="background:#AF2C75;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;">
                <strong style="color:#ffffff;font-size:13px;letter-spacing:1px;">MAS30 · TICKET QR (${t.ticketNumber}/${t.totalInOrder})</strong>
              </div>
              <div style="padding:20px;text-align:center;">
                <p style="color:#ffb5d7;font-size:12px;text-transform:uppercase;margin:0 0 4px;">${t.tierName}</p>
                <h3 style="color:#ffffff;font-size:22px;margin:0 0 6px;">${eventTitle}</h3>
                <p style="color:#b0b0b0;font-size:13px;margin:0 0 16px;">${eventDateLabel} · ${eventTime} · ${eventVenue}</p>
                <div style="background:#121212;padding:10px 14px;border-radius:6px;margin-bottom:16px;text-align:left;">
                  <div style="font-size:12px;color:#8a8a8a;">ASISTENTE</div>
                  <div style="font-size:15px;color:#ffffff;font-weight:bold;">${t.holderName} (DNI ${t.holderDni})</div>
                </div>
                <div style="background:#ffffff;display:inline-block;padding:12px;border-radius:8px;">
                  <img src="${qrImgUrl}" alt="QR ${t.shortCode}" width="220" height="220" style="display:block;" />
                </div>
                <p style="color:#ffffff;font-family:monospace;font-size:14px;margin:12px 0 0;">ID Puerta: <strong>${t.shortCode}</strong></p>
              </div>
            </div>
          `;
        }
      )
      .join("");

    const htmlBody = `
      <div style="background:#121212;padding:32px 16px;color:#ffffff;font-family:Poppins,Arial,sans-serif;">
        <div style="max-width:560px;margin:0 auto;">
          <h1 style="color:#ffb5d7;font-size:28px;margin-bottom:8px;">¡Tus entradas QR para ${eventTitle}!</h1>
          <p style="color:#cccccc;font-size:14px;line-height:1.6;">
            Hola <strong>${buyerName}</strong>, tu orden <strong>${orderCode}</strong> fue autorizada por <strong>MAS30</strong>.
            Presentá cada código QR individual desde tu celular en la puerta del evento junto con tu DNI físico.
          </p>
          <div style="margin:24px 0;">
            ${ticketsHtml}
          </div>
          <div style="text-align:center;margin-top:24px;">
            <a href="${ticketUrl}" style="background:#ffb5d7;color:#121212;text-decoration:none;padding:14px 28px;border-radius:4px;font-weight:bold;font-size:14px;display:inline-block;">
              Ver y Descargar Mis Entradas Online
            </a>
          </div>
        </div>
      </div>
    `;

    if (activeResendKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeResendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:
            process.env.RESEND_FROM_EMAIL ||
            "MAS30 Eventos <onboarding@resend.dev>",
          to: [toEmail],
          subject: `Tus Entradas QR para ${eventTitle} (${orderCode}) · MAS30`,
          html: htmlBody,
        }),
      });

      if (res.ok) {
        return NextResponse.json({ ok: true, mode: "resend" });
      }
      const errData = await res.text();
      return NextResponse.json({
        ok: false,
        mode: "fallback_mailto",
        error: errData,
        ticketUrl,
      });
    }

    return NextResponse.json({
      ok: true,
      mode: "ready_no_key",
      ticketUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
