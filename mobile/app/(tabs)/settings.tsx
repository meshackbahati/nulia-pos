import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { LogOut } from 'lucide-react-native';

export default function Settings() {
    const { logout, user } = useAuth();

    return (
        <SafeAreaView className="flex-1 bg-muted">
            <View className="p-6 bg-background border-b border-border">
                <Text className="text-2xl font-bold">Settings</Text>
            </View>

            <View className="p-6">
                <View className="bg-background rounded-xl p-4 mb-6">
                    <Text className="text-sm font-bold text-muted-foreground uppercase mb-1">Account</Text>
                    <Text className="text-lg font-bold">{user?.name}</Text>
                    <Text className="text-muted-foreground">{user?.email}</Text>
                    <View className="mt-2 bg-primary/10 self-start px-2 py-1 rounded">
                        <Text className="text-xs font-bold text-primary uppercase">{user?.role}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={logout}
                    className="flex-row items-center justify-center gap-2 bg-red-500/10 h-12 rounded-xl border border-red-500/20"
                >
                    <LogOut size={20} color="#ef4444" />
                    <Text className="text-red-500 font-bold">Sign Out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
