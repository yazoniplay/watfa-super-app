# Watfa backend setup

## 1. Create the database

1. Create a Supabase project.
2. Open **SQL Editor** and run schema.sql.
3. Configure email authentication and email confirmation in Supabase Auth.
4. Never put the Supabase service-role key in the mobile app.

The SQL creates profiles, barber profiles, services, haircut history, face-scan metadata and appointments, with row-level security. A trigger creates a profile after signup.

## 2. Configure the app

Set these Expo environment variables in the environment used to build the APK:

- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY
- EXPO_PUBLIC_AI_RECOMMEND_URL
- EXPO_PUBLIC_AI_PREVIEW_URL
- EXPO_PUBLIC_CHECKOUT_URL

See .env.example. Only the Supabase URL and anon/publishable key belong in the app. Never put service-role keys, Gemini API keys, or Stripe secret keys in public Expo variables.

## 3. Deploy AI functions

Deploy these folders as Supabase Edge Functions:

- functions/ai-recommend
- functions/ai-preview

Set the server-side Supabase Function Secret GEMINI_API_KEY. Set the app endpoint variables to the deployed function URLs. The AI recommendation function supports JSON answers or a photo; the preview function returns an edited image data URI. Review Google's data-processing terms and add rate limits/spending caps before sharing the app publicly.

## 4. Configure hosted checkout

Deploy:

- functions/create-checkout
- functions/stripe-webhook

Set Supabase Function Secrets:
- STRIPE_SECRET_KEY (use a test-mode key while developing)
- STRIPE_WEBHOOK_SECRET
- CHECKOUT_SUCCESS_URL
- CHECKOUT_CANCEL_URL

Configure a Stripe webhook pointing to the deployed stripe-webhook function and subscribe to checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, and checkout.session.expired. Set EXPO_PUBLIC_CHECKOUT_URL to the deployed create-checkout URL. Never mark a booking paid based on the app's return URL; only the verified webhook may update payment state.

## 5. Add real barbers and services

The booking screen only lists barbers/services that exist in the database. Add verified barber profiles and services with prices stored in minor currency units (for SEK, öre). The current booking request is a pending request, not guaranteed availability. Add server-side calendar availability, overlap prevention, cancellation/refund handling, and barber confirmation before accepting real bookings.

## Privacy and launch checklist

Face photos are sensitive. Ask for consent before upload, state which AI provider receives the image, keep images out of storage unless needed, provide deletion, and add retention limits. The current preview function processes photos in memory and does not save them in Supabase. Test all payment flows with Stripe test mode and non-sensitive sample photos first.
