import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { playScanSound, playSuccessSound, playErrorSound } from '@/lib/sounds';
import { BarcodeFormat, validateBarcode } from '@/lib/barcode';
import { CameraStream, CameraError, getCameraStream, switchCamera, toggleTorch, getCameraDevices, isBarcodeDetectorSupported, createBarcodeDetector } from '@/lib/camera';

export interface UseBarcodeScannerOptions {
  /**
   * Callback when a barcode is successfully scanned
   */
  onScan?: (barcode: string, format: BarcodeFormat) => void;
  
  /**
   * Callback when an error occurs
   */
  onError?: (error: Error) => void;
  
  /**
   * Enable/disable sound effects
   * @default true
   */
  soundEnabled?: boolean;
  
  /**
   * Enable/disable vibration on scan
   * @default true
   */
  vibrateOnScan?: boolean;
  
  /**
   * Preferred camera facing mode
   * @default 'environment' (back camera)
   */
  facingMode?: 'user' | 'environment';
  
  /**
   * Enable/disable continuous scanning
   * @default false
   */
  continuous?: boolean;
  
  /**
   * Delay between scans in milliseconds (for continuous mode)
   * @default 1000
   */
  scanInterval?: number;
  
  /**
   * Enable/disable torch control
   * @default true
   */
  enableTorch?: boolean;
  
  /**
   * Enable/disable camera switching
   * @default true
   */
  enableCameraSwitching?: boolean;
  
  /**
   * Enable/disable barcode format detection
   * @default true
   */
  detectBarcodeFormat?: boolean;
  
  /**
   * List of barcode formats to detect
   * @default ['qr_code', 'ean_13', 'code_128']
   */
  formats?: BarcodeFormat[];
}

/**
 * Hook for barcode scanning functionality
 */
