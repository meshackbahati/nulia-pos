/**
 * Camera utility functions for accessing and managing device cameras
 */

import { playErrorSound } from '@/lib/sounds';

/**
 * Camera device information
 */
export interface CameraDevice {
  deviceId: string;
  label: string;
  facing: 'user' | 'environment' | 'unknown';
  groupId: string;
}

/**
 * Camera stream and device information
 */
export interface CameraStream {
  stream: MediaStream;
  device: CameraDevice;
  stop: () => void;
}

/**
 * Error types for camera operations
 */
export enum CameraErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_FOUND = 'NOT_FOUND',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  NOT_ALLOWED = 'NOT_ALLOWED',
  UNKNOWN = 'UNKNOWN',
  INVALID_CONSTRAINTS = 'INVALID_CONSTRAINTS',
  OVERCONSTRAINED = 'OVERCONSTRAINED',
  NOT_READABLE = 'NOT_READABLE'
}

/**
 * Custom error class for camera-related errors
 */
export class CameraError extends Error {
  type: CameraErrorType;
  
  constructor(message: string, type: CameraErrorType = CameraErrorType.UNKNOWN) {
    super(message);
    this.name = 'CameraError';
    this.type = type;
    
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CameraError);
    }
  }
}

/**
 * Check if the browser supports the MediaDevices API
 */
export function isMediaDevicesSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices);
}

/**
 * Request camera permission and get available video devices
 */
export async function getCameraDevices(): Promise<CameraDevice[]> {
  try {
    // First, get user media to ensure we have permission
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    
    // Stop all tracks in the stream
    stream.getTracks().forEach(track => track.stop());
    
    // Now enumerate devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    return devices
      .filter(device => device.kind === 'videoinput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
        facing: getFacingMode(device),
        groupId: device.groupId
      }));
  } catch (error) {
    handleCameraError(error);
    throw error;
  }
}

/**
 * Get camera stream with the specified constraints
 */
export async function getCameraStream(
  constraints: MediaStreamConstraints = { video: { facingMode: 'environment' } }
): Promise<CameraStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const videoTracks = stream.getVideoTracks();
    
    if (videoTracks.length === 0) {
      throw new CameraError('No video tracks found', CameraErrorType.NOT_FOUND);
    }
    
    const track = videoTracks[0];
    const device = await getDeviceInfo(track);
    
    // Setup cleanup function
    const stop = () => {
      stream.getTracks().forEach(track => track.stop());
    };
    
    // Auto-stop if the track ends
    track.addEventListener('ended', stop);
    
    return { stream, device, stop };
  } catch (error) {
    handleCameraError(error);
    throw error;
  }
}

/**
 * Switch camera to the specified device
 */
export async function switchCamera(
  currentStream: MediaStream | null,
  deviceId: string
): Promise<CameraStream> {
  try {
    // Stop current stream if it exists
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
    }
    
    // Get new stream with the specified device
    const constraints: MediaStreamConstraints = {
      video: { 
        deviceId: { exact: deviceId },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };
    
    return getCameraStream(constraints);
  } catch (error) {
    handleCameraError(error);
    throw error;
  }
}

/**
 * Toggle camera torch (flash) if supported
 */
export function toggleTorch(stream: MediaStream, enabled: boolean): Promise<boolean> {
  const videoTrack = stream.getVideoTracks()[0];
  
  if (!videoTrack) {
    return Promise.resolve(false);
  }
  
  // Check if torch is supported
  if (typeof (videoTrack as any).getCapabilities !== 'function') {
    return Promise.resolve(false);
  }
  
  const capabilities = (videoTrack as any).getCapabilities();
  
  if (!capabilities.torch) {
    return Promise.resolve(false);
  }
  
  // Try to apply torch settings
  return videoTrack.applyConstraints({
    advanced: [{ torch: enabled }] as any
  })
    .then(() => true)
    .catch(() => false);
}

/**
 * Get device information from a media stream track
 */
