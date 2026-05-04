# RetailPro: Multi-Platform Build Guide

This document provides technical instructions for generating production-ready artifacts for Web, Android, and Desktop (Windows/Linux).

## 1. Prerequisites
Ensure your environment has the following installed:
*   **Node.js**: v18.0.0 or higher.
*   **Java JDK**: Version 17 (Required for Android build compatibility).
*   **Android SDK**: Command-line tools or Android Studio.
*   **uber-apk-signer**: Installed globally or as a JAR (for signing).

## 2. Shared Frontend Build
All platforms depend on the same React 19 / Vite frontend.
```bash
cd ui
npm install
npm run build
```

---

## 3. Android Application (Capacitor)
RetailPro uses a specialized pipeline to ensure Java 17 compatibility and native signing.

### Step 1: Sync Assets
```bash
npx cap sync android
```

### Step 2: Patch Environment (Optional)
If your system default Java is newer than 17, use the internal patch script:
```bash
bash patch-java17.sh
```

### Step 3: Compile APK
```bash
cd android
JAVA_HOME=/path/to/java-17 ./gradlew assembleRelease
```

### Step 4: Sign and Align
Use `uber-apk-signer` to generate a production-ready package:
```bash
uber-apk-signer --apks app/build/outputs/apk/release/app-release-unsigned.apk --out ../../retailpro.apk
```

---

## 4. Desktop Applications (Electron)
The Electron build generates native installers for Windows (.exe) and Arch Linux (.pkg.tar.zst).

### Build All Desktop Platforms
```bash
cd ui
npm run electron:build
```

### Build Specific Platform
```bash
# Windows Only
npx electron-builder --win

# Linux Only
npx electron-builder --linux
```

---

## 5. Web PWA
To deploy the web version, simply build the frontend and serve the `dist` folder.
```bash
cd ui
npm run build
# The 'dist' directory is now ready for deployment (e.g., Vercel, Netlify, or S3).
```

---

## 6. Build Optimization
> [!TIP]
> **Memory Shortages**: If building on low-resource machines, run the Android build and Electron build **sequentially**, never in parallel, as both processes are memory-intensive.

> [!IMPORTANT]
> **Version Control**: Always bump the `version` in `ui/package.json` and the `versionCode`/`versionName` in `ui/android/app/build.gradle` before generating new production artifacts.
