import { StyleSheet, Text, View } from 'react-native';

export default function WebAppView() {
  return (
    <View style={styles.fallback}>
      <Text style={styles.title}>Loveable</Text>
      <Text style={styles.text}>WebView has been removed. This is a pure native experience.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#020617',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#CBD5F5',
    textAlign: 'center',
    lineHeight: 20,
  },
});
