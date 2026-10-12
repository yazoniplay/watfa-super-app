# Supabase backend setup

This folder is the database foundation for Watfa accounts, barber profiles, services, haircut history, private face-scan metadata, and appointments.

## Setup

1. Create a Supabase project.
2. Open **SQL Editor** in the Supabase dashboard.
3. Run `schema.sql`.
4. Configure Auth providers and redirect URLs.
5. Create a **private** Storage bucket for face photos; add Storage RLS policies before uploading anything.
6. Add the Supabase project URL and anon/publishable key to the app's Expo public environment variables. Never use the service-role key in a mobile app.

## What's not live yet

The current app does not yet sign users in or read/write these tables. Camera capture is local to the app session. AI recommendations and realistic image editing need a server-side endpoint and a chosen provider. Appointment creation needs availability checks; payments need a server-side Stripe Checkout flow and verified webhooks. Do not accept real bookings or money until those parts are implemented and tested.

## Privacy

Face photos are sensitive personal data. Ask for explicit consent, use private storage, minimize retention, provide deletion, and avoid uploading photos until the user has agreed to the privacy policy. Test with non-sensitive sample photos first.
