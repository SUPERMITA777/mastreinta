import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import fs from "fs/promises";
import path from "path";
import { readCloudState } from "@/lib/cloudState.server";
import { BankSettings, EventItem } from "@/lib/types";

interface TicketEmailInput {
  ticketNumber: number;
  totalInOrder: number;
  holderName: string;
  holderDni?: string;
  shortCode: string;
  qrCode: string;
  tierName: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      toEmail,
      buyerName,
      orderCode,
      eventId,
      eventTitle,
      eventDateLabel,
      eventTime,
      eventVenue,
      flyerUrl: bodyFlyerUrl,
      tickets,
      smtpUser: bodySmtpUser,
      smtpPass: bodySmtpPass,
      smtpHost: bodySmtpHost,
      smtpPort: bodySmtpPort,
      resendApiKey: bodyResendKey,
      resendFromEmail: bodyResendFrom,
      originUrl,
    } = body;

    if (!toEmail || !orderCode || !Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Faltan datos de la orden, destinatario o entradas QR." },
        { status: 400 }
      );
    }

    // Leer configuración y eventos desde Supabase Cloud State
    const cloudState = await readCloudState();
    const cloudSettings = (cloudState?.settings || {}) as Partial<BankSettings>;
    const cloudEvents = Array.isArray(cloudState?.events)
      ? (cloudState.events as EventItem[])
      : [];

    // Resolver credenciales de envío (Body -> Cloud Settings -> Variables de Entorno)
    const smtpUser = (
      bodySmtpUser ||
      cloudSettings.smtpUser ||
      process.env.SMTP_USER ||
      ""
    ).trim();
    const smtpPass = (
      bodySmtpPass ||
      cloudSettings.smtpPass ||
      process.env.SMTP_PASS ||
      ""
    )
      .replace(/\s+/g, "")
      .trim();
    const smtpHost = (
      bodySmtpHost ||
      cloudSettings.smtpHost ||
      process.env.SMTP_HOST ||
      "smtp.gmail.com"
    ).trim();
    const smtpPort = Number(
      bodySmtpPort || cloudSettings.smtpPort || process.env.SMTP_PORT || 465
    );

    const activeResendKey = (
      bodyResendKey ||
      cloudSettings.resendApiKey ||
      process.env.RESEND_API_KEY ||
      ""
    ).trim();
    const activeResendFrom = (
      bodyResendFrom ||
      cloudSettings.resendFromEmail ||
      process.env.RESEND_FROM_EMAIL ||
      "MAS30 Eventos <onboarding@resend.dev>"
    ).trim();

    // Resolver URL base pública (para links y recursos públicos)
    const rawOrigin = (originUrl || "https://mastreinta.vercel.app").replace(
      /\/$/,
      ""
    );
    const publicBaseUrl = rawOrigin.includes("localhost")
      ? "https://mastreinta.vercel.app"
      : rawOrigin;
    const ticketUrl = `${rawOrigin}/mi-entrada/${orderCode}`;

    // Resolver el flyer del evento
    let rawFlyerUrl: string = bodyFlyerUrl || "";
    if (!rawFlyerUrl && cloudEvents.length > 0) {
      const matchedEvent = cloudEvents.find(
        (ev) =>
          (eventId && ev.id === eventId) ||
          (eventTitle &&
            ev.title.toLowerCase().trim() ===
              String(eventTitle).toLowerCase().trim())
      );
      if (matchedEvent?.flyerUrl) {
        rawFlyerUrl = matchedEvent.flyerUrl;
      }
    }

    const absoluteFlyerUrl = rawFlyerUrl
      ? rawFlyerUrl.startsWith("http")
        ? rawFlyerUrl
        : `${publicBaseUrl}${rawFlyerUrl.startsWith("/") ? "" : "/"}${rawFlyerUrl}`
      : "";

    // Intentar cargar el buffer del flyer para adjuntarlo inline (CID) y como archivo adjunto
    let flyerBuffer: Buffer | null = null;
    let flyerMimeType = "image/png";
    let flyerExt = "png";

    if (rawFlyerUrl) {
      try {
        if (rawFlyerUrl.startsWith("/")) {
          const localPath = path.join(
            process.cwd(),
            "public",
            rawFlyerUrl.replace(/^\//, "")
          );
          flyerBuffer = await fs.readFile(localPath);
          if (rawFlyerUrl.toLowerCase().endsWith(".jpg") || rawFlyerUrl.toLowerCase().endsWith(".jpeg")) {
            flyerMimeType = "image/jpeg";
            flyerExt = "jpg";
          } else if (rawFlyerUrl.toLowerCase().endsWith(".webp")) {
            flyerMimeType = "image/webp";
            flyerExt = "webp";
          }
        } else if (rawFlyerUrl.startsWith("http")) {
          const flyerRes = await fetch(rawFlyerUrl);
          if (flyerRes.ok) {
            const contentType = flyerRes.headers.get("content-type") || "image/png";
            flyerMimeType = contentType;
            if (contentType.includes("jpeg") || contentType.includes("jpg")) {
              flyerExt = "jpg";
            } else if (contentType.includes("webp")) {
              flyerExt = "webp";
            }
            const arrBuf = await flyerRes.arrayBuffer();
            flyerBuffer = Buffer.from(arrBuf);
          }
        }
      } catch {
        // Si falla la lectura del buffer, se usa absoluteFlyerUrl en el HTML
      }
    }

    // Generar buffers PNG de cada código QR
    const qrAttachments: {
      ticketNumber: number;
      shortCode: string;
      holderName: string;
      cid: string;
      filename: string;
      buffer: Buffer;
      fallbackUrl: string;
    }[] = [];

    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i] as TicketEmailInput;
      const num = t.ticketNumber || i + 1;
      const cid = `qr-ticket-${num}@mas30`;
      const filename = `QR-Entrada-${num}-${t.shortCode || orderCode}.png`;
      const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(
        t.qrCode
      )}`;
      const buffer = await QRCode.toBuffer(t.qrCode, {
        type: "png",
        width: 320,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      qrAttachments.push({
        ticketNumber: num,
        shortCode: t.shortCode,
        holderName: t.holderName,
        cid,
        filename,
        buffer,
        fallbackUrl,
      });
    }

    const useCidImages = Boolean(smtpUser && smtpPass);

    const flyerImgSrc =
      useCidImages && flyerBuffer ? "cid:event-flyer@mas30" : absoluteFlyerUrl;

    const flyerHeaderHtml = flyerImgSrc
      ? `
        <div style="margin-bottom:24px;border-radius:12px;overflow:hidden;border:1px solid #353535;background:#1c1c1c;text-align:center;">
          <img src="${flyerImgSrc}" alt="Flyer ${eventTitle}" style="width:100%;max-width:560px;height:auto;display:block;margin:0 auto;" />
        </div>
      `
      : "";

    const ticketsHtml = (tickets as TicketEmailInput[])
      .map((t, idx) => {
        const qrItem = qrAttachments[idx];
        const qrImgSrc = useCidImages ? `cid:${qrItem.cid}` : qrItem.fallbackUrl;
        return `
          <div style="background:#1c1c1c;border:1px solid #353535;border-radius:10px;overflow:hidden;margin-bottom:20px;color:#ffffff;font-family:Poppins,Arial,sans-serif;">
            <div style="background:#AF2C75;padding:12px 18px;">
              <strong style="color:#ffffff;font-size:13px;letter-spacing:1px;">MAS30 · TICKET QR (${t.ticketNumber || idx + 1}/${t.totalInOrder || tickets.length})</strong>
            </div>
            <div style="padding:20px;text-align:center;">
              <p style="color:#ffb5d7;font-size:12px;text-transform:uppercase;margin:0 0 4px;">${t.tierName || "Entrada"}</p>
              <h3 style="color:#ffffff;font-size:22px;margin:0 0 6px;">${eventTitle}</h3>
              <p style="color:#b0b0b0;font-size:13px;margin:0 0 16px;">${eventDateLabel || ""} · ${eventTime || ""} · ${eventVenue || ""}</p>
              <div style="background:#121212;padding:10px 14px;border-radius:6px;margin-bottom:16px;text-align:left;">
                <div style="font-size:11px;color:#8a8a8a;text-transform:uppercase;">ASISTENTE / ACCESO</div>
                <div style="font-size:15px;color:#ffffff;font-weight:bold;">${t.holderName}${t.holderDni ? ` (DNI ${t.holderDni})` : ""}</div>
              </div>
              <div style="background:#ffffff;display:inline-block;padding:14px;border-radius:8px;">
                <img src="${qrImgSrc}" alt="QR ${t.shortCode}" width="220" height="220" style="display:block;margin:0 auto;" />
              </div>
              <div style="margin:16px auto 0;background:#121212;border:1px solid #ffb5d7;border-radius:6px;padding:10px 18px;display:inline-block;">
                <div style="font-size:11px;color:#ffb5d7;text-transform:uppercase;letter-spacing:1px;">Código Alfanumérico (4 dígitos)</div>
                <div style="font-family:monospace;font-size:26px;font-weight:bold;color:#ffffff;letter-spacing:5px;margin-top:2px;">${t.shortCode}</div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    const htmlBody = `
      <div style="background:#121212;padding:32px 16px;color:#ffffff;font-family:Poppins,Arial,sans-serif;">
        <div style="max-width:560px;margin:0 auto;">
          ${flyerHeaderHtml}
          <h1 style="color:#ffb5d7;font-size:26px;margin:0 0 10px;">¡Tus entradas QR para ${eventTitle}!</h1>
          <p style="color:#cccccc;font-size:14px;line-height:1.6;margin:0 0 20px;">
            Hola <strong>${buyerName}</strong>, tu orden <strong>${orderCode}</strong> fue autorizada por <strong>MAS30</strong>.
            En la puerta del evento podés presentar cualquiera de los dos: el <strong>código QR</strong> o tu <strong>código alfanumérico de 4 dígitos</strong>.
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

    // 1. Envío mediante SMTP / Gmail (permite enviar a cualquier destinatario sin restricciones de dominio)
    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const attachments: {
        filename: string;
        content: Buffer;
        contentType: string;
        cid: string;
      }[] = [];

      if (flyerBuffer) {
        attachments.push({
          filename: `Flyer-${(eventTitle || "MAS30").replace(/[^a-zA-Z0-9_-]/g, "_")}.${flyerExt}`,
          content: flyerBuffer,
          contentType: flyerMimeType,
          cid: "event-flyer@mas30",
        });
      }

      for (const qr of qrAttachments) {
        attachments.push({
          filename: qr.filename,
          content: qr.buffer,
          contentType: "image/png",
          cid: qr.cid,
        });
      }

      await transporter.sendMail({
        from: `"MAS30 Eventos" <${smtpUser}>`,
        to: toEmail,
        subject: `Tus Entradas QR para ${eventTitle} (${orderCode}) · MAS30`,
        html: htmlBody,
        attachments,
      });

      return NextResponse.json({
        ok: true,
        mode: "smtp",
        ticketUrl,
      });
    }

    // 2. Envío mediante Resend API (si configuraron Resend API Key)
    if (activeResendKey) {
      const resendAttachments: {
        filename: string;
        content: string;
      }[] = [];

      if (flyerBuffer) {
        resendAttachments.push({
          filename: `Flyer-${(eventTitle || "MAS30").replace(/[^a-zA-Z0-9_-]/g, "_")}.${flyerExt}`,
          content: flyerBuffer.toString("base64"),
        });
      }

      for (const qr of qrAttachments) {
        resendAttachments.push({
          filename: qr.filename,
          content: qr.buffer.toString("base64"),
        });
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeResendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: activeResendFrom,
          to: [toEmail],
          subject: `Tus Entradas QR para ${eventTitle} (${orderCode}) · MAS30`,
          html: htmlBody,
          attachments: resendAttachments,
        }),
      });

      if (res.ok) {
        return NextResponse.json({ ok: true, mode: "resend", ticketUrl });
      }
      const errData = await res.text();
      return NextResponse.json({
        ok: false,
        mode: "resend_error",
        error: `Error de Resend: ${errData}`,
        ticketUrl,
      });
    }

    // 3. Si no hay credenciales SMTP ni Resend configuradas
    return NextResponse.json({
      ok: false,
      mode: "missing_credentials",
      error:
        "Falta configurar el correo de envío (Gmail o Resend) en la pestaña Configuración del Admin.",
      ticketUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
