"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Scan, Wifi, WifiOff, Camera, Usb, Settings, CheckCircle, AlertCircle, Volume2, VolumeX } from "lucide-react"
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner"

interface BarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void
  autoFocus?: boolean
}

export default function BarcodeScanner({ onBarcodeScanned, autoFocus = true }: BarcodeScannerProps) {
  const [manualInput, setManualInput] = useState("")
  const [scannerSettings, setScannerSettings] = useState({
    soundEnabled: true,
    autoSubmit: true,
    scanDelay: 100,
    usbEnabled: true,
    websocketEnabled: true,
    cameraEnabled: true,
  })

  const {
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
  } = useBarcodeScanner({
    onScan: onBarcodeScanned,
    settings: scannerSettings,
  })

  const manualInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && manualInputRef.current) {
      manualInputRef.current.focus()
    }
  }, [autoFocus])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualInput.trim()) {
      onBarcodeScanned(manualInput.trim())
      setManualInput("")
      if (scannerSettings.soundEnabled) {
        // Play scan sound
        const audio = new Audio("/scan-beep.mp3")
        audio.play().catch(() => {}) // Ignore audio errors
      }
    }
  }

  const getStatusIcon = () => {
    if (isConnected) {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    }
    if (error) {
      return <AlertCircle className="h-4 w-4 text-red-600" />
    }
    return <WifiOff className="h-4 w-4 text-gray-400" />
  }

  const getStatusText = () => {
    if (isConnected && scannerType) {
      return `Connected (${scannerType})`
    }
    if (error) {
      return "Connection Error"
    }
    return "Disconnected"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Barcode Scanner
            </CardTitle>
            <CardDescription>IoT scanner integration with multiple input methods</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge variant={isConnected ? "default" : "secondary"}>{getStatusText()}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="scan" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scan">Scan</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="space-y-4">
            {/* Connection Status */}
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {lastScannedCode && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Last scanned: <code className="font-mono">{lastScannedCode}</code>
                </AlertDescription>
              </Alert>
            )}

            {/* Manual Input */}
            <div className="space-y-2">
              <Label htmlFor="manual-barcode">Manual Barcode Entry</Label>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <Input
                  id="manual-barcode"
                  ref={manualInputRef}
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Scan or type barcode..."
                  className="flex-1 font-mono"
                />
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  Add
                </Button>
              </form>
            </div>

            {/* Camera Scanner */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Camera Scanner</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isCameraActive ? stopCameraScanning : startCameraScanning}
                  disabled={!scannerSettings.cameraEnabled}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {isCameraActive ? "Stop Camera" : "Start Camera"}
                </Button>
              </div>
              {isCameraActive && (
                <div className="relative">
                  <video id="camera-preview" className="w-full h-48 bg-black rounded-lg" autoPlay playsInline muted />
                  <div className="absolute inset-0 border-2 border-red-500 rounded-lg pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-2 border-t-2 border-red-500" />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <div className="space-y-4">
              {/* WebSocket Scanner */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Wifi className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Network Scanner</p>
                    <p className="text-sm text-gray-600">WebSocket connection</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={connectionStatus.websocket === "connected" ? "default" : "secondary"}>
                    {connectionStatus.websocket}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={connectionStatus.websocket === "connected" ? disconnectWebSocket : connectWebSocket}
                    disabled={!scannerSettings.websocketEnabled}
                  >
                    {connectionStatus.websocket === "connected" ? "Disconnect" : "Connect"}
                  </Button>
                </div>
              </div>

              {/* USB Scanner */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Usb className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">USB Scanner</p>
                    <p className="text-sm text-gray-600">Direct USB connection</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={connectionStatus.usb === "connected" ? "default" : "secondary"}>
                    {connectionStatus.usb}
                  </Badge>
                  <Button variant="outline" size="sm" disabled>
                    Auto-detect
                  </Button>
                </div>
              </div>

              {/* Camera Scanner */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Camera className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium">Camera Scanner</p>
                    <p className="text-sm text-gray-600">Built-in camera scanning</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isCameraActive ? "default" : "secondary"}>
                    {isCameraActive ? "active" : "inactive"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={isCameraActive ? stopCameraScanning : startCameraScanning}
                    disabled={!scannerSettings.cameraEnabled}
                  >
                    {isCameraActive ? "Stop" : "Start"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-6">
              {/* Audio Settings */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  {scannerSettings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  Audio Settings
                </h4>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sound-enabled">Scan Sound</Label>
                  <Switch
                    id="sound-enabled"
                    checked={scannerSettings.soundEnabled}
                    onCheckedChange={(checked) => setScannerSettings((prev) => ({ ...prev, soundEnabled: checked }))}
                  />
                </div>
              </div>

              {/* Scanning Settings */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Scanning Settings
                </h4>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-submit">Auto Submit</Label>
                  <Switch
                    id="auto-submit"
                    checked={scannerSettings.autoSubmit}
                    onCheckedChange={(checked) => setScannerSettings((prev) => ({ ...prev, autoSubmit: checked }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scan-delay">Scan Delay (ms)</Label>
                  <Input
                    id="scan-delay"
                    type="number"
                    min="0"
                    max="1000"
                    value={scannerSettings.scanDelay}
                    onChange={(e) =>
                      setScannerSettings((prev) => ({ ...prev, scanDelay: Number.parseInt(e.target.value) }))
                    }
                  />
                </div>
              </div>

              {/* Device Settings */}
              <div className="space-y-3">
                <h4 className="font-medium">Device Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="usb-enabled">USB Scanner</Label>
                    <Switch
                      id="usb-enabled"
                      checked={scannerSettings.usbEnabled}
                      onCheckedChange={(checked) => setScannerSettings((prev) => ({ ...prev, usbEnabled: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="websocket-enabled">Network Scanner</Label>
                    <Switch
                      id="websocket-enabled"
                      checked={scannerSettings.websocketEnabled}
                      onCheckedChange={(checked) =>
                        setScannerSettings((prev) => ({ ...prev, websocketEnabled: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="camera-enabled">Camera Scanner</Label>
                    <Switch
                      id="camera-enabled"
                      checked={scannerSettings.cameraEnabled}
                      onCheckedChange={(checked) => setScannerSettings((prev) => ({ ...prev, cameraEnabled: checked }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
