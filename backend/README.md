# Watfa environment configuration

Copy `.env.example` to `.env` for local development, or set these variables in the build environment. The public Supabase URL and anon/publishable key are designed for client use only when Row Level Security is correctly configured. Do not add any service-role key, AI provider secret, or Stripe secret to the app.

- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`: enable Supabase authentication, profiles, history, barbers, services and appointments.
- `EXPO_PUBLIC_AI_RECOMMEND_URL`: secure server endpoint for photo-aware haircut recommendations.
- `EXPO_PUBLIC_AI_PREVIEW_URL`: secure server endpoint for generating an edited hairstyle image.
- `EXPO_PUBLIC_CHECKOUT_URL`: secure server endpoint that creates a Stripe Checkout session and returns its URL.

AI and checkout endpoints must be HTTPS, authenticate the current user, validate requests, apply rate limits, and keep provider secrets server-side. The app must never mark a booking as paid itself. The checkout backend should verify Stripe webhooks and update payment state securely.
