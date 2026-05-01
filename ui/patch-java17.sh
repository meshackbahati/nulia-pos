#!/bin/bash
# Patch Capacitor plugins and Android app to use Java 17 instead of Java 21
find node_modules/@capacitor* -type f -name "build.gradle" -exec sed -i 's/VERSION_21/VERSION_17/g' {} + 2>/dev/null
find node_modules/@capacitor* -type f -name "build.gradle" -exec sed -i 's/jvmToolchain(21)/jvmToolchain(17)/g' {} + 2>/dev/null
if [ -f "android/app/capacitor.build.gradle" ]; then
  sed -i 's/VERSION_21/VERSION_17/g' android/app/capacitor.build.gradle
fi
echo "Patched Capacitor files to Java 17."
