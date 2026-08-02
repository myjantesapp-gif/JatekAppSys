# 📱 Guide d'utilisation — Application Mobile Jatek

> **Backend exclusif** : `https://ma.jatek.app`  
> **Aucune donnée métier** n'est codée en dur dans l'application — tout est piloté par le backend.

---

## Table des matières

1. [Architecture & principes](#1-architecture--principes)
2. [Écrans & navigation](#2-écrans--navigation)
3. [Authentification](#3-authentification)
4. [Écran d'accueil](#4-écran-daccueil)
5. [Catégories & sous-catégories](#5-catégories--sous-catégories)
6. [Page Restaurant / Boutique](#6-page-restaurant--boutique)
7. [Panier & commande](#7-panier--commande)
8. [Suivi de commande](#8-suivi-de-commande)
9. [Mes commandes](#9-mes-commandes)
10. [Profil & paramètres](#10-profil--paramètres)
11. [Administration du contenu (backend)](#11-administration-du-contenu-backend)
12. [Déploiement & mise à jour OTA](#12-déploiement--mise-à-jour-ota)
13. [Bugs corrigés](#13-bugs-corrigés)

---

## 1. Architecture & principes

### Backend-driven (zéro hardcode)

Toute la structure de l'application est servie dynamiquement par `https://ma.jatek.app` :

| Ce qui vient du backend | Endpoint |
|---|---|
| Catégories (icône, couleur, slug, businessType) | `GET /api/categories` |
| Sous-catégories (imbriquées sous chaque parent) | `GET /api/categories` (champ `subCategories[]`) |
| Image de bannière par catégorie | Champ `bannerImageUrl` sur la catégorie |
| Restaurants / boutiques / services | `GET /api/restaurants?businessType=…` |
| Restaurants mis en avant (VIP) | `GET /api/restaurants/featured` |
| Publicités & promotions | `GET /api/ads` |
| Vidéos courtes | `GET /api/shorts` |

L'administrateur modifie, ajoute ou supprime une catégorie dans le dashboard `ma.jatek.app/admin` → l'application mobile se met à jour **sans rebuild**.

### Authentification JWT

Toutes les requêtes authentifiées envoient le header :
```
Authorization: Bearer <jwt_token>
```
Le token est stocké en `SecureStore` (natif) ou `localStorage` (web).

---

## 2. Écrans & navigation

```
(tabs)/
  ├── index.tsx          ← Accueil
  ├── orders.tsx         ← Mes commandes
  ├── profile.tsx        ← Profil utilisateur
  ├── restaurants.tsx    ← Liste des restaurants
  └── deliver.tsx        ← Mode livreur (si rôle driver)

category/[slug].tsx      ← Page catégorie dynamique
restaurant/[id].tsx      ← Page restaurant / boutique
cart.tsx                 ← Panier
order/[id].tsx           ← Suivi commande en temps réel
quote/new.tsx            ← Demande de devis (services coursier)

(auth)/
  ├── welcome.tsx        ← Sélection d'adresse / carte
  ├── login.tsx          ← Connexion (SMS OTP ou email)
  └── otp.tsx            ← Saisie du code OTP
```

### Règles de redirection

- Un clic sur une **tuile catégorie** → `/category/[slug]` où `slug` vient de l'API.
- Un clic sur un **restaurant** → `/restaurant/[id]`.
- **"Voir plus" / Près de chez vous** → trouve dynamiquement le slug de la catégorie `businessType === "restaurant"` dans l'API (jamais hardcodé).
- **Sous-catégories** : clic sur une puce dans `/category/[slug]` filtre les restaurants par `category` (nom de la sous-catégorie).

---

## 3. Authentification

### Connexion par SMS (OTP)

1. Saisir le numéro de téléphone avec indicatif pays.
2. Recevoir un code SMS à 6 chiffres.
3. Saisir le code → JWT stocké → redirection vers `/(tabs)`.

### Connexion par email

1. Saisir email + mot de passe.
2. Option "Créer un compte" si nouvel utilisateur.
3. Option "Mot de passe oublié" → code email de réinitialisation.

### Session persistante

Le JWT est conservé entre les sessions. L'utilisateur reste connecté jusqu'à déconnexion explicite ou expiration du token.

---

## 4. Écran d'accueil

### Sections (ordre d'affichage)

| Section | Source des données |
|---|---|
| Barre de localisation | Adresse sélectionnée (CartContext) |
| **Explorer** (tuiles catégories) | `GET /api/categories` — parents actifs uniquement |
| **Partenaires VIP & Promos** | `GET /api/restaurants/featured` — 6 premiers |
| **Bannière promo WELCOME10** | Code promo statique (pré-chargé) |
| **Découvrir en vidéo** | Restaurants avec `imageUrl` ou `coverImageUrl` |
| **Près de chez vous** | `GET /api/restaurants?businessType=restaurant` — 6 premiers |
| **Grille principale** | Tous les restaurants filtrés par catégorie/businessType active |

### Sélection de catégorie (Explorer)

- Les tuiles sont générées à 100 % depuis l'API.
- Couleur d'accent (`accentColor`), icône (`icon`), libellé (`name`) → tous du backend.
- Un appui redirige vers `/category/[slug]`.
- Police réduite automatiquement (`adjustsFontSizeToFit`) si le libellé est trop long.

---

## 5. Catégories & sous-catégories

### URL : `/category/[slug]`

**À l'arrivée :**
1. Cherche la catégorie parente par `slug` dans `/api/categories`.
2. Extrait les sous-catégories (`subCategories[]` ou filtre par `parentId`).
3. Affiche la bannière si `bannerImageUrl` est défini sur la catégorie.
4. Charge les établissements via `GET /api/restaurants?businessType=…`.

### Comportement des bannières VIP

| Contexte | Affichage des bannières |
|---|---|
| Vue parent (toutes sous-catégories) | ✅ Bannières filtrées par `businessType` de la catégorie |
| Vue sous-catégorie sélectionnée | ❌ Aucune bannière — liste seule |

### États de chargement

- `<ActivityIndicator>` pendant le chargement des catégories.
- `<ActivityIndicator>` pendant le chargement des restaurants (uniquement si la catégorie est résolue).
- Message "Catégorie indisponible" si le slug ne correspond à aucune catégorie active.

---

## 6. Page Restaurant / Boutique

### URL : `/restaurant/[id]`

- Affiche le menu groupé par `category` de l'article.
- **Galerie** : image de couverture + logo flottant.
- **Modal produit** (`MenuItemDetailModal`) :
  - Tailles disponibles (API `/api/menu-items/:id/sizes`)
  - Suppléments (API `/api/menu-items/:id/extras`)
  - Bouton "Ajouter au panier" positionné **au-dessus de la barre de navigation Android** (safe area insets appliqués).
- **Services / Coursier** : bouton "Demander un devis" à la place du panier.

---

## 7. Panier & commande

### Panier (`CartContext`)

- Persistant en mémoire (perdu à la fermeture de l'app).
- Un seul restaurant actif à la fois — alerte de confirmation si changement.
- Récapitulatif dans `CartPreviewSheet` (swipe up depuis le bas).

### Passer une commande (`/cart`)

1. Vérifier les articles, quantités, taille, suppléments.
2. Sélectionner l'adresse de livraison.
3. Choisir le mode de paiement (espèces / carte).
4. Appuyer sur "Commander" → `POST /api/orders`.
5. Redirection vers `/order/[id]` (suivi en temps réel).

---

## 8. Suivi de commande

### URL : `/order/[id]`

- Connexion SSE : `GET /api/events?channels=order:[id]`.
- Timeline des statuts :
  - `pending` → `accepted` → `preparing` → `ready` → `picked_up` → `en_route` → `delivered`
- Code de retrait à 4 chiffres affiché au client pour confirmation de livraison.

---

## 9. Mes commandes

### URL : `/(tabs)/orders`

- Nécessite d'être connecté (affiche "Se connecter" sinon).
- Filtres : **Toutes** / **En cours** / **Passées**.
- Rechargement automatique toutes les 30 secondes.
- Accès rapide au suivi d'une commande active.

---

## 10. Profil & paramètres

### Sections disponibles

| Section | Fonctionnalité |
|---|---|
| Mes adresses | Ajouter, modifier, supprimer, définir par défaut |
| Mes commandes | Historique complet |
| Favoris | Restaurants sauvegardés |
| Moyens de paiement | Cartes enregistrées |
| Codes promo | Saisie et validation de coupons |
| Avis & notes | Évaluations laissées |
| Notifications | Préférences push / email / SMS |
| Langue | Français / English / العربية |
| Support | Chat / Tickets |
| Confidentialité & RGPD | Consentements, export, suppression de compte |

---

## 11. Administration du contenu (backend)

> **URL** : `https://ma.jatek.app/admin`  
> **Identifiants** : `rbelmahi90@gmail.com` / `000000`

### Gérer les catégories

1. Aller dans **Catégories** dans le menu latéral.
2. **Créer une catégorie parente** :
   - Nom, icône (nom Material), couleur d'accent, type de commerce, ordre d'affichage.
   - **Image de bannière (URL)** : URL complète d'une image distante affichée en fond de la page catégorie dans l'app mobile.
3. **Créer une sous-catégorie** : choisir le parent dans la liste.
4. **Modifier** : même formulaire, avec le champ `bannerImageUrl`.
5. **Activer / Désactiver** : le toggle `isActive` masque immédiatement la catégorie dans l'app.

### Champs `Category` disponibles

| Champ | Rôle dans l'app mobile |
|---|---|
| `name` | Libellé affiché sur la tuile et le titre de la page |
| `slug` | Clé de navigation dans l'URL `/category/[slug]` |
| `icon` | Nom d'icône Ionicons affiché sur la tuile |
| `accentColor` | Couleur de la tuile, du titre et des puces de sous-catégorie |
| `businessType` | Filtre les restaurants affichés (`restaurant`, `grocery`, `pharmacy`, `shop`, `services`, `supermarket`) |
| **`type`** | `"category"` = tuile Explorer standard, `"service_shortcut"` = raccourci service rapide en haut de l'accueil, `"subcategory"` = affecté automatiquement aux enfants |
| `bannerImageUrl` | Image de fond dans l'en-tête de la page catégorie |
| `sortOrder` | Ordre d'affichage dans le carrousel Explorer |
| `isActive` | Masquer/afficher dans l'app sans suppression |
| `parentId` | `null` = catégorie parente, `id` = sous-catégorie |

### Comportement selon `type`

| Valeur | Rendu dans l'app |
|---|---|
| `category` | Tuile dans le carrousel **Explorer** (icône transparente sur fond coloré + libellé) |
| `service_shortcut` | Tuile colorée pleine dans la rangée **Services rapides** au-dessus d'Explorer (icône blanche sur fond plein) |
| `subcategory` | Puce filtrante dans la barre de sous-catégories de la page catégorie |

### Filtres disponibles sur `GET /api/categories`

| Paramètre | Exemple | Effet |
|---|---|---|
| `type` | `?type=service_shortcut` | Retourne uniquement ce type |
| `businessType` | `?businessType=restaurant` | Filtre par type de commerce |
| `parentId` | `?parentId=null` | Catégories racines uniquement |

### Gérer les restaurants

- **Type de commerce** (`businessType`) doit correspondre au `businessType` de la catégorie pour que les filtres fonctionnent.
- **Mis en avant** (`isFeatured`) → apparaît dans la section "Partenaires VIP & Promos" de l'accueil.

### Gérer les publicités (`/admin/ads`)

- Les pubs s'affichent dans l'écran d'accueil via `GET /api/ads`.
- Activer `isActive` pour les rendre visibles.

---

## 12. Déploiement & mise à jour OTA

### Mise à jour sans rebuild (OTA — recommandé pour les bugfixes JS)

```bash
bash scripts/eas-update.sh mobile production "Description du changement"
```

L'app se met à jour automatiquement au prochain lancement.

### Rebuild complet (nécessaire si changement de dépendance native)

```bash
# APK Android (testeurs)
bash scripts/eas-build.sh mobile preview android

# AAB Android (Play Store)
bash scripts/eas-build.sh mobile production android
```

### Configuration

- **Backend** : `https://ma.jatek.app` (jamais `localhost` en production)
- **EAS Project ID** : `2437ecfc-9682-4b07-9eaa-77f6206b4714`
- **Variables** : `EXPO_PUBLIC_DOMAIN` doit pointer vers `ma.jatek.app`

---

## 13. Bugs corrigés

| Bug | Symptôme | Correction |
|---|---|---|
| **Vague couleur différente** | La vague en bas du header "Mes commandes" apparaissait plus claire que le fond | Suppression du dégradé sur `WaveEdge` → couleur solide `PINK_DEEP` |
| **"Ajouter au panier" caché** | Le bouton était recouvert par la barre de navigation Android | Ajout de `useSafeAreaInsets()` dans `MenuItemDetailModal` avec `paddingBottom` dynamique |
| **Clavier masque le bouton de connexion** | Sur Android, le clavier couvrait le bouton "Se connecter" | `KeyboardAvoidingView behavior="height"` activé sur Android |
| **Bouton retour mal positionné** | Sur appareils à grande encoche, le bouton retour était sous la status bar | `top: insets.top + 12` au lieu de `top: 12` hardcodé |
| **Libellés catégories tronqués (...)** | Noms longs affichés avec "..." | `adjustsFontSizeToFit` + `minimumFontScale={0.65}` sur le texte |
| **Bannières dans mauvaise catégorie** | Les bannières VIP s'affichaient aussi dans la vue sous-catégorie | Bannières masquées quand `activeSubId !== "all"` |
| **"Voir plus" mauvaise redirection** | Le bouton "Voir plus" / Près de chez vous pointait vers `"restauration"` hardcodé | Slug dérivé dynamiquement depuis l'API (`businessType === "restaurant"`) |
| **SERVICES hardcodés** | 4 tuiles de services écrites en dur dans `index.tsx` | Tableau `SERVICES` supprimé — les tuiles viennent de `/api/categories?type=service_shortcut` |
| **BANNER_IMAGES locaux** | Images de bannière en `require()` local dans `category/[slug].tsx` | Supprimé — `bannerImageUrl` (URL distante) depuis l'API |
| **Bouton retour sous la notch** | Sur appareils à grande encoche, le bouton retour était sous la status bar | `top: insets.top + 12` → `SafeAreaView` gère la zone sûre, `top: 12` relatif |
| **Structure login incorrecte** | `KeyboardAvoidingView` directement dans le `return` sans `SafeAreaView` | Hiérarchie `SafeAreaView → KeyboardAvoidingView → ScrollView` correcte |
