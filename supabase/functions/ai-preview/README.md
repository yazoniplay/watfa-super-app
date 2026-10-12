# AI haircut preview Edge Function

Deploy this function as `ai-preview` in Supabase Edge Functions and set the server-side `GEMINI_API_KEY` secret. The mobile app must use the deployed function URL as `EXPO_PUBLIC_AI_PREVIEW_URL`.

It requires a signed-in Supabase user, accepts an image up to 8 MB, sends it to Gemini's image-editing model, and returns a data URI for display in the app. The photo is processed in memory by this function and is not stored in Supabase by this code. The image provider may process/retain data under its own terms, so disclose that clearly and obtain consent before use.

Test with non-sensitive sample photos first. Add per-user rate limits, spending limits, and a clear photo deletion/privacy flow before public launch. Model availability and API access depend on your Gemini project.
