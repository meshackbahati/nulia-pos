import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { X } from 'lucide-react-native';

interface ScannerProps {
    visible: boolean;
    onClose: () => void;
    onScan: (data: string) => void;
}

export default function BarcodeScanner({ visible, onClose, onScan }: ScannerProps) {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        const getPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };

        if (visible) {
            getPermissions();
            setScanned(false);
        }
    }, [visible]);

    const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
        if (scanned) return;
        setScanned(true);
        // Vibrate or sound could go here
        onScan(data);
    };

    if (hasPermission === null) {
        return <View />;
    }
    if (hasPermission === false) {
        return (
            <Modal visible={visible} animationType="slide">
                <View className="flex-1 items-center justify-center p-6 bg-background">
                    <Text className="text-lg text-center mb-4 text-foreground">No access to camera</Text>
                    <TouchableOpacity onPress={onClose} className="bg-primary px-6 py-3 rounded-lg">
                        <Text className="text-white font-bold">Close</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View style={styles.container}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39"],
                    }}
                />

                {/* Overlay */}
                <View style={styles.overlay}>
                    <View style={styles.unfocusedContainer} />
                    <View style={styles.middleContainer}>
                        <View style={styles.unfocusedContainer} />
                        <View style={styles.focusedContainer} />
                        <View style={styles.unfocusedContainer} />
                    </View>
                    <View style={styles.unfocusedContainer} />
                </View>

                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                >
                    <X size={24} color="white" />
                </TouchableOpacity>

                <View style={styles.instructionContainer}>
                    <Text style={styles.instructionText}>Point camera at a barcode</Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: 'black'
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unfocusedContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    middleContainer: {
        flexDirection: 'row',
        height: 250,
    },
    focusedContainer: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#3b82f6',
        backgroundColor: 'transparent',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 10,
        borderRadius: 20,
        zIndex: 10,
    },
    instructionContainer: {
        position: 'absolute',
        bottom: 80,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    instructionText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    }
});
