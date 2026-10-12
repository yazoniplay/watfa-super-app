import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!supabaseUrl || !anonKey || !geminiKey) return json({ error: "Server secrets are not configured." }, 503);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Sign in first." }, 401);
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Invalid session." }, 401);

  let faceShape = "Not sure";
  let hairTexture = "Not sure";
  let selectedStyle = "No preference";
  let imagePart: { inline_data: { mime_type: string; data: string } } | null = null;

  try {
    const form = await req.formData();
    faceShape = String(form.get("faceShape") ?? faceShape).slice(0, 40);
    hairTexture = String(form.get("hairTexture") ?? hairTexture).slice(0, 40);
    selectedStyle = String(form.get("selectedStyle") ?? selectedStyle).slice(0, 80);
    const photo = form.get("photo");
    if (photo instanceof File) {
      if (photo.size > 8 * 1024 * 1024) return json({ error: "Photo must be 8 MB or smaller." }, 413);
      if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) return json({ error: "Use a JPEG, PNG, or WebP photo." }, 415);
      imagePart = { inline_data: { mime_type: photo.type, data: bytesToBase64(new Uint8Array(await photo.arrayBuffer())) } };
    } else {
      const body = await req.clone().json().catch(() => ({}));
      faceShape = String(body.faceShape ?? faceShape).slice(0, 40);
      hairTexture = String(body.hairTexture ?? hairTexture).slice(0, 40);
      selectedStyle = String(body.selectedStyle ?? selectedStyle).slice(0, 80);
    }
  } catch {
    return json({ error: "Could not read request. Send JSON or multipart form data." }, 400);
  }

  const prompt = [
    "You are a practical barber-style assistant. Suggest 2 or 3 haircut options, with one short reason for each and a simple sentence the user can tell their barber.",
    "Do not rate attractiveness, infer identity, ethnicity, health, or sensitive traits. Do not claim certainty about face shape. Respect the user's preferences and natural hair texture.",
    "User-provided face-shape choice: " + faceShape,
    "User-provided hair texture: " + hairTexture,
    "Preferred direction: " + selectedStyle,
    imagePart ? "Use the photo only to discuss visible hair length, hair texture, and hairstyle compatibility. Avoid identifying the person." : "No photo supplied; base suggestions only on the user's answers.",
  ].join("\n");

  const parts: unknown[] = [{ text: prompt }];
  if (imagePart) parts.push(imagePart);
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(geminiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.5, maxOutputTokens: 500 } }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return json({ error: "AI provider request failed." }, 502);
  const recommendation = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim();
  if (!recommendation) return json({ error: "AI provider returned no recommendation." }, 502);
  return json({ recommendation });
});
