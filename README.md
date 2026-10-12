# Watfa — AI Barber Super App

Watfa is an iOS and Android app concept connecting customers and barbers. The first technical milestone is a rotatable 3D head viewer and a curated hairstyle selector; personalized face reconstruction and AI-generated haircut guidance are planned next.

## Current prototype

- Expo + React Native + TypeScript
- Three.js rendered with React Three Fiber Native
- Procedural demo head with touch rotation
- Customer and Barber modes
- Four demo hairstyle presets
- Draft barber checklist
- Dark, warm-neutral visual system

**Important:** the current head is procedural demo geometry, not a scan of a real person. Hair presets are illustrative and the barber checklist is not AI-generated or validated cutting advice.

## Run locally

Use Node.js LTS and a compatible iOS or Android development environment.

```bash
npm install
npx expo install --check
npx expo start
```

Scan the QR code with Expo Go if the native dependencies are supported by your installed Expo Go version. If the native GL module requires a custom development build, create one using the Expo development-build workflow.

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
