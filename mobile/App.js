import * as React from 'react';
import { StyleSheet, BackHandler, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const webViewRef = React.useRef(null);

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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" backgroundColor="#111827" />
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://v0-supermarket-management-system-eight-swart.vercel.app' }}
        style={styles.webview}
        // Enable file selection for uploads if needed
        allowFileAccess={true}
        allowsInlineMediaPlayback={true}
        // Force dark mode background to match splash/theme
        backgroundColor="#111827"
        startInLoadingState={true}
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
