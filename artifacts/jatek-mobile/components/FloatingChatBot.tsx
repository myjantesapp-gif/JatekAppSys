/**
 * FloatingChatBot — bouton FAB + bottom sheet chatbot FAQ
 *
 * • Positionné absolument, au-dessus de la tab bar
 * • Réponses par correspondance de mots-clés (FAQ locale, zéro réseau)
 * • Escalade vers ticket support via l'API existante si pas de réponse
 * • Se masque quand le clavier est ouvert
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
  ActivityIndicator,
  SafeAreaView,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { createSupportTicket } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// ─── Knowledge base ────────────────────────────────────────────────────────────
const KB = [
  {
    keywords: ["commande", "commander", "passer", "panier", "plat", "choisir"],
    q: "Comment passer une commande ?",
    a: "Choisissez un restaurant, ajoutez vos plats au panier, vérifiez votre adresse de livraison puis validez. Le paiement se fait à la livraison ou via vos moyens enregistrés.",
  },
  {
    keywords: ["délai", "temps", "minutes", "attente", "combien", "livraison"],
    q: "Quels sont les délais de livraison ?",
    a: "La plupart des commandes sont livrées en 25 à 45 minutes selon la distance et l'affluence du restaurant.",
  },
  {
    keywords: ["annuler", "annulation", "annule", "stopper", "arrêter"],
    q: "Puis-je annuler une commande ?",
    a: "Oui, tant que le restaurant ne l'a pas confirmée. Allez dans l'onglet Commandes et appuyez sur Annuler.",
  },
  {
    keywords: ["promo", "code", "réduction", "coupon", "promotion", "bon"],
    q: "Comment utiliser un code promo ?",
    a: "Saisissez le code dans Bons de réduction ou directement à l'étape paiement du panier.",
  },
  {
    keywords: ["paiement", "payer", "carte", "visa", "mastercard", "cmi", "espèces"],
    q: "Quels modes de paiement sont acceptés ?",
    a: "Cartes bancaires (Visa, Mastercard, CMI), wallets marocains et espèces à la livraison.",
  },
  {
    keywords: ["livreur", "livreurs", "contacter", "appeler", "message", "coursier"],
    q: "Comment contacter un livreur ?",
    a: "Sur la page de suivi de commande, vous pouvez l'appeler ou lui envoyer un message dès qu'il est en route.",
  },
];

// Questions suggérées affichées au démarrage
const QUICK = [
  "Délais de livraison ?",
  "Annuler une commande ?",
  "Modes de paiement ?",
  "Code promo ?",
];

function findAnswer(input: string): string | null {
  const lower = input.toLowerCase();
  for (const entry of KB) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.a;
  }
  return null;
}

// ─── Types ──────────────────────────────────────────────────────────────────
type Msg = {
  id: number;
  from: "user" | "bot";
  text: string;
  showSupport?: boolean;
};

let _id = 0;
const mkId = () => ++_id;

const WELCOME: Msg = {
  id: mkId(),
  from: "bot",
  text: "Bonjour 👋 Je suis l'assistant Jatek. Comment puis-je vous aider ?",
};

// ─── Component ──────────────────────────────────────────────────────────────
const TAB_H = Platform.OS === "web" ? 84 : 72;
const FAB_SIZE = 52;
const FAB_BOTTOM = TAB_H + 16;
const FAB_RIGHT = 18;

export default function FloatingChatBot() {
  const colors = useColors();
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [kbVisible, setKbVisible] = useState(false);
  const [ticketSent, setTicketSent] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabOpacity = useRef(new Animated.Value(1)).current;

  // ── Keyboard visibility ─────────────────────────────────────────────────
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKbVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKbVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Masquer le FAB quand le clavier est ouvert ET le chat fermé
  useEffect(() => {
    const hide = kbVisible && !open;
    Animated.parallel([
      Animated.timing(fabScale, {
        toValue: hide ? 0 : 1,
        duration: 200,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(fabOpacity, {
        toValue: hide ? 0 : 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [kbVisible, open, fabScale, fabOpacity]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [msgs, open, scrollToBottom]);

  // ── Open / close ────────────────────────────────────────────────────────
  const openChat = () => {
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(fabScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(() => setOpen(true));
  };

  const closeChat = () => {
    setOpen(false);
    Keyboard.dismiss();
  };

  // ── Send message ────────────────────────────────────────────────────────
  const pushMsg = (msg: Omit<Msg, "id">) =>
    setMsgs((prev) => [...prev, { ...msg, id: mkId() }]);

  const handleSend = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setInput("");

      pushMsg({ from: "user", text: trimmed });

      // Simuler un délai de frappe
      setTimeout(() => {
        const answer = findAnswer(trimmed);
        if (answer) {
          pushMsg({ from: "bot", text: answer });
        } else {
          pushMsg({
            from: "bot",
            text: "Je n'ai pas trouvé de réponse à votre question. Souhaitez-vous contacter notre support ?",
            showSupport: true,
          });
        }
      }, 400);
    },
    [],
  );

  // ── Support ticket ──────────────────────────────────────────────────────
  const handleSendTicket = useCallback(
    async (userQuestion: string) => {
      if (!token || ticketSent) return;
      setSending(true);
      try {
        await createSupportTicket({
          category: "other",
          subject: "Question via chatbot",
          message: userQuestion,
        });
        setTicketSent(true);
        pushMsg({
          from: "bot",
          text: "✅ Votre message a été envoyé ! Notre équipe vous répond sous 24h.",
        });
      } catch {
        pushMsg({
          from: "bot",
          text: "Impossible d'envoyer le ticket pour l'instant. Essayez depuis Profil → Contacter le support.",
        });
      } finally {
        setSending(false);
      }
    },
    [token, ticketSent],
  );

  // ── Reset on close ──────────────────────────────────────────────────────
  const handleClose = () => {
    closeChat();
    // Petite pause avant reset pour que la fermeture soit fluide
    setTimeout(() => {
      setMsgs([WELCOME]);
      setInput("");
      setTicketSent(false);
    }, 300);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const s = makeStyles(colors);

  // Dernier message user (pour le ticket)
  const lastUserMsg = [...msgs].reverse().find((m) => m.from === "user")?.text ?? "Question non précisée";

  return (
    <>
      {/* ── FAB ── */}
      <Animated.View
        pointerEvents={kbVisible && !open ? "none" : "auto"}
        style={[
          s.fab,
          { transform: [{ scale: fabScale }], opacity: fabOpacity },
        ]}
      >
        <TouchableOpacity onPress={openChat} activeOpacity={0.85} style={s.fabInner}>
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Modal chat ── */}
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <View style={s.backdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={s.sheet}
          >
            <SafeAreaView style={s.sheetInner}>
              {/* Header */}
              <View style={s.header}>
                <View style={s.headerLeft}>
                  <View style={s.avatar}>
                    <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
                  </View>
                  <View>
                    <Text style={s.headerTitle}>Assistant Jatek</Text>
                    <View style={s.onlineDot}>
                      <View style={s.dot} />
                      <Text style={s.onlineTxt}>En ligne</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={24} color={colors.heading} />
                </TouchableOpacity>
              </View>

              {/* Messages */}
              <ScrollView
                ref={scrollRef}
                style={s.messages}
                contentContainerStyle={s.messagesContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {msgs.map((msg) => (
                  <View key={msg.id}>
                    <View style={[s.bubble, msg.from === "user" ? s.bubbleUser : s.bubbleBot]}>
                      <Text style={[s.bubbleText, { color: msg.from === "user" ? "#fff" : colors.heading }]}>
                        {msg.text}
                      </Text>
                    </View>
                    {msg.showSupport && (
                      <TouchableOpacity
                        style={[s.supportBtn, { borderColor: colors.primary }]}
                        onPress={() => handleSendTicket(lastUserMsg)}
                        disabled={sending || ticketSent}
                        activeOpacity={0.8}
                      >
                        {sending ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <Ionicons name="headset-outline" size={16} color={colors.primary} />
                            <Text style={[s.supportBtnText, { color: colors.primary }]}>
                              Envoyer au support
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {/* Quick suggestions (affiché uniquement si seul le message de bienvenue est présent) */}
                {msgs.length === 1 && (
                  <View style={s.suggestions}>
                    {QUICK.map((q) => (
                      <TouchableOpacity
                        key={q}
                        style={[s.chip, { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}
                        onPress={() => handleSend(q)}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.chipText, { color: colors.primary }]}>{q}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>

              {/* Input */}
              <View style={[s.inputRow, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  style={[s.textInput, { backgroundColor: colors.muted, color: colors.heading }]}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Posez votre question…"
                  placeholderTextColor={colors.mutedForeground}
                  returnKeyType="send"
                  onSubmitEditing={() => handleSend(input)}
                  blurOnSubmit={false}
                  maxLength={300}
                />
                <TouchableOpacity
                  style={[s.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.muted }]}
                  onPress={() => handleSend(input)}
                  disabled={!input.trim()}
                  activeOpacity={0.8}
                >
                  <Ionicons name="send" size={18} color={input.trim() ? "#fff" : colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
function makeStyles(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    // FAB
    fab: {
      position: "absolute",
      bottom: FAB_BOTTOM,
      left: FAB_RIGHT,
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 999,
    },
    fabInner: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    // Modal
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
      height: "75%",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      backgroundColor: colors.background,
      overflow: "hidden",
    },
    sheetInner: {
      flex: 1,
    },

    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: colors.heading,
    },
    onlineDot: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 2,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: "#22C55E",
    },
    onlineTxt: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: "#22C55E",
    },

    // Messages
    messages: {
      flex: 1,
    },
    messagesContent: {
      padding: 16,
      gap: 8,
    },
    bubble: {
      maxWidth: "80%",
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 4,
    },
    bubbleBot: {
      backgroundColor: colors.muted,
      alignSelf: "flex-start",
      borderBottomLeftRadius: 4,
    },
    bubbleUser: {
      backgroundColor: colors.primary,
      alignSelf: "flex-end",
      borderBottomRightRadius: 4,
    },
    bubbleText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      lineHeight: 20,
    },

    // Support button
    supportBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      alignSelf: "flex-start",
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginTop: 4,
      marginBottom: 4,
    },
    supportBtnText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
    },

    // Quick suggestions
    suggestions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 8,
    },
    chip: {
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    chipText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },

    // Input
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    textInput: {
      flex: 1,
      borderRadius: 22,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === "ios" ? 10 : 8,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
