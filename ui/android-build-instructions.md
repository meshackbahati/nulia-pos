# RetailPro: Android CLI Build (No Android Studio)

If you don't have Android Studio installed, you can build the APK using the command line.

## Prerequisites
1.  **Android SDK:** You must have the Android SDK tools installed and the `ANDROID_HOME` environment variable set.
2.  **JDK 17+:** Required for modern Gradle builds.

## Steps to Build APK

### 1. Build & Sync Web Assets
```bash
cd ui
npm run build
npx cap sync android
```

### 2. Generate Debug APK (For Testing)
```bash
cd android
./gradlew assembleDebug
```
**Output Location:** `ui/android/app/build/outputs/apk/debug/app-debug.apk`

### 3. Generate Release APK (For Production)
```bash
cd android
./gradlew assembleRelease
```
**Output Location:** `ui/android/app/build/outputs/apk/release/app-release-unsigned.apk`

*Note: Production APKs must be signed using `apksigner` before they can be installed on most devices.*

## Recommendation: Use GitHub Actions
If you don't want to set up the Android SDK locally, the best way is to use **GitHub Actions**. I can provide a `.github/workflows/android-build.yml` file that will automatically build the APK every time you push code.

**Would you like me to create the GitHub Action workflow for you?**
