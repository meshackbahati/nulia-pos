import '../global.css';
import { Slot } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <CartProvider>
        <AuthProvider>
          <Slot />
        </AuthProvider>
      </CartProvider>
    </SafeAreaProvider>
  );
}