async function getDeviceInfo(track: MediaStreamTrack): Promise<CameraDevice> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const device = devices.find(d => d.deviceId === track.getSettings().deviceId);
  
  if (!device) {
    throw new CameraError('Device not found', CameraErrorType.NOT_FOUND);
  }
  
  return {
    deviceId: device.deviceId,
    label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
    facing: getFacingMode(device, track.getSettings()),
    groupId: device.groupId
  };
}

/**
 * Determine the facing mode of a media device
 */
function getFacingMode(
  device: MediaDeviceInfo,
  settings?: MediaTrackSettings
): 'user' | 'environment' | 'unknown' {
  // First try to get from settings (more reliable)
  if (settings?.facingMode) {
    return settings.facingMode as 'user' | 'environment';
  }
  
  // Fallback to device label
  const label = device.label.toLowerCase();
  
  if (label.includes('back') || label.includes('rear')) {
    return 'environment';
  }
  
  if (label.includes('front')) {
    return 'user';
  }
  
  return 'unknown';
}

/**
 * Handle camera errors and provide user-friendly messages
 */
function handleCameraError(error: unknown): void {
  // Play error sound
  playErrorSound();
  
  if (!(error instanceof Error)) {
    console.error('Unknown camera error:', error);
    return;
  }
  
  let errorType = CameraErrorType.UNKNOWN;
  let message = error.message;
  
  // Handle different error types
  if (error.name === 'NotAllowedError') {
    errorType = CameraErrorType.PERMISSION_DENIED;
    message = 'Camera access was denied. Please allow camera access to use this feature.';
  } else if (error.name === 'NotFoundError') {
    errorType = CameraErrorType.NOT_FOUND;
    message = 'No camera found. Please connect a camera and try again.';
  } else if (error.name === 'NotSupportedError') {
    errorType = CameraErrorType.NOT_SUPPORTED;
    message = 'Camera is not supported on this device.';
  } else if (error.name === 'NotReadableError') {
    errorType = CameraErrorType.NOT_READABLE;
    message = 'Camera is already in use by another application.';
  } else if (error.name === 'OverconstrainedError') {
    errorType = CameraErrorType.OVERCONSTRAINED;
    message = 'Camera constraints could not be satisfied.';
  } else if (error.name === 'TypeError') {
    errorType = CameraErrorType.INVALID_CONSTRAINTS;
    message = 'Invalid camera constraints provided.';
  }
  
  console.error(`Camera Error (${errorType}):`, message);
  
  // You could also dispatch a custom event or use a state management solution
  // to show the error message in the UI
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('camera:error', {
      detail: { type: errorType, message }
    }));
  }
}

/**
 * Check if the browser supports the Barcode Detection API
 */
export function isBarcodeDetectorSupported(): boolean {
  return 'BarcodeDetector' in window;
}

/**
 * Create a BarcodeDetector instance if supported
 */
export async function createBarcodeDetector(
  formats: string[] = ['qr_code', 'ean_13', 'code_128']
): Promise<BarcodeDetector | null> {
  if (!isBarcodeDetectorSupported()) {
    return null;
  }
  
  try {
    // @ts-ignore - BarcodeDetector is not in TypeScript's DOM types yet
    const detector = new BarcodeDetector({ formats });
    
    // Test if the detector is actually supported
    try {
      // This is a simple test to see if the detector works
      await detector.detect(new ImageData(1, 1));
      return detector;
    } catch (e) {
      console.warn('BarcodeDetector is not fully supported:', e);
      return null;
    }
  } catch (error) {
    console.error('Failed to create BarcodeDetector:', error);
    return null;
  }
}

/**
 * Detect barcodes in a video element
 */
export async function detectBarcodes(
  video: HTMLVideoElement,
  detector: BarcodeDetector
): Promise<DetectedBarcode[]> {
  try {
    // @ts-ignore - BarcodeDetector is not in TypeScript's DOM types yet
    return await detector.detect(video);
  } catch (error) {
    console.error('Barcode detection failed:', error);
    return [];
  }
}
