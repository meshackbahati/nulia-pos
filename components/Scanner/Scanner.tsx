'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
// @ts-ignore - use-toast is a valid import
import { useToast } from '@/components/ui/use-toast';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { BarcodeFormat } from '@/lib/barcode';

// Icons
interface IconProps {
  className?: string;
}

const Loader = ({ className = '' }: IconProps) => (
  <svg
    className={`animate-spin h-5 w-5 ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

const VideoOff = ({ className = '' }: IconProps) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.66 5H14a2 2 0 0 1 2 2v7.34l1 1L22 8v8M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l3 3h3"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const Flashlight = ({ className = '' }: IconProps) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 11v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h4l2-3h2l2 3h4a2 2 0 0 1 2 2z"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const FlashlightOff = ({ className = '' }: IconProps) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.16M9 9H5a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h4l2 3h6a2 2 0 0 1 2 2v2.34"/>
    <path d="M11.3 11.3a3 3 0 1 0 4.24 4.24"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const CameraSwitch = ({ className = '' }: IconProps) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h7a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1h-1m-2 2l-3.5-3.5L12 6m-1 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/>
    <path d="m3 16 3-3-3-3"/>
    <path d="M7 13H3"/>
  </svg>
);

const X = ({ className = '' }: IconProps) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const RefreshCw = ({ className = '' }: IconProps) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 2v6h-6"/>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
    <path d="M3 22v-6h6"/>
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
  </svg>
);

interface ScannerProps {
  /**
   * Callback when a barcode is successfully scanned
   * @param code - The scanned barcode value
   * @param format - The detected barcode format
   */
  onScan: (code: string, format: BarcodeFormat) => void;
  
  /**
   * Callback when an error occurs
   */
  onError?: (error: Error) => void;
  
  /**
   * Callback when the scanner is closed
   */
  onClose?: () => void;
  
  /**
   * Whether to show the scanner
   */
  showScanner: boolean;
  
  /**
   * Preferred camera facing mode
   * @default 'environment' (back camera)
   */
  facingMode?: 'user' | 'environment';
  
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
   * List of barcode formats to detect
   * @default ['qr_code', 'ean_13', 'code_128']
   */
  formats?: BarcodeFormat[];
  
  /**
   * Custom class name for the scanner container
   */
  className?: string;
  
  /**
   * Custom class name for the video element
   */
  videoClassName?: string;
  
  /**
   * Custom class name for the scanner overlay
   */
  overlayClassName?: string;
  
  /**
   * Custom class name for the controls container
   */
  controlsClassName?: string;
  
  /**
   * Custom class name for the close button
   */
  closeButtonClassName?: string;
  
  /**
   * Custom class name for the torch button
   */
  torchButtonClassName?: string;
  
  /**
   * Custom class name for the switch camera button
   */
  switchCameraButtonClassName?: string;
  
  /**
   * Custom class name for the instruction text
   */
  instructionTextClassName?: string;
  
  /**
   * Custom instruction text
   */
  instructionText?: string;
  
  /**
   * Show/hide the instruction text
   * @default true
   */
  showInstructionText?: boolean;
  
  /**
   * Show/hide the scanner overlay
   * @default true
   */
  showOverlay?: boolean;
  
  /**
   * Show/hide the scanner controls
   * @default true
   */
  showControls?: boolean;
  
  /**
   * Show/hide the close button
   * @default true
   */
  showCloseButton?: boolean;
  
  /**
   * Show/hide the torch button
   * @default true
   */
  showTorchButton?: boolean;
  
  /**
   * Show/hide the switch camera button
   * @default true
   */
  showSwitchCameraButton?: boolean;
  
  /**
   * Custom render function for the scanner overlay
   */
  renderOverlay?: (props: { isScanning: boolean }) => React.ReactNode;
  
  /**
   * Custom render function for the scanner controls
   */
  renderControls?: (props: {
    isScanning: boolean;
    isTorchOn: boolean;
    hasMultipleCameras: boolean;
    toggleTorch: () => void;
    switchCamera: () => void;
    closeScanner: () => void;
  }) => React.ReactNode;
  
  /**
   * Custom render function for the instruction text
   */
  renderInstructionText?: () => React.ReactNode;
}

export function BarcodeScanner({
  onScan,
  onError,
  onClose,
  showScanner,
  facingMode = 'environment',
  soundEnabled = true,
  vibrateOnScan = true,
  continuous = false,
  scanInterval = 1000,
  enableTorch = true,
  enableCameraSwitching = true,
  formats = ['qr_code', 'ean_13', 'code_128'],
  className = '',
  videoClassName = '',
  overlayClassName = '',
  controlsClassName = '',
  closeButtonClassName = '',
  torchButtonClassName = '',
  switchCameraButtonClassName = '',
  instructionTextClassName = '',
  instructionText = 'Position a barcode inside the frame to scan. The scanner will automatically detect the barcode.',
  showInstructionText = true,
  showOverlay = true,
  showControls = true,
  showCloseButton = true,
  showTorchButton = true,
  showSwitchCameraButton = true,
  renderOverlay,
  renderControls,
  renderInstructionText,
}: ScannerProps) {
  // State for tracking camera initialization and errors
  const [cameraError, setCameraError] = useState<Error | null>(null);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  
  // Initialize toast
  const { toast } = useToast();
  
  // Use the barcode scanner hook
  const {
    videoRef,
    isScanning,
    isInitialized,
    isSupported,
    isTorchOn,
    error: scannerError,
    devices = [],
    currentDeviceId,
    scannedBarcode,
    startScanning,
    stopScanning,
    toggleScanning,
    toggleTorch,
    switchCamera,
    resetScanner,
  } = useBarcodeScanner({
    onScan: (barcode, format) => {
      // Play success sound if enabled
      if (soundEnabled) {
        try {
          const audio = new Audio('/sounds/scan-success.mp3');
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((e: Error) => console.warn('Failed to play scan sound:', e));
          }
        } catch (e) {
          console.warn('Error initializing audio:', e);
        }
      }
      
      // Vibrate if enabled
      if (vibrateOnScan && 'vibrate' in navigator) {
        navigator.vibrate(100).catch(e => console.warn('Vibration failed:', e));
      }
      
      // Call the provided onScan handler
      onScan(barcode, format);
      
      // If not in continuous mode, stop scanning and close
      if (!continuous) {
        stopScanning();
        onClose?.();
      }
    },
    onError: (error) => {
      console.error('Barcode Scanner Error:', error);
      setCameraError(error);
      onError?.(error);
      
      // Show error toast
      toast({
        title: 'Scanner Error',
        description: error.message || 'An error occurred while scanning',
        variant: 'destructive',
      });
    },
    soundEnabled,
    vibrateOnScan,
    facingMode,
    continuous,
    scanInterval,
    enableTorch,
    enableCameraSwitching,
    formats,
  });
  
  // Track if the user has interacted with the page (required for autoplay in some browsers)
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!hasUserInteracted) {
        setHasUserInteracted(true);
        // Remove the event listener after first interaction
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      }
    };
    
    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    
    return () => {
      // Cleanup event listeners
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [hasUserInteracted]);
  
  // Handle close
  const handleClose = useCallback(() => {
    stopScanning();
    setCameraError(null);
    onClose?.();
  }, [onClose, stopScanning]);
  
  // Handle scanner errors
  useEffect(() => {
    if (scannerError) {
      setCameraError(scannerError);
      onError?.(scannerError);
    }
  }, [scannerError, onError]);
  
  // Handle browser compatibility
  useEffect(() => {
    if (showScanner && !isSupported) {
      const error = new Error(
        'Barcode scanning is not supported in your browser. ' +
        'Please use Chrome 83+, Edge 83+, or another modern browser.'
      );
      setCameraError(error);
      onError?.(error);
      
      toast({
        title: 'Browser Not Supported',
        description: error.message,
        variant: 'destructive',
        duration: 10000,
      });
    }
  }, [showScanner, isSupported, onError]);
  
  // Start/stop scanning based on showScanner prop
  useEffect(() => {
    if (!showScanner) {
      stopScanning();
      return;
    }
    
    // Only start scanning if we have user interaction (required for autoplay in some browsers)
    if (isInitialized && hasUserInteracted) {
      const initScanner = async () => {
        setIsCameraInitializing(true);
        try {
          await startScanning();
          setCameraError(null);
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Failed to start camera');
          setCameraError(err);
          onError?.(err);
          
          toast({
            title: 'Camera Error',
            description: err.message || 'Failed to access the camera',
            variant: 'destructive',
          });
        } finally {
          setIsCameraInitializing(false);
        }
      };
      
      initScanner();
    }
    
    return () => {
      stopScanning();
    };
  }, [showScanner, isInitialized, startScanning, stopScanning, hasUserInteracted, onError]);
  
  // Show error if barcode detection is not supported
  useEffect(() => {
    if (showScanner && !isSupported && isInitialized) {
      toast({
        title: 'Barcode Scanner Not Supported',
        description: 'Your browser does not support the Barcode Detection API. Please use Chrome 83+ or Edge 83+ on desktop, or Chrome for Android.',
        variant: 'destructive',
        duration: 10000,
      });
    }
  }, [showScanner, isSupported, isInitialized]);
  
  if (!showScanner) return null;
  
  // Default scanner overlay
  const defaultOverlay = (
    <div className={`absolute inset-0 flex items-center justify-center ${overlayClassName}`}>
      <div className="relative w-64 h-48 border-2 border-primary rounded-lg">
        {/* Scanner line animation */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary animate-pulse" />
        
        {/* Corner indicators */}
        <div className="absolute -top-1 -left-1 h-8 w-8 border-t-2 border-l-2 border-primary" />
        <div className="absolute -top-1 -right-1 h-8 w-8 border-t-2 border-r-2 border-primary" />
        <div className="absolute -bottom-1 -left-1 h-8 w-8 border-b-2 border-l-2 border-primary" />
        <div className="absolute -bottom-1 -right-1 h-8 w-8 border-b-2 border-r-2 border-primary" />
      </div>
    </div>
  );
  
  // Default scanner controls
  const defaultControls = (
    <div className={`absolute bottom-4 left-0 right-0 flex justify-center space-x-4 ${controlsClassName}`}>
      {/* Torch button */}
      {showTorchButton && enableTorch && (
        <Button
          variant="secondary"
          size="icon"
          onClick={toggleTorch}
          className={`rounded-full w-12 h-12 bg-black/50 hover:bg-black/70 backdrop-blur-sm ${torchButtonClassName}`}
          disabled={!isInitialized}
        >
          {isTorchOn ? (
            <FlashlightOff className="h-6 w-6" />
          ) : (
            <Flashlight className="h-6 w-6" />
          )}
          <span className="sr-only">{isTorchOn ? 'Turn off flash' : 'Turn on flash'}</span>
        </Button>
      )}
      
      {/* Switch camera button */}
      {showSwitchCameraButton && enableCameraSwitching && devices.length > 1 && (
        <Button
          variant="secondary"
          size="icon"
          onClick={switchCamera}
          className={`rounded-full w-12 h-12 bg-black/50 hover:bg-black/70 backdrop-blur-sm ${switchCameraButtonClassName}`}
          disabled={!isInitialized}
        >
          <CameraSwitch className="h-6 w-6" />
          <span className="sr-only">Switch camera</span>
        </Button>
      )}
      
      {/* Close button */}
      {showCloseButton && (
        <Button
          variant="secondary"
          size="icon"
          onClick={handleClose}
          className={`rounded-full w-12 h-12 bg-red-600/80 hover:bg-red-700/90 backdrop-blur-sm ${closeButtonClassName}`}
        >
          <Icons.x className="h-6 w-6" />
          <span className="sr-only">Close scanner</span>
        </Button>
      )}
    </div>
  );
  
  // Default instruction text
  const defaultInstructionText = (
    <p className={`mt-4 text-white text-center max-w-md ${instructionTextClassName}`}>
      {instructionText}
    </p>
  );
  
  return (
    <div className={`fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 ${className}`}>
      <div className="relative w-full max-w-2xl aspect-video bg-black rounded-lg overflow-hidden">
        {/* Video element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${videoClassName}`}
        />
        
        {/* Scanner overlay */}
        {showOverlay && (renderOverlay ? renderOverlay({ isScanning }) : defaultOverlay)}
        
        {/* Scanner controls */}
        {showControls && (renderControls ? (
          renderControls({
            isScanning,
            isTorchOn,
            hasMultipleCameras: devices.length > 1,
            toggleTorch,
            switchCamera,
            closeScanner: handleClose,
          })
        ) : (
          defaultControls
        ))}
        
        {/* Loading state */}
      {(isCameraInitializing || (isScanning && !isInitialized)) && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <div className="text-center p-6 bg-black/50 rounded-lg">
            <div className="h-10 w-10 animate-spin text-white mx-auto mb-4">
              <Loader />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {!hasUserInteracted 
                ? 'Click anywhere to enable camera...' 
                : 'Initializing camera...'}
            </h3>
            <p className="text-gray-300 text-sm">
              {!hasUserInteracted 
                ? 'Your browser requires interaction to access the camera.'
                : 'Please wait while we set up the scanner...'}
            </p>
          </div>
        </div>
      )}
      
      {/* Error state */}
      {(cameraError || scannerError) && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 text-red-500 mx-auto mb-4">
              <VideoOff />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {cameraError?.name === 'NotAllowedError' || scannerError?.name === 'NotAllowedError'
                ? 'Camera Access Denied' 
                : cameraError?.name === 'NotFoundError' || scannerError?.name === 'NotFoundError'
                ? 'No Camera Found'
                : 'Scanner Error'}
            </h3>
            <p className="text-gray-300 mb-6">
              {cameraError?.message || scannerError?.message || 'An error occurred while accessing the camera'}
              
              {(cameraError?.name === 'NotAllowedError' || scannerError?.name === 'NotAllowedError') && (
                <span className="block mt-2 text-sm">
                  Please allow camera access in your browser settings and try again.
                </span>
              )}
            </p>
            
            <div className="flex justify-center space-x-3">
              <Button 
                onClick={async () => {
                  try {
                    resetScanner();
                    setCameraError(null);
                    await startScanning();
                  } catch (e) {
                    console.error('Failed to restart scanner:', e);
                    setCameraError(e instanceof Error ? e : new Error('Failed to restart scanner'));
                  }
                }} 
                variant="default"
                className="min-w-[120px]"
              >
                <span className="flex items-center">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </span>
              </Button>
              
              <Button 
                onClick={handleClose} 
                variant="outline"
                className="min-w-[120px]"
              >
                <span className="flex items-center">
                  <X className="h-4 w-4 mr-2" />
                  Close Scanner
                </span>
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-400 cursor-pointer">
                  Technical Details
                </summary>
                <pre className="mt-2 p-3 bg-black/30 rounded text-xs text-gray-300 overflow-auto max-h-40">
                  {JSON.stringify({
                    error: cameraError || scannerError,
                    isSupported,
                    isInitialized,
                    hasUserInteracted,
                    devices: devices?.length || 0,
                  }, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}
      </div>
      
      {/* Instruction text */}
      {showInstructionText && (renderInstructionText ? renderInstructionText() : defaultInstructionText)}
    </div>
  );
}
