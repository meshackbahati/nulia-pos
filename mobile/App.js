import * as React from 'react';
import { StyleSheet, BackHandler, Platform, Alert, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Camera } from 'expo-camera';
import * as Device from 'expo-device';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const webViewRef = React.useRef(null);
  const [appIsReady, setAppIsReady] = React.useState(false);

  // Handle Android hardware back button
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
        if (webViewRef.current) {
          webViewRef.current.goBack();
          return true; // Prevent default behavior (exit app)
        }
        return false;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }
  }, []);

  // Prepare app resources (like camera permissions)
  React.useEffect(() => {
    async function prepare() {
      try {
        // Request Camera Permissions early
        const { status } = await Camera.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Camera permission not granted');
        }
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = React.useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately! If we want a more "Instagram-like" feel
      // where it hides ONLY after the webview loads, we should move this to the WebView's onLoad.
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  // Inject Device Info into WebView
  const injectedJavaScript = `
    (function() {
      window.RetailProDevice = {
        brand: "${Device.brand}",
        modelName: "${Device.modelName}",
        osName: "${Device.osName}",
        osVersion: "${Device.osVersion}",
        isDevice: ${Device.isDevice},
        platform: "${Platform.OS}",
        appVersion: "1.0.0"
      };
      
      // Notify mobile app when ready
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'READY'}));
    })();
    true;
  `;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']} onLayout={onLayoutRootView}>
      <StatusBar style="light" backgroundColor="#111827" />
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://v0-supermarket-management-system-eight-swart.vercel.app' }}
        style={styles.webview}
        // Enable file selection for uploads
        allowFileAccess={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        // Persistence - Crucial for "next time it asks for login" issue
        domStorageEnabled={true}
        javaScriptEnabled={true}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        // Force dark mode background
        backgroundColor="#111827"
        startInLoadingState={true}
        injectedJavaScript={injectedJavaScript}
        onLoadEnd={async () => {
          // Hide splash screen only when WebView finishes loading
          await SplashScreen.hideAsync();
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'alert') {
              Alert.alert('RetailPro POS', data.message);
            }
          } catch (e) {
            console.log('WebView message:', event.nativeEvent.data);
          }
        }}
        originWhitelist={['*']}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827', // Obsidian dark theme
  },
  webview: {
    flex: 1,
    backgroundColor: '#111827',
  },
});
