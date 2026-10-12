import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!url || !anonKey || !geminiKey) return json({ error: "Preview server secrets are not configured." }, 503);
  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Sign in before generating a preview." }, 401);
  const auth = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: userData, error: authError } = await auth.auth.getUser();
  if (authError || !userData.user) return json({ error: "Invalid session." }, 401);

  let photo: File | null = null;
  let style = "Textured crop";
  let faceShape = "Not sure";
  let hairTexture = "Not sure";
  try {
    const form = await req.formData();
    const candidate = form.get("photo");
    if (!(candidate instanceof File)) return json({ error: "A face photo is required." }, 400);
    photo = candidate;
    style = String(form.get("style") ?? style).slice(0, 80);
    faceShape = String(form.get("faceShape") ?? faceShape).slice(0, 40);
    hairTexture = String(form.get("hairTexture") ?? hairTexture).slice(0, 40);
  } catch {
    return json({ error: "Send multipart form data with a photo and hairstyle." }, 400);
  }
  if (photo.size > 8 * 1024 * 1024) return json({ error: "Photo must be 8 MB or smaller." }, 413);
  if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) return json({ error: "Use a JPEG, PNG, or WebP photo." }, 415);

  const prompt = [
    "Edit this exact photo into a realistic hairstyle try-on preview.",
    "Keep the same person, facial features, expression, skin tone, pose, background, lighting, clothing, and camera framing. Do not beautify or alter the face.",
    "Change only the hairstyle to: " + style + ".",
    "Hair texture supplied by user: " + hairTexture + ". Face shape choice supplied by user: " + faceShape + ".",
    "Make the hairline, texture, shadows, and edges look natural. Do not add text, logos, or extra people.",
    "This is a visualization only; do not imply the haircut result is guaranteed.",
  ].join("\n");

  const imageData = bytesToBase64(new Uint8Array(await photo.arrayBuffer()));
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=" + encodeURIComponent(geminiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: photo.type, data: imageData } }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return json({ error: "Image-generation provider failed. Check the Gemini API key and enabled model." }, 502);
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part: { inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } }) => part.inlineData?.data || part.inline_data?.data);
  const mime = imagePart?.inlineData?.mimeType ?? imagePart?.inline_data?.mime_type ?? "image/png";
  const data = imagePart?.inlineData?.data ?? imagePart?.inline_data?.data;
  if (typeof data !== "string") return json({ error: "Image provider returned no edited image." }, 502);
  return json({ imageUrl: "data:" + mime + ";base64," + data });
});
