# AI recommendation Edge Function

Deploy this function as `ai-recommend` in Supabase Edge Functions. Set the server-side secret `GEMINI_API_KEY` in Supabase Function Secrets; never put it in the mobile app.

The app sends JSON when no photo is attached, or multipart form data with `photo`, `faceShape`, `hairTexture`, and `selectedStyle` when a photo is attached. The function requires a valid signed-in Supabase user and limits image uploads to 8 MB. It processes the image in memory and does not persist it.

Set the app's `EXPO_PUBLIC_AI_RECOMMEND_URL` to the deployed function URL. Before public launch, add per-user rate limits/quotas and confirm the provider's data retention terms. This is style guidance, not a professional or objective assessment.
