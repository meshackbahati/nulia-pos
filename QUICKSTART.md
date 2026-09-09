# Quickstart Guide: Nulia Deployment

This guide covers the setup and build process for the Nulia ecosystem.

## 1. Prerequisites
*   Node.js (v18+)
*   PostgreSQL
*   Standard Build Tools (for Electron)

## 2. Backend Setup (Next.js — single source)
```bash
cd server
npm install
# Create .env.local from .env.example (***REMOVED***, ***REMOVED***, BREVO_*, etc)
npm run db:migrate
npm run dev   # http://localhost:3000
# Production (Vercel): vercel --prod  |  or Docker: docker compose up --build
```

## 3. Terminal (UI) Setup & Build
The UI folder contains the core terminal logic for Web, Mobile, and Desktop.

```bash
cd ui
npm install
```

### Build for Web (PWA)
```bash
npm run build
# Deploy 'dist' folder to your web server (Netlify/Vercel/S3)
```

### Build for Desktop (Windows/Linux)
No special tools required besides standard Node.js.
```bash
# For development
npm run electron:dev

# For production packages (setup.exe / AppImage / Pacman)
npm run electron:build
```

### Build for Android (CLI - No Android Studio)
To build the Android app without Android Studio, you can use the bundled Gradle wrapper directly if the Android SDK is installed.

```bash
cd ui
npm run build
npx cap sync android
cd android
./gradlew assembleDebug # For testing
./gradlew assembleRelease # For production
```
The APK will be generated in `ui/android/app/build/outputs/apk/`.

## 4. Key Deployment URLs
*   **Local API:** `http://localhost:3000/api`
*   **Production:** `https://your-nulia.vercel.app/api` - set `VITE_API_URL` and `DATABASE_URL` in Vercel env

## 5. Hardware Configuration
*   **Thermal Printer (Desktop):** Ensure your printer name includes the word "Thermal" or set it in `localStorage.setItem('defaultPrinter', 'Your_Printer_Name')`.
*   **Scanner:** HID scanners work globally. No configuration needed.
*   **Mobile Scanning:** Capacitor MLKit is automatically utilized on native devices.
