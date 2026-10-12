# Watfa — AI Barber Super App

Watfa is an iOS and Android app concept connecting customers and barbers. The first technical milestone is a rotatable 3D head viewer and a curated hairstyle selector; personalized face reconstruction and AI-generated haircut guidance are planned next.

## Current prototype

- Front-camera capture with an in-session photo preview
- Style-finder questionnaire with clearly labelled rule-based suggestions (not AI)
- Initial Supabase SQL schema for profiles, barber services, haircut history, private scan metadata, and appointments

- Expo + React Native + TypeScript
- Three.js rendered with React Three Fiber Native
- Procedural demo head with touch rotation
- Customer and Barber modes
- Four demo hairstyle presets
- Draft barber checklist
- Dark, warm-neutral visual system

**Important:** the current head is procedural demo geometry, not a scan of a real person. Hair presets are illustrative and the barber checklist is not AI-generated or validated cutting advice.

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

The face photo is currently kept only in app state for the current session; Watfa does not upload it. The style finder is rule-based and does not inspect the photo. The **Preview on my photo** action explains that a secure image-generation backend is required; it does not generate an edited image yet. Accounts, persistent history, real booking, and payments are not live. See [`supabase/README.md`](supabase/README.md) and [`supabase/schema.sql`](supabase/schema.sql) for the database foundation. Do not take real bookings or payments until the server-side booking and payment flows are implemented and tested.

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
