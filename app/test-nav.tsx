import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function TestNav() {
    return (
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 24 }}>Navigation Test Working!</Text>
            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                <Text style={{ color: '#8B5CF6' }}>Go Back</Text>
            </TouchableOpacity>
        </View>
    );
}
