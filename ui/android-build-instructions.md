# RetailPro: Android CLI Build (No Android Studio)

If you don't have Android Studio installed, you can build the APK using the command line.

## Prerequisites
1.  **Android SDK:** You must have the Android SDK tools installed and the `ANDROID_HOME` environment variable set.
2.  **JDK 17:** Required for modern Gradle builds, but since Capacitor plugins default to Java 21, a patch is automatically applied when syncing to ensure compatibility with Java 17.

## Local setup
Before building, make sure `local.properties` contains your local SDK path:
```bash
echo "sdk.dir=/home/$USER/Android/Sdk" > android/local.properties
```

## Steps to Build APK

### 1. Build & Sync Web Assets
```bash
cd ui
npm run cap:sync
```
*(Note: `npm run cap:sync` will automatically run a patch script to downgrade Java 21 dependencies to Java 17).*

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

### 4. Sign the Release APK
To prepare the generated unsigned APK for installation on physical devices or publication, you can sign it using `uber-apk-signer` (installed via `yay`). This tool aligns and signs the APK.

Run the following command from the root of the project:
```bash
uber-apk-signer -a ui/android/app/build/outputs/apk/release/app-release-unsigned.apk --overwrite
```
*(Note: Using `--overwrite` will directly replace the unsigned APK with the aligned and signed version. Omit `--overwrite` to generate a new file named `*-aligned-debugSigned.apk` in the same directory.)*

## Recommendation: Use GitHub Actions
If you don't want to set up the Android SDK locally, the best way is to use **GitHub Actions**. I can provide a `.github/workflows/android-build.yml` file that will automatically build the APK every time you push code.

