import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Image, Modal, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ShoppingCart, X, Plus, Minus, CreditCard, Banknote, Smartphone, ScanBarcode } from 'lucide-react-native';
import api from '../../lib/api-client';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../lib/utils';
import BarcodeScanner from '../../components/BarcodeScanner';

// Local formatter helper if utils one is not compatible or missing
const formatMoney = (amount: number) => `KES ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

interface Product {
    id: string;
    name: string;
    description: string;
    basePrice: number;
    stockQuantity: number;
    category: string;
    imageUrl?: string;
    variants?: any[];
}

export default function POS() {
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [showCart, setShowCart] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    const { cart, addToCart, removeFromCart, updateQuantity, clearCart, total, itemCount } = useCart();

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data } = await api.listProducts({ limit: 100 });
            setProducts(data.products);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch products');
        } finally {
            setLoading(false);
        }
    };

    const categories = useMemo(() => {
        const unique = new Set(products.map(p => p.category));
        return ['All', ...Array.from(unique)];
    }, [products]);

    const filteredProducts = products.filter(p =>
        (selectedCategory === 'All' || p.category === selectedCategory) &&
        (p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleScan = async (data: string) => {
        setShowScanner(false);
        try {
            // Check if product exists in loaded list first (optimization)
            // Ideally we should call the backend to get by barcode to be accurate
            setLoading(true);
            const response = await api.getByBarcode(data);
            if (response.data?.product) {
                addToCart(response.data.product);
                Alert.alert('Found!', `${response.data.product.name} added to cart.`);
            } else {
                Alert.alert('Not Found', 'Product with this barcode not found.');
            }
        } catch (error) {
            console.error('Scan lookup error', error);
            Alert.alert('Error', 'Failed to lookup product.');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckout = (method: 'cash' | 'mpesa' | 'card') => {
        if (cart.length === 0) return;

        setProcessing(true);
        // ... (rest of function)
        // Simulate checkout process
        Alert.alert(
            'Confirm Checkout',
            `Pay ${formatMoney(total)} via ${method.toUpperCase()}?`,
            [
                { text: 'Cancel', onPress: () => setProcessing(false), style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            const saleData = {
                                paymentMethod: method,
                                items: cart.map(item => ({
                                    productId: item.productId,
                                    variantId: item.variantId,
                                    quantity: item.quantity,
                                    price: item.price
                                })),
                                // Add logic for amountPaid etc.
                                amountPaid: total
                            };

                            await api.createSale(saleData);
                            Alert.alert('Success', 'Sale completed successfully!');
                            clearCart();
                            setShowCart(false);
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.error || 'Transaction failed');
                        } finally {
                            setProcessing(false);
                        }
                    }
                }
            ]
        );
    };

    const renderProduct = ({ item }: { item: Product }) => (
        <TouchableOpacity
            className="flex-1 m-2 bg-background rounded-xl p-3 border border-border ছায়া-sm min-h-[160px]"
            onPress={() => addToCart(item)}
        >
            <View className="h-24 bg-muted rounded-lg mb-2 relative overflow-hidden">
                {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} className="w-full h-full" resizeMode="cover" />
                ) : (
                    <View className="flex-1 items-center justify-center">
                        <Text className="text-muted-foreground text-xs">No Image</Text>
                    </View>
                )}
                <View className="absolute top-1 right-1 bg-background/80 px-2 py-0.5 rounded text-[10px] font-bold">
                    <Text className="text-[10px] uppercase font-bold">{item.category}</Text>
                </View>
            </View>
            <Text className="font-bold text-sm text-foreground mb-1 line-clamp-2" numberOfLines={2}>{item.name}</Text>
            <Text className="text-primary font-bold">{formatMoney(item.basePrice)}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-muted">
            {/* Header */}
            <View className="bg-background p-4 border-b border-border flex-row items-center gap-3">
                <TouchableOpacity
                    className="w-10 h-10 bg-secondary/10 rounded-xl items-center justify-center border border-secondary/20 mr-1"
                    onPress={() => setShowScanner(true)}
                >
                    <ScanBarcode size={20} color="#64748b" />
                </TouchableOpacity>

                <View className="flex-1 bg-muted rounded-xl flex-row items-center px-3 h-10 border border-border">
                    <Search size={20} color="#94a3b8" />
                    <TextInput
                        className="flex-1 ml-2 text-foreground"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                </View>
                <TouchableOpacity
                    className="w-10 h-10 bg-primary/10 rounded-xl items-center justify-center relative border border-primary/20"
                    onPress={() => setShowCart(true)}
                >
                    <ShoppingCart size={20} color="#3b82f6" />
                    {itemCount > 0 && (
                        <View className="absolute -top-2 -right-2 bg-red-500 w-5 h-5 rounded-full items-center justify-center border-2 border-background">
                            <Text className="text-white text-[10px] font-bold">{itemCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Categories */}
            <View className="bg-background pb-4">
                <FlatList
                    data={categories}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => setSelectedCategory(item)}
                            className={`px-4 py-2 rounded-full border ${selectedCategory === item ? 'bg-primary border-primary' : 'bg-background border-border'}`}
                        >
                            <Text className={`font-bold ${selectedCategory === item ? 'text-white' : 'text-muted-foreground'}`}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Product Grid */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            ) : (
                <FlatList
                    data={filteredProducts}
                    numColumns={2}
                    contentContainerStyle={{ padding: 8 }}
                    renderItem={renderProduct}
                    keyExtractor={item => item.id}
                />
            )}

            {/* Cart Modal */}
            <Modal visible={showCart} animationType="slide" presentationStyle="pageSheet">
                {/* ... existing modal code ... */}
                <View className="flex-1 bg-muted/30">
                    <View className="p-4 bg-background border-b border-border flex-row items-center justify-between shadow-sm">
                        <Text className="text-xl font-bold text-foreground">Current Cart</Text>
                        <TouchableOpacity onPress={() => setShowCart(false)} className="bg-muted p-2 rounded-full active:bg-muted/80">
                            <X size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={cart}
                        contentContainerStyle={{ padding: 16, gap: 12 }}
                        renderItem={({ item }) => (
                            <View className="flex-row items-center bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
                                <View className="flex-1">
                                    <Text className="font-bold text-foreground text-base mb-1">{item.name}</Text>
                                    <View className="flex-row items-center gap-2">
                                        <Text className="text-primary font-bold">{formatMoney(item.price)}</Text>
                                        <Text className="text-muted-foreground text-xs">•</Text>
                                        <Text className="text-muted-foreground text-xs">Qty: {item.quantity}</Text>
                                    </View>
                                </View>
                                <View className="flex-row items-center gap-4 bg-muted/50 p-1.5 rounded-xl border border-border/50">
                                    <TouchableOpacity
                                        onPress={() => updateQuantity(item.productId, item.variantId, -1)}
                                        className="bg-background w-8 h-8 rounded-lg items-center justify-center shadow-sm border border-border/50 active:scale-95 transition-transform"
                                    >
                                        <Minus size={16} color="#64748b" />
                                    </TouchableOpacity>
                                    <Text className="font-bold w-4 text-center text-foreground">{item.quantity}</Text>
                                    <TouchableOpacity
                                        onPress={() => updateQuantity(item.productId, item.variantId, 1)}
                                        className="bg-primary w-8 h-8 rounded-lg items-center justify-center shadow-sm active:scale-95 transition-transform"
                                    >
                                        <Plus size={16} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        ListEmptyComponent={
                            <View className="items-center justify-center p-10">
                                <ShoppingCart size={48} color="#cbd5e1" />
                                <Text className="text-muted-foreground mt-4 text-center">Your cart is empty</Text>
                            </View>
                        }
                    />

                    <View className="p-6 border-t border-border bg-muted/30">
                        <View className="flex-row justify-between mb-6">
                            <Text className="text-lg font-bold text-muted-foreground">Total</Text>
                            <Text className="text-2xl font-bold text-primary">{formatMoney(total)}</Text>
                        </View>

                        <View className="gap-3">
                            <TouchableOpacity
                                disabled={cart.length === 0 || processing}
                                onPress={() => handleCheckout('cash')}
                                className={`flex-row items-center justify-center gap-2 bg-emerald-600 h-12 rounded-xl ${cart.length === 0 ? 'opacity-50' : ''}`}
                            >
                                <Banknote size={20} color="white" />
                                <Text className="text-white font-bold uppercase">Cash Sale</Text>
                            </TouchableOpacity>

                            <View className="flex-row gap-3">
                                <TouchableOpacity
                                    disabled={cart.length === 0 || processing}
                                    onPress={() => handleCheckout('mpesa')}
                                    className={`flex-1 flex-row items-center justify-center gap-2 bg-green-500 h-12 rounded-xl ${cart.length === 0 ? 'opacity-50' : ''}`}
                                >
                                    <Smartphone size={20} color="white" />
                                    <Text className="text-white font-bold uppercase">M-Pesa</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    disabled={cart.length === 0 || processing}
                                    onPress={() => handleCheckout('card')}
                                    className={`flex-1 flex-row items-center justify-center gap-2 bg-blue-600 h-12 rounded-xl ${cart.length === 0 ? 'opacity-50' : ''}`}
                                >
                                    <CreditCard size={20} color="white" />
                                    <Text className="text-white font-bold uppercase">Card</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            <BarcodeScanner
                visible={showScanner}
                onClose={() => setShowScanner(false)}
                onScan={handleScan}
            />
        </SafeAreaView>
    );
}
