import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";

const CONTENT: Record<string, { title: string; sections: Array<{ h: string; p: string }> }> = {
  privacy: {
    title: "Politique de confidentialité",
    sections: [
      { h: "1. Données collectées", p: "Nous collectons votre nom, email, téléphone, adresse de livraison et historique de commande pour fournir le service. Aucune donnée bancaire n'est stockée par Jatek." },
      { h: "2. Utilisation des données", p: "Vos données servent à traiter vos commandes, vous identifier, livrer à la bonne adresse et améliorer le service. Nous ne vendons jamais vos données à des tiers." },
      { h: "3. Vos droits (RGPD)", p: "Vous pouvez à tout moment consulter, modifier ou supprimer vos données depuis l'écran Profil. La suppression de compte efface l'ensemble des données sous 30 jours." },
      { h: "4. Cookies & analytics", p: "Nous utilisons un minimum de cookies techniques et un outil d'analyse anonymisée pour améliorer l'application." },
      { h: "5. Contact DPO", p: "Pour toute question : privacy@jatek.ma" },
    ],
  },
  terms: {
    title: "Conditions d'utilisation",
    sections: [
      { h: "1. Acceptation", p: "En utilisant Jatek, vous acceptez ces conditions ainsi que la politique de confidentialité." },
      { h: "2. Compte utilisateur", p: "Vous êtes responsable de la confidentialité de vos identifiants. Tout usage frauduleux entraînera la fermeture du compte." },
      { h: "3. Commandes", p: "Une commande validée est ferme. L'annulation est possible tant que le restaurant ne l'a pas confirmée." },
      { h: "4. Paiement", p: "Le paiement est dû à la livraison ou au moment de la commande selon le mode choisi." },
      { h: "5. Livraison", p: "Les délais sont indicatifs. Jatek met tout en œuvre pour les respecter mais ne peut être tenu responsable d'un retard ponctuel." },
      { h: "6. Litiges", p: "Tout litige sera porté devant les juridictions compétentes du Royaume du Maroc." },
    ],
  },
  cookies: {
    title: "Politique des cookies",
    sections: [
      { h: "1. Qu'est-ce qu'un cookie ?", p: "Un cookie est un petit fichier déposé sur votre appareil qui permet à une application de mémoriser vos préférences ou d'analyser votre utilisation." },
      { h: "2. Cookies essentiels", p: "Indispensables au fonctionnement (session, panier, sécurité). Ils ne peuvent pas être désactivés." },
      { h: "3. Cookies analytiques", p: "Mesure d'audience anonymisée pour améliorer l'application. Activables/désactivables dans Profil > Confidentialité." },
      { h: "4. Cookies marketing", p: "Personnalisation des offres et publicités. Désactivés par défaut, soumis à votre consentement explicite." },
      { h: "5. Durée de conservation", p: "12 mois maximum, renouvelés à chaque visite. Vous pouvez retirer votre consentement à tout moment." },
      { h: "6. Gérer vos cookies", p: "Allez dans Profil > Confidentialité & RGPD pour modifier vos choix à tout moment." },
    ],
  },
  mentions: {
    title: "Mentions légales",
    sections: [
      { h: "Éditeur", p: "Jatek SARL — Capital 100 000 MAD\nSiège social : Oujda, Maroc\nRC : 12345 — ICE : 002345678000099" },
      { h: "Directeur de publication", p: "Direction Jatek" },
      { h: "Hébergement", p: "Replit, Inc. — 548 Market Street, San Francisco, CA 94104, USA" },
      { h: "Contact", p: "contact@jatek.ma" },
      { h: "Propriété intellectuelle", p: "L'ensemble du contenu de l'application (textes, logos, design) est la propriété exclusive de Jatek SARL ou de ses partenaires." },
    ],
  },
};

export default function LegalScreen() {
  const colors = useColors();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const data = CONTENT[type ?? "privacy"] ?? CONTENT.privacy;

  return (
    <ProfileScreenLayout title={data.title}>
      <View style={{ padding: 20 }}>
        {data.sections.map((s, i) => (
          <View key={i} style={{ marginBottom: 22 }}>
            <Text style={[styles.h, { color: colors.heading }]}>{s.h}</Text>
            <Text style={[styles.p, { color: colors.mutedForeground }]}>{s.p}</Text>
          </View>
        ))}
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>Dernière mise à jour : avril 2026</Text>
      </View>
    </ProfileScreenLayout>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 8 },
  p: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  footer: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 16 },
});
