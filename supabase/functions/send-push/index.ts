// Edge Function: send-push
// Recibe { title, body, tag, url, urgency } por POST desde la base de
// datos (trigger de cambios en `actividades` y jobs de pg_cron) y envía
// una notificación Web Push a TODOS los dispositivos que se
// suscribieron (tabla `push_subscriptions`), sin importar si tienen la
// página abierta o el navegador cerrado.
//
// Protegida con un header `x-cron-secret` para que solo la propia base
// de datos (que conoce el secreto) pueda invocarla.
//
// Variables de entorno requeridas (configurar con `supabase secrets set`):
//   SUPABASE_URL              (ya viene inyectada automáticamente)
//   SUPABASE_SERVICE_ROLE_KEY (ya viene inyectada automáticamente)
//   VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY
//   CRON_SECRET

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
const VAPID_SUBJECT = "mailto:notificaciones@horario.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Solo la base de datos (que conoce el secreto) puede disparar envíos.
  if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: {
    title?: string;
    body?: string;
    tag?: string;
    url?: string;
    urgency?: "very-low" | "low" | "normal" | "high";
  };
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const notificationPayload = JSON.stringify({
    title: payload.title || "Horario",
    body: payload.body || "",
    tag: payload.tag || "horario",
    url: payload.url || "./",
    urgency: payload.urgency || "high",
  });

  const results = await Promise.allSettled(
    (subs || []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notificationPayload,
          { urgency: payload.urgency || "high", TTL: 3600 }
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        // Suscripción vencida o revocada por el navegador: la limpiamos.
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
        throw err;
      }
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;

  return new Response(JSON.stringify({ total: results.length, sent, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
