# Stripe webhook Edge Function

Deploy as `stripe-webhook`. Configure a Stripe webhook endpoint to this function's URL and subscribe to:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

Set `STRIPE_WEBHOOK_SECRET` in Supabase Function Secrets to the signing secret from that webhook endpoint. This function verifies the signature against the raw request body and only marks appointments paid when Stripe says the session is paid. Test in Stripe test mode before going live.
