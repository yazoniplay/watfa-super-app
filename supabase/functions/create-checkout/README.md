# Stripe Checkout Edge Function

Deploy as `create-checkout`. Set these Supabase Function Secrets:
- `STRIPE_SECRET_KEY` (test key while developing)
- `CHECKOUT_SUCCESS_URL`
- `CHECKOUT_CANCEL_URL`

The function requires a signed-in user, verifies the appointment belongs to that user, checks that it is pending/unpaid and in the future, and creates a hosted Stripe Checkout Session. It returns `{ "url": "https://checkout.stripe.com/..." }` for the app to open. The app's `EXPO_PUBLIC_CHECKOUT_URL` must point to this function.

Do not treat the appointment as paid based on the return URL. Payment confirmation must come from the signed Stripe webhook. This starter does not yet implement full calendar availability or appointment-overlap locking; add that before taking real bookings.
