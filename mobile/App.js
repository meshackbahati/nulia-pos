import * as React from 'react';
import { StyleSheet, BackHandler, Platform, Alert, View, Modal, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const webViewRef = React.useRef(null);
  const [appIsReady, setAppIsReady] = React.useState(false);
  const [scannerVisible, setScannerVisible] = React.useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Handle Android hardware back button
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
        if (scannerVisible) {
          setScannerVisible(false);
          return true;
        }
        if (webViewRef.current) {
          webViewRef.current.goBack();
          return true; // Prevent default behavior (exit app)
        }
        return false;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }
  }, [scannerVisible]);

  // Prepare app resources
  React.useEffect(() => {
    async function prepare() {
      try {
        // Just checking state
        setAppIsReady(true);
      } catch (e) {
        console.warn(e);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = React.useCallback(async () => {
    if (appIsReady) {
      // Logic if needed on layout
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  const handleBarCodeScanned = ({ type, data }) => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Vibrate or beep could be added here if needed

    setScannerVisible(false);
    // Send the result back to the webview
    const script = `
      if (window.onNativeScan) {
        window.onNativeScan("${data}");
      }
      // Trigger a custom event for easier integration
      window.dispatchEvent(new CustomEvent('nativeBarcodeScanned', { detail: { data: "${data}" } }));
    `;
    webViewRef.current.injectJavaScript(script);

    // Reset processing state after a delay
    setTimeout(() => setIsProcessing(false), 1000);
  };

  // Inject Device Info and Scanner Trigger into WebView
  const injectedJavaScript = `
    (function() {
      window.RetailProDevice = {
        brand: "${Device.brand}",
        modelName: "${Device.modelName}",
        osName: "${Device.osName}",
        osVersion: "${Device.osVersion}",
        isDevice: ${Device.isDevice},
        platform: "${Platform.OS}",
        appVersion: "1.2.0",
        hasNativeScanner: true
      };
      
      // Native scan trigger
      window.startNativeScan = function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'SCAN'}));
      };

      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'READY'}));
    })();
    true;
  `;

  const triggerScan = async () => {
    if (!permission) {
      const { status } = await requestPermission();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to scan barcodes.');
        return;
      }
    } else if (!permission.granted) {
      const { status } = await requestPermission();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to scan barcodes.');
        return;
      }
    }
    setIsProcessing(false); // Reset before opening
    setScannerVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']} onLayout={onLayoutRootView}>
      <StatusBar style="light" backgroundColor="#111827" />
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://v0-supermarket-management-system-eight-swart.vercel.app' }}
        style={styles.webview}
        allowFileAccess={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        backgroundColor="#111827"
        startInLoadingState={true}
        injectedJavaScript={injectedJavaScript}
        scalesPageToFit={false}
        useWideViewPort={true}
        overScrollMode="never"
        onLoadEnd={async () => {
          await SplashScreen.hideAsync();
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'alert') {
              Alert.alert('RetailPro POS', data.message);
            } else if (data.type === 'SCAN') {
              triggerScan();
            }
          } catch (e) {
            console.log('WebView message:', event.nativeEvent.data);
          }
        }}
        originWhitelist={['*']}
      />

      <Modal
        animationType="fade"
        transparent={false}
        visible={scannerVisible}
        onRequestClose={() => setScannerVisible(false)}
      >
        <View style={styles.scannerContainer}>
          <CameraView
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'],
            }}
            style={StyleSheet.absoluteFillObject}
            onMountError={(error) => {
              Alert.alert('Camera Error', 'Could not start camera: ' + error.message);
              setScannerVisible(false);
            }}
          />
          <View style={styles.overlay}>
            <View style={styles.unfocusedContainer}></View>
            <View style={styles.middleContainer}>
              <View style={styles.unfocusedContainer}></View>
              <View style={styles.focusedContainer}>
                <View style={styles.cornerTopLeft}></View>
                <View style={styles.cornerTopRight}></View>
                <View style={styles.scanLine} />
                <View style={styles.cornerBottomLeft}></View>
                <View style={styles.cornerBottomRight}></View>
              </View>
              <View style={styles.unfocusedContainer}></View>
            </View>
            <View style={styles.unfocusedContainer}>
              <Text style={styles.instructionText}>Align barcode inside the box</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setScannerVisible(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  webview: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  cancelButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 10,
  },
  middleContainer: {
    flexDirection: 'row',
    height: 180, // Narrower height for barcode
  },
  focusedContainer: {
    width: 280, // Wider for barcode
    position: 'relative',
  },
  scanLine: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: '50%',
    height: 2,
    backgroundColor: '#ef4444', // Red line
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#3b82f6',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#3b82f6',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#3b82f6',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#3b82f6',
  }
});