export function useBarcodeScanner(options: UseBarcodeScannerOptions = {}) {
  const {
    onScan,
    onError,
    soundEnabled = true,
    vibrateOnScan = true,
    facingMode = 'environment',
    continuous = false,
    scanInterval = 1000,
    enableTorch = true,
    enableCameraSwitching = true,
    detectBarcodeFormat = true,
    formats = ['qr_code', 'ean_13', 'code_128']
  } = options;
  
  // State
  const [isScanning, setIsScanning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [devices, setDevices] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState<{ value: string; format: BarcodeFormat } | null>(null);
  
  // Refs
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const isMountedRef = useRef(true);
  
  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopScanning();
    };
  }, []);
  
  // Handle errors
  const handleError = useCallback((error: Error) => {
    console.error('Barcode Scanner Error:', error);
    setError(error);
    
    if (soundEnabled) {
      playErrorSound();
    }
    
    if (onError) {
      onError(error);
    }
  }, [onError, soundEnabled]);

  // Check if the browser supports the Barcode Detection API
  const isBarcodeDetectorSupported = useCallback((): boolean => {
    return 'BarcodeDetector' in window;
  }, []);
  
  // Create a BarcodeDetector instance if supported
  const createBarcodeDetector = useCallback(async (formats: BarcodeFormat[] = ['qr_code', 'ean_13', 'code_128']): Promise<BarcodeDetector | null> => {
    if (!isBarcodeDetectorSupported()) return null;
    
    try {
      // @ts-ignore - BarcodeDetector is not in TypeScript's DOM types yet
      const detector = new BarcodeDetector({ formats });
      
      // Test the detector with a blank image
      const testImage = new ImageData(1, 1);
      try {
        // @ts-ignore
        await detector.detect(testImage);
        return detector;
      } catch (testError) {
        console.error('BarcodeDetector test failed:', testError);
        return null;
      }
    } catch (err) {
      console.error('Failed to create BarcodeDetector:', err);
      return null;
    }
  }, [isBarcodeDetectorSupported]);

  // Initialize barcode detector
  useEffect(() => {
    const init = async () => {
      // Check if browser supports BarcodeDetector API
      const supported = isBarcodeDetectorSupported();
      setIsSupported(supported);
      
      if (!supported) {
        throw new Error('Barcode Detection API is not supported in this browser');
      }
      
      // Create barcode detector
      const detector = await createBarcodeDetector(formats);
      if (!detector) {
        throw new Error('Failed to initialize barcode detector');
      }
      
      detectorRef.current = detector;
      setIsInitialized(true);
    };
    
    init().catch(error => {
      const err = error instanceof Error ? error : new Error('Failed to initialize barcode scanner');
      handleError(err);
    });
    
    return () => {
      if (detectorRef.current) {
        // Cleanup detector if needed
        detectorRef.current = null;
      }
    };
  }, [formats, handleError, isBarcodeDetectorSupported, createBarcodeDetector]);
  
  // Handle successful scan
  const handleScan = useCallback((barcode: string, format: BarcodeFormat) => {
    if (!isMountedRef.current) return;
    
    // Update scanned barcode state
    const scanResult = { value: barcode, format };
    setScannedBarcode(scanResult);
    
    // Play sound if enabled
    if (soundEnabled) {
      playSuccessSound();
    }
    
    // Vibrate if supported and enabled
    if (vibrateOnScan && 'vibrate' in navigator) {
      navigator.vibrate(200);
    }
    
    // Call onScan callback
    if (onScan) {
      onScan(barcode, format);
    }
    
    // If not in continuous mode, stop scanning
    if (!continuous) {
      stopScanning();
    }
  }, [onScan, soundEnabled, vibrateOnScan, continuous]);
  
  // Define startScanning function first
  const startScanning = useCallback(async (): Promise<boolean> => {
    if (!isInitialized || !detectorRef.current) {
      handleError(new Error('Barcode scanner is not initialized'));
      return false;
    }
    
    try {
      // Get video element
      const video = videoRef.current;
      if (!video) {
        throw new Error('Video element is not available');
      }
      
      // Get camera stream
      const stream = await getCameraStream({
        video: { 
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      // Store stream reference
      streamRef.current = stream.stream;
      setCurrentDeviceId(stream.device.deviceId);
      
      // Set video source
      video.srcObject = stream.stream;
      
      // Play video
      await video.play();
      
      // Get available devices
      try {
        const availableDevices = await getCameraDevices();
        setDevices(availableDevices);
      } catch (err) {
        console.warn('Failed to get camera devices:', err);
      }
      
      // Start detection loop
      const detectBarcodes = async () => {
        if (!isMountedRef.current || !video || video.readyState < 2) {
          animationFrameRef.current = requestAnimationFrame(detectBarcodes);
          return;
        }
        
        try {
          // Check if enough time has passed since last scan
          const now = Date.now();
          if (now - lastScanTimeRef.current < scanInterval) {
            animationFrameRef.current = requestAnimationFrame(detectBarcodes);
            return;
          }
          
          // Detect barcodes
          const barcodes = await detectorRef.current?.detect(video);
          
          if (barcodes && barcodes.length > 0) {
            const barcode = barcodes[0];
            const value = barcode.rawValue;
            let format = barcode.format as BarcodeFormat;
            
            // Validate barcode format if enabled
            if (detectBarcodeFormat) {
              if (!validateBarcode(value, format)) {
                console.warn(`Invalid barcode format: ${format} for value: ${value}`);
                animationFrameRef.current = requestAnimationFrame(detectBarcodes);
                return;
              }
            }
            
            // Update last scan time
            lastScanTimeRef.current = now;
            
            // Handle the scanned barcode
            handleScan(value, format);
          }
        } catch (err) {
          console.error('Error detecting barcodes:', err);
        }
        
        // Continue detection loop
        if (isMountedRef.current && isScanning) {
          animationFrameRef.current = requestAnimationFrame(detectBarcodes);
        }
      };
      
      // Start detection
      animationFrameRef.current = requestAnimationFrame(detectBarcodes);
      
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start barcode scanner');
      handleError(error);
      stopScanning();
      return false;
    }
  }, [isInitialized, isScanning, facingMode, scanInterval, detectBarcodeFormat, handleScan, handleError]);
  
  // Define stopScanning function
  const stopScanning = useCallback((): void => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Reset device ID
    setCurrentDeviceId(null);
  }, []);
  
  // Start/stop scanning based on isScanning state
  useEffect(() => {
    if (isScanning) {
      startScanning().catch((error) => {
        console.error('Error starting scanner:', error);
        handleError(new Error('Failed to start scanner'));
      });
    }
    
    return () => {
      if (isScanning) {
        stopScanning();
      }
    };
  }, [isScanning, startScanning, stopScanning, handleError]);
  
  // Toggle torch control
  const toggleTorchControl = useCallback(async () => {
    if (!streamRef.current || !enableTorch) return;
    
    try {
      const success = await toggleTorch(streamRef.current, !isTorchOn);
      if (success) {
        setIsTorchOn(prev => !prev);
      }
    } catch (err) {
      console.error('Failed to toggle torch:', err);
    }
  }, [isTorchOn, enableTorch]);
  
  // Switch camera
  const switchCameraDevice = useCallback(async () => {
    if (!streamRef.current || !enableCameraSwitching || devices.length < 2) return null;
    
    try {
      const currentIndex = devices.findIndex(device => device.deviceId === currentDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      const nextDevice = devices[nextIndex];
      
      const stream = await switchCamera(streamRef.current, nextDevice.deviceId);
      if (!stream) {
        throw new Error('Failed to switch camera');
      }
      
      streamRef.current = stream.stream;
      setCurrentDeviceId(stream.device.deviceId);
      
      // Update video source
      if (videoRef.current) {
        videoRef.current.srcObject = stream.stream;
      }
      
      // Reset torch state
      setIsTorchOn(false);
      
      return stream;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to switch camera');
      handleError(error);
      return null;
    }
  }, [currentDeviceId, devices, enableCameraSwitching, handleError]);
  
  // Start/stop scanning
  const toggleScanning = useCallback(() => {
    setIsScanning(prev => !prev);
  }, []);
  
  // Reset scanner
  const resetScanner = useCallback(() => {
    setScannedBarcode(null);
    setError(null);
  }, []);
  
  // Return the scanner API
  const scannerApi = useMemo(() => ({
    // Refs
    videoRef,
    
    // State
    isScanning,
    isInitialized,
    isSupported,
    isTorchOn,
    error,
    devices,
    currentDeviceId,
    scannedBarcode,
    
    // Actions
    startScanning: () => setIsScanning(true),
    stopScanning: () => setIsScanning(false),
    toggleScanning: () => setIsScanning(prev => !prev),
    toggleTorch: toggleTorchControl,
    switchCamera: switchCameraDevice,
    resetScanner,
    
    // Utils
    scanBarcode: async (image: ImageBitmapSource) => {
      if (!detectorRef.current) return null;
      try {
        const barcodes = await detectorRef.current.detect(image);
        return barcodes.length > 0 ? barcodes[0] : null;
      } catch (error) {
        console.error('Error scanning barcode:', error);
        return null;
      }
    }
  }), [
    videoRef,
    isScanning,
    isInitialized,
    isSupported,
    isTorchOn,
    error,
    devices,
    currentDeviceId,
    scannedBarcode,
    toggleTorchControl,
    switchCameraDevice,
    resetScanner
  ]);
  
  return scannerApi;
}

export type UseBarcodeScannerReturn = ReturnType<typeof useBarcodeScanner>;
