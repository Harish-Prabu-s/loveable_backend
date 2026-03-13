import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Link, usePathname } from "expo-router";

const NotFound = () => {
  const pathname = usePathname();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", pathname);
  }, [pathname]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>404</Text>
        <Text style={styles.subtitle}>Oops! Page not found</Text>
        <Link href="/" style={styles.link}>
          Return to Home
        </Link>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  content: {
    alignItems: "center",
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    color: "#6b7280",
    marginBottom: 16,
  },
  link: {
    color: "#3b82f6",
    textDecorationLine: "underline",
  },
});

export default NotFound;
