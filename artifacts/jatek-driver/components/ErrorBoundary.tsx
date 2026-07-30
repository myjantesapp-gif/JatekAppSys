import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Une erreur s'est produite</Text>
          <Text style={styles.message}>{this.state.error?.message}</Text>
          <Pressable onPress={() => this.setState({ hasError: false, error: null })} style={styles.button}>
            <Text style={styles.buttonText}>Réessayer</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  message: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 24 },
  button: { backgroundColor: "#E91E8C", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
