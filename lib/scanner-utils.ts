"use client"

// Utility functions for barcode scanner integration

export interface ScannerDevice {
  id: string
  name: string
  type: "usb" | "websocket" | "camera" | "bluetooth"
  status: "connected" | "disconnected" | "error"
  lastSeen?: Date
}

export interface ScanEvent {
  barcode: string
  timestamp: Date
  deviceId: string
  deviceType: string
  confidence?: number
}

// Mock scanner device discovery
export async function discoverScanners(): Promise<ScannerDevice[]> {
  // In production, this would use WebUSB API, WebSocket discovery, etc.
  return [
    {
      id: "usb-scanner-001",
      name: "Honeywell Voyager 1200g",
      type: "usb",
      status: "disconnected",
    },
    {
      id: "network-scanner-001",
      name: "Network Scanner (192.168.1.100)",
      type: "websocket",
      status: "disconnected",
    },
    {
      id: "camera-scanner-001",
      name: "Built-in Camera",
      type: "camera",
      status: "disconnected",
    },
  ]
}

// Validate barcode format
export function validateBarcode(barcode: string): { valid: boolean; type?: string; error?: string } {
  if (!barcode || typeof barcode !== "string") {
    return { valid: false, error: "Invalid barcode format" }
  }

  const cleaned = barcode.trim()

  // Check common barcode formats
  if (/^\d{12}$/.test(cleaned)) {
    return { valid: true, type: "UPC-A" }
  }
  if (/^\d{13}$/.test(cleaned)) {
    return { valid: true, type: "EAN-13" }
  }
  if (/^\d{8}$/.test(cleaned)) {
    return { valid: true, type: "EAN-8" }
  }
  if (/^[0-9A-Z\-. $/+%]+$/.test(cleaned) && cleaned.length >= 1 && cleaned.length <= 43) {
    return { valid: true, type: "Code 39" }
  }

  return { valid: true, type: "Unknown" } // Accept any format for flexibility
}

// Generate scan sound
export function playscanSound(volume = 0.5): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.2)
  } catch (error) {
    console.warn("Could not play scan sound:", error)
  }
}

// Format barcode for display
export function formatBarcodeDisplay(barcode: string): string {
  if (!barcode) return ""

  // Add spaces for better readability
  if (barcode.length === 13) {
    // EAN-13: 1 234567 890123
    return `${barcode.slice(0, 1)} ${barcode.slice(1, 7)} ${barcode.slice(7)}`
  }
  if (barcode.length === 12) {
    // UPC-A: 123456 789012
    return `${barcode.slice(0, 6)} ${barcode.slice(6)}`
  }

  return barcode
}

// Scanner connection status monitoring
export class ScannerMonitor {
  private devices: Map<string, ScannerDevice> = new Map()
  private listeners: Array<(devices: ScannerDevice[]) => void> = []

  addDevice(device: ScannerDevice): void {
    this.devices.set(device.id, { ...device, lastSeen: new Date() })
    this.notifyListeners()
  }

  updateDeviceStatus(deviceId: string, status: ScannerDevice["status"]): void {
    const device = this.devices.get(deviceId)
    if (device) {
      device.status = status
      device.lastSeen = new Date()
      this.notifyListeners()
    }
  }

  removeDevice(deviceId: string): void {
    this.devices.delete(deviceId)
    this.notifyListeners()
  }

  getDevices(): ScannerDevice[] {
    return Array.from(this.devices.values())
  }

  onDevicesChanged(callback: (devices: ScannerDevice[]) => void): () => void {
    this.listeners.push(callback)
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners(): void {
    const devices = this.getDevices()
    this.listeners.forEach((listener) => listener(devices))
  }
}

export const scannerMonitor = new ScannerMonitor()
