import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function Index() {
    const { token, tempToken, isLoading } = useAuth();

    if (isLoading) return null;

    if (token) return <Redirect href="/(tabs)" />;
    if (tempToken) return <Redirect href="/onboarding/name" />;

    return <Redirect href="/(auth)/phone" />;
}
