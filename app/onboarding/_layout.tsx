import { Stack } from 'expo-router';

export default function OnboardingLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="name" />
            <Stack.Screen name="email" />
            <Stack.Screen name="gender" />
            <Stack.Screen name="language" />
            <Stack.Screen name="details" />
        </Stack>
    );
}
