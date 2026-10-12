import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const successUrl = Deno.env.get("CHECKOUT_SUCCESS_URL");
  const cancelUrl = Deno.env.get("CHECKOUT_CANCEL_URL");
  if (!url || !anon || !service || !stripeKey || !successUrl || !cancelUrl) return json({ error: "Checkout server secrets are not configured." }, 503);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Sign in first." }, 401);
  const auth = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await auth.auth.getUser();
  if (authError || !authData.user) return json({ error: "Invalid session." }, 401);

  const input = await req.json().catch(() => null);
  const appointmentId = typeof input?.appointmentId === "string" ? input.appointmentId : "";
  if (!appointmentId) return json({ error: "appointmentId is required." }, 400);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: appointment } = await admin.from("appointments").select("id,customer_id,service_id,starts_at,status,payment_status")
    .eq("id", appointmentId).eq("customer_id", authData.user.id).maybeSingle();
  if (!appointment) return json({ error: "Appointment not found." }, 404);
  if (appointment.status !== "pending" || !["unpaid", "pending"].includes(appointment.payment_status)) return json({ error: "Appointment is not payable." }, 409);
  if (new Date(appointment.starts_at).getTime() <= Date.now()) return json({ error: "Appointment must be in the future." }, 400);

  const { data: serviceRow } = await admin.from("services").select("name,price_minor,currency,is_active").eq("id", appointment.service_id).maybeSingle();
  if (!serviceRow || !serviceRow.is_active || serviceRow.price_minor < 1) return json({ error: "Service unavailable." }, 409);
  const form = new URLSearchParams({
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: appointment.id,
    "metadata[appointment_id]": appointment.id,
    "metadata[customer_id]": authData.user.id,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": String(serviceRow.currency).toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(serviceRow.price_minor),
    "line_items[0][price_data][product_data][name]": String(serviceRow.name).slice(0, 120),
  });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: "Bearer " + stripeKey, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const session = await response.json().catch(() => ({}));
  if (!response.ok || typeof session.url !== "string") return json({ error: "Could not create checkout session." }, 502);
  await admin.from("appointments").update({ payment_status: "pending" }).eq("id", appointment.id).eq("payment_status", "unpaid");
  return json({ url: session.url });
});
