# Watfa — AI Barber Super App

Watfa is an early-stage Expo app for customers and barbers. It now includes a deployed, authenticated AI hairstyle-photo-preview endpoint and AI haircut recommendations. It is suitable for controlled testing, but it is not yet a production-ready public marketplace.

## Current app features

- Front-camera capture with an in-session photo preview
- Supabase email/password account creation and sign-in UI, with persistent session storage
- Save haircut choices to a signed-in user's history and view appointment history
- Barber/service browsing from Supabase and pending appointment requests
- Deployed Supabase Edge Functions for authenticated AI haircut recommendations and AI-generated hairstyle photo previews
- AI preview requests show a loading state and return the generated image in the app
- Style-finder questionnaire with clearly labelled rule-based suggestions (not AI)
- Initial Supabase SQL schema for profiles, barber services, haircut history, private scan metadata, and appointments

- Expo + React Native + TypeScript
- Three.js rendered with React Three Fiber Native
- Procedural demo head with touch rotation
- Customer and Barber modes
- Four demo hairstyle presets
- Draft barber checklist
- Dark, warm-neutral visual system

**Important limitations:** the rotatable 3D head is procedural demo geometry, not a scan of the user. The strand meshes are visual approximations, not photorealistic hair. The camera hairline guide is manually aligned and does not track facial landmarks. AI photo previews are generated edits, not a live 3D reconstruction, and may vary in accuracy. The barber checklist is not validated cutting advice.

## Build an Android APK without a local terminal

A GitHub Actions workflow can build a debug APK on GitHub's hosted runner:

1. Open the repository's **Actions** tab.
2. Select **Android APK**.
3. Click **Run workflow**, keep the `main` branch selected, then start the run.
4. Open the completed run and download the `watfa-android-debug-apk` artifact.
5. Extract the ZIP on your Android phone and open `app-debug.apk`. Android may ask you to allow installs from the browser or file manager you used. Only install APKs you built or trust.

This is a debug/testing APK, not a Play Store release. The first cloud build may take several minutes and can fail if a dependency or native build setting needs adjustment. Check the workflow log for the actual result.

## Run locally

Use Node.js LTS and a compatible iOS or Android development environment.

```bash
npm install
npx expo install --check
npx expo start
```

Scan the QR code with Expo Go if the native dependencies are supported by your installed Expo Go version. If the native GL module requires a custom development build, create one using the Expo development-build workflow.

## Backend groundwork and current limitations

The face photo stays in app state until the user requests an AI recommendation with a photo or an AI photo preview; those requests send it to the secured Supabase Edge Function, which forwards it to Google Gemini for processing. Do not upload photos without the user’s explicit action. Account creation, saved haircut history, and pending appointment requests are wired to Supabase, but they still need end-to-end device testing. Barber onboarding/availability management, confirmed booking workflows, push notifications, production privacy/deletion flows, and payments are not launch-ready. Payments are intentionally skipped for the initial version; customers can request a booking and pay at the barbershop. Do not market the procedural 3D model or static camera guide as realistic face scanning or automatic AR tracking.

## Planned architecture

- **Mobile:** Expo, React Native, TypeScript
- **3D:** Three.js / React Three Fiber Native, subject to device validation
- **Backend:** Supabase Auth, Postgres, private Storage, row-level security
- **AI services:** server-side orchestration for image analysis, hairstyle previews and structured barber briefs
- **Reconstruction:** evaluate a dedicated multi-view face/head reconstruction pipeline before selecting a provider

## Roadmap

1. Validate the 3D renderer on physical iOS and Android devices.
2. Replace the procedural head with a licensed, high-quality GLB model.
3. Prototype personalized head reconstruction from guided photos.
4. Build a compatible hairstyle asset library and realistic hair rendering.
5. Add Supabase persistence, private asset storage and consent/deletion controls.
6. Add reviewed barber briefs, then booking and business features.

## Privacy principles

Face photos and derived 3D models should be private by default. Obtain explicit consent, limit retention, secure access, and provide deletion controls before real-person scanning is enabled.
