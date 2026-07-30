import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { getApiBaseSafe } from "@/lib/apiBase";

type Step = "email" | "code" | "newPassword" | "done";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendCode = async () => {
    if (!email.trim()) { setError("Veuillez entrer votre adresse e-mail."); return; }
    setError("");
    setLoading(true);
    try {
      const base = getApiBaseSafe();
      const res = await fetch(`${base}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de l'envoi");
      setStep("code");
    } catch (e: any) {
      setError(e?.message ?? "Une erreur est survenue. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async () => {
    if (!code.trim()) { setError("Veuillez entrer le code reçu par e-mail."); return; }
    if (!newPassword || newPassword.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères."); return; }
    if (newPassword !== confirmPassword) { setError("Les mots de passe ne correspondent pas."); return; }
    setError("");
    setLoading(true);
    try {
      const base = getApiBaseSafe();
      const res = await fetch(`${base}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code.trim(), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Code invalide ou expiré");
      setStep("done");
    } catch (e: any) {
      setError(e?.message ?? "Code invalide ou expiré.");
    } finally {
      setLoading(false);
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
    inner: { flex: 1, justifyContent: "center", gap: 24 },
    title: { fontSize: 28, fontWeight: "800", color: colors.foreground, textAlign: "center" },
    subtitle: { fontSize: 15, color: colors.mutedForeground, textAlign: "center", lineHeight: 22 },
    input: {
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
      padding: 14, fontSize: 16, color: colors.foreground,
      backgroundColor: colors.card,
    },
    btn: {
      backgroundColor: colors.primary, borderRadius: 14, padding: 16,
      alignItems: "center", marginTop: 4,
    },
    btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
    back: { alignItems: "center", marginTop: 8 },
    backText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
    error: { color: "#EF4444", fontSize: 13, textAlign: "center", backgroundColor: "#FEF2F2", borderRadius: 10, padding: 10 },
    successIcon: { fontSize: 64, textAlign: "center" },
  });

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.inner}>
        {step === "email" && (
          <>
            <Text style={s.title}>Mot de passe oublié ?</Text>
            <Text style={s.subtitle}>Entrez votre adresse e-mail. Nous vous enverrons un lien de réinitialisation.</Text>
            {error ? <Text style={s.error}>{error}</Text> : null}
            <TextInput
              style={s.input}
              placeholder="votre@email.com"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={handleSendCode}
            />
            <TouchableOpacity style={s.btn} onPress={handleSendCode} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Envoyer le code</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.back} onPress={() => router.back()}>
              <Text style={s.backText}>← Retour à la connexion</Text>
            </TouchableOpacity>
          </>
        )}

        {step === "code" && (
          <>
            <Text style={s.title}>Vérification</Text>
            <Text style={s.subtitle}>Un code a été envoyé à {email}. Entrez-le ci-dessous et choisissez un nouveau mot de passe.</Text>
            {error ? <Text style={s.error}>{error}</Text> : null}
            <TextInput
              style={s.input}
              placeholder="Code de vérification"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="default"
              autoCapitalize="none"
              value={code}
              onChangeText={setCode}
            />
            <TextInput
              style={s.input}
              placeholder="Nouveau mot de passe (min. 8 caractères)"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={s.input}
              placeholder="Confirmer le mot de passe"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onSubmitEditing={handleVerifyAndReset}
            />
            <TouchableOpacity style={s.btn} onPress={handleVerifyAndReset} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Réinitialiser le mot de passe</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.back} onPress={() => setStep("email")}>
              <Text style={s.backText}>← Renvoyer le code</Text>
            </TouchableOpacity>
          </>
        )}

        {step === "done" && (
          <>
            <Text style={s.successIcon}>✅</Text>
            <Text style={s.title}>Mot de passe mis à jour !</Text>
            <Text style={s.subtitle}>Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.</Text>
            <TouchableOpacity style={s.btn} onPress={() => router.replace("/(auth)/login")}>
              <Text style={s.btnText}>Se connecter</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
