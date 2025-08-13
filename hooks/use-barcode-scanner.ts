"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface ScannerSettings {
  soundEnabled: boolean
  autoSubmit: boolean
  scanDelay: number
  usbEnabled: boolean
  websocketEnabled: boolean
  cameraEnabled: boolean
}

interface UseBarcodeScanner {
  onScan: (barcode: string) => void
  settings: ScannerSettings
}

export function useBarcodeScanner({ onScan, settings }: UseBarcodeScanner) {
  const [isConnected, setIsConnected] = useState(false)
  const [scannerType, setScannerType] = useState<string | null>(null)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState({
    websocket: "disconnected" as "connected" | "disconnected" | "connecting",
    usb: "disconnected" as "connected" | "disconnected" | "connecting",
    camera: "disconnected" as "connected" | "disconnected" | "connecting",
  })
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!settings.websocketEnabled) return

    setConnectionStatus((prev) => ({ ...prev, websocket: "connecting" }))
    setError(null)

    try {
      // Use a mock WebSocket server for demo purposes
      // In production, this would connect to your IoT scanner's WebSocket endpoint
      const ws = new WebSocket("wss://echo.websocket.org/")

      ws.onopen = () => {
        setConnectionStatus((prev) => ({ ...prev, websocket: "connected" }))
        setIsConnected(true)
        setScannerType("Network")
        setError(null)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "barcode" && data.code) {
            handleScan(data.code, "websocket")
          }
        } catch {
          // Treat raw message as barcode for demo
          if (event.data && typeof event.data === "string") {
            handleScan(event.data, "websocket")
          }
        }
      }

      ws.onerror = () => {
        setError("WebSocket connection failed")
        setConnectionStatus((prev) => ({ ...prev, websocket: "disconnected" }))
      }

      ws.onclose = () => {
        setConnectionStatus((prev) => ({ ...prev, websocket: "disconnected" }))
        if (scannerType === "Network") {
          setIsConnected(false)
          setScannerType(null)
        }
      }

      wsRef.current = ws
    } catch (err) {
      setError("Failed to connect to scanner")
      setConnectionStatus((prev) => ({ ...prev, websocket: "disconnected" }))
    }
  }, [settings.websocketEnabled, scannerType])

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setConnectionStatus((prev) => ({ ...prev, websocket: "disconnected" }))
    if (scannerType === "Network") {
      setIsConnected(false)
      setScannerType(null)
    }
  }, [scannerType])

  // Camera scanning
  const startCameraScanning = useCallback(async () => {
    if (!settings.cameraEnabled) return

    try {
      setConnectionStatus((prev) => ({ ...prev, camera: "connecting" }))
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      const video = document.getElementById("camera-preview") as HTMLVideoElement
      if (video) {
        video.srcObject = stream
        videoRef.current = video
        streamRef.current = stream
        setIsCameraActive(true)
        setConnectionStatus((prev) => ({ ...prev, camera: "connected" }))
        setIsConnected(true)
        setScannerType("Camera")

        // Start barcode detection (simplified for demo)
        // In production, you would use a library like QuaggaJS or ZXing
        startBarcodeDetection()
      }
    } catch (err) {
      setError("Camera access denied or not available")
      setConnectionStatus((prev) => ({ ...prev, camera: "disconnected" }))
    }
  }, [settings.cameraEnabled])

  const stopCameraScanning = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current = null
    }
    setIsCameraActive(false)
    setConnectionStatus((prev) => ({ ...prev, camera: "disconnected" }))
    if (scannerType === "Camera") {
      setIsConnected(false)
      setScannerType(null)
    }
  }, [scannerType])

  // Simplified barcode detection for demo
  const startBarcodeDetection = useCallback(() => {
    // This is a mock implementation
    // In production, you would use a proper barcode detection library
    const detectBarcode = () => {
      // Simulate random barcode detection for demo
      if (Math.random() < 0.1) {
        // 10% chance of detecting a barcode
        const mockBarcodes = ["1234567890123", "2345678901234", "3456789012345", "4567890123456"]
        const randomBarcode = mockBarcodes[Math.floor(Math.random() * mockBarcodes.length)]
        handleScan(randomBarcode, "camera")
      }
    }

    const interval = setInterval(detectBarcode, 2000) // Check every 2 seconds
    return () => clearInterval(interval)
  }, [])

  // Handle scanned barcode
  const handleScan = useCallback(
    (barcode: string, source: string) => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
      }

      scanTimeoutRef.current = setTimeout(() => {
        setLastScannedCode(barcode)
        onScan(barcode)

        if (settings.soundEnabled) {
          // Play scan sound
          const audio = new Audio(
            "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
          )
          audio.play().catch(() => {}) // Ignore audio errors
        }
      }, settings.scanDelay)
    },
    [onScan, settings.soundEnabled, settings.scanDelay],
  )

  // USB scanner detection (simplified)
  useEffect(() => {
    if (!settings.usbEnabled) return

    const handleKeyPress = (event: KeyboardEvent) => {
      // Detect USB scanner input (typically sends Enter after barcode)
      if (event.key === "Enter" && event.target === document.body) {
        // This is a simplified implementation
        // In production, you would need more sophisticated USB scanner detection
        setConnectionStatus((prev) => ({ ...prev, usb: "connected" }))
        setIsConnected(true)
        setScannerType("USB")
      }
    }

    document.addEventListener("keypress", handleKeyPress)
    return () => document.removeEventListener("keypress", handleKeyPress)
  }, [settings.usbEnabled])

  // Cleanup
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
      }
    }
  }, [])

  return {
    isConnected,
    scannerType,
    lastScannedCode,
    connectionStatus,
    connectWebSocket,
    disconnectWebSocket,
    startCameraScanning,
    stopCameraScanning,
    isCameraActive,
    error,
  }
}
