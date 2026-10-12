import { createClient } from "npm:@supabase/supabase-js@2";

function equalBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
function hexToBytes(hex: string) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
async function validStripeSignature(raw: string, signatureHeader: string, secret: string) {
  const values = signatureHeader.split(",").map((part) => part.split("=", 2));
  const timestamp = values.find(([key]) => key === "t")?.[1];
  const signatures = values.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 || signatures.length === 0) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(timestamp + "." + raw)));
  return signatures.some((sig) => {
    try { return equalBytes(digest, hexToBytes(sig)); } catch { return false; }
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!url || !serviceRole || !webhookSecret) return new Response("Webhook not configured", { status: 503 });

  const raw = await req.text();
  const signature = req.headers.get("Stripe-Signature") ?? "";
  if (!(await validStripeSignature(raw, signature, webhookSecret))) return new Response("Invalid signature", { status: 400 });
  let event: any;
  try { event = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400 }); }

  const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data?.object;
    const appointmentId = session?.metadata?.appointment_id;
    if (session?.payment_status === "paid" && typeof appointmentId === "string") {
      const { error } = await admin.from("appointments").update({ payment_status: "paid", status: "confirmed" })
        .eq("id", appointmentId).in("payment_status", ["pending", "unpaid"]);
      if (error) return new Response("Could not update appointment", { status: 500 });
    }
  } else if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
    const session = event.data?.object;
    const appointmentId = session?.metadata?.appointment_id;
    if (typeof appointmentId === "string") {
      await admin.from("appointments").update({ payment_status: "failed" })
        .eq("id", appointmentId).eq("payment_status", "pending");
    }
  }
  return Response.json({ received: true });
});
