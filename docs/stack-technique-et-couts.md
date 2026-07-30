# Jatek — Stack Technique & Analyse des Coûts

> Document de référence technique et financier — Mis à jour : Avril 2026  
> Plateforme : Application mobile (iOS/Android) + PWA Web + API REST backend

---

## Table des matières

1. [Architecture globale](#1-architecture-globale)
2. [Backend / API](#2-backend--api)
3. [Base de données](#3-base-de-données)
4. [Application mobile (Expo)](#4-application-mobile-expo)
5. [PWA Web (React)](#5-pwa-web-react)
6. [Tableau de bord back-office](#6-tableau-de-bord-back-office)
7. [Authentification & OTP](#7-authentification--otp)
8. [Messagerie SMS & WhatsApp](#8-messagerie-sms--whatsapp)
9. [Email transactionnel](#9-email-transactionnel)
10. [Géolocalisation & Cartographie](#10-géolocalisation--cartographie)
11. [Notifications Push](#11-notifications-push)
12. [Stockage fichiers & médias](#12-stockage-fichiers--médias)
13. [Temps réel (Live Tracking)](#13-temps-réel-live-tracking)
14. [Infrastructure & Hébergement](#14-infrastructure--hébergement)
15. [Monitoring & Logs](#15-monitoring--logs)
16. [CDN & Sécurité réseau](#16-cdn--sécurité-réseau)
17. [Distribution App Store](#17-distribution-app-store)
18. [Tableau de coûts consolidés](#18-tableau-de-coûts-consolidés)
19. [Recommandations d'optimisation](#19-recommandations-doptimisation)

---

## 1. Architecture globale

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│  iOS App (Expo)  Android App (Expo)  PWA Web (React/Vite)  Back-office (React)│
└──────┬─────────────────┬─────────────────┬──────────────────────┬───────────┘
       │                 │                 │                      │
       └─────────────────┴─────────────────┴──────────────────────┘
                                     │ HTTPS / REST API + SSE
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        API SERVER (Express.js)                               │
│   Auth JWT │ OTP Twilio │ Drizzle ORM │ Pino Logger │ RBAC /api/backend/*   │
│   Replit Autoscale — Node.js 24 — TypeScript                                │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌──────────────┐  ┌──────────┐  ┌─────────────────────────┐
│  PostgreSQL  │  │ GCS / OS │  │  Services externes       │
│  (Replit DB) │  │ (Images) │  │  Twilio · Resend · Maps  │
└──────────────┘  └──────────┘  └─────────────────────────┘
```

**Flux de données principaux :**
- Client → API (REST JSON) via HTTPS
- Suivi en temps réel : Server-Sent Events (SSE, push serveur → client)
- OTP : Client demande → API génère → Twilio envoie SMS/WhatsApp
- Géolocalisation : expo-location / navigator.geolocation → API

---

## 2. Backend / API

| Composant | Technologie | Version | Rôle |
|-----------|-------------|---------|------|
| Runtime | **Node.js** | 24 LTS | Environnement d'exécution |
| Framework | **Express.js** | v5 | Routage HTTP, middleware |
| Langage | **TypeScript** | ~5.9 | Typage statique |
| ORM | **Drizzle ORM** | ^0.45 | Accès base de données |
| Validation | **Zod** | ^3.25 | Validation requêtes/réponses |
| Auth tokens | **jsonwebtoken** | ^9 | Génération JWT (30 j d'expiry) |
| Hachage mdp | **bcryptjs** | ^3 | Hachage passwords (coût 10) |
| Cookies | **cookie-parser** | ^1.4 | Gestion cookies HTTP |
| CORS | **cors** | ^2 | Politique cross-origin |
| Logger | **Pino** + pino-http | ^9 | Logs structurés JSON |
| Build prod | **esbuild** | ^0.27 | Compilation/bundling rapide |
| Spec API | **OpenAPI 3.0** | — | Documentation contrats API |
| Schémas partagés | **@workspace/api-zod** | local | Zod schemas générés depuis spec |

**Entités du domaine (tables exposées par l'API) :**

| Entité | Description |
|--------|-------------|
| `users` | Clients, livreurs, propriétaires, admins (7 rôles) |
| `restaurants` | Établissements avec profil légal (legalName, ICE) |
| `menuItems` | Plats avec prix, descriptions, photos |
| `orders` | Commandes (ref. JTK-YYMM-XXXXXX, kitchenCode 3 chiffres, pickupCode 4 chiffres) |
| `orderItems` | Lignes de commande (quantité, prix unitaire) |
| `drivers` | Profils livreurs (véhicule, zone) |
| `reviews` | Avis clients sur restaurants |
| `categories` | Catégories/sous-catégories (parentId, businessType, sortOrder, accentColor) |
| `ads` | Publicités : types `jatek_offer`, `vip_banner`, `promo_banner` |
| `shorts` | Contenu short-form vidéo/image lié à un restaurant |
| `otpCodes` | Codes OTP temporaires (TTL 5 min, 3 tentatives max) |
| `favorites` | Restaurants favoris par client |
| `addresses` | Adresses de livraison sauvegardées |
| `paymentMethods` | Méthodes de paiement (actuellement COD) |
| `supportTickets` | Tickets support client |
| `notificationPrefs` | Préférences notifications par utilisateur |
| `userConsents` | Consentements RGPD (horodatage + version politique) |
| `quotes` | Devis/estimations de prix livraison |
| `dashboardTodos` | Tâches/rappels dans le tableau de bord back-office |

---

## 3. Base de données

| Composant | Technologie | Détail |
|-----------|-------------|--------|
| SGBD | **PostgreSQL 16** | ACID, JSON natif, index partiels |
| Hébergement | **Replit Managed DB** | Sauvegarde automatique, HA |
| Migrations | **Drizzle Kit** (`db:push`) | Schema-first, pas de SQL manuel |
| Connexion | Connection pooling intégré | Replit gère le pool |

**Schéma de données critique :**
- Référence commande : `JTK-YYMM-XXXXXX` (format unique, indexé)
- Code cuisine : 3 chiffres aléatoires (impression ticket thermique)
- Code remise : 4 chiffres (validation remise colis livreur)
- Consentements RGPD : horodatage + version politique acceptée

---

## 4. Application mobile (Expo)

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | **Expo SDK** | ~54.0 |
| Core | **React Native** | 0.81.5 |
| Routing | **Expo Router** | ~6.0 |
| React | React 19 | 19.1.0 |
| Langue | TypeScript | ~5.9 |
| État serveur | **TanStack Query** | ^5 |
| Animations | **react-native-reanimated** | ~4.1 |
| Gestes | **react-native-gesture-handler** | ~2.28 |
| Géolocalisation | **expo-location** | ~19.0 |
| Images | **expo-image** | ~3.0 |
| Sélecteur photos | **expo-image-picker** | ~17.0 |
| Stockage sécurisé | **expo-secure-store** | ^55 |
| Async storage | @react-native-async-storage | 2.2.0 |
| WebView | react-native-webview | 13.15 |
| Icônes | @expo/vector-icons | ^15 |
| Polices | @expo-google-fonts/inter | ^0.4 |
| Haptics | expo-haptics | ~15.0 |
| Gradient | expo-linear-gradient | ~15.0 |
| SVG | react-native-svg | 15.12 |
| Clavier | react-native-keyboard-controller | 1.18.5 |

**Plateformes cibles :**
- iOS 15+ (iPhone, sans tablette)
- Android (API 23+, ACCESS_COARSE_LOCATION + ACCESS_FINE_LOCATION)

**Structure des écrans (Expo Router — file-based) :**

| Groupe | Écran | Description |
|--------|-------|-------------|
| `(auth)` | `login`, `otp`, `welcome` | Authentification OTP + onboarding adresse |
| `(tabs)` | `index`, `restaurants`, `favoris`, `orders`, `profile` | Navigation principale client |
| `(tabs)` | `deliver`, `manage` | Tabs conditionnels livreur / propriétaire |
| — | `restaurant/[id]` | Détail restaurant + menu |
| — | `category/[slug]` | Listing filtré par catégorie |
| — | `order/[id]` | Suivi commande live (SSE + carte) |
| — | `cart` | Panier + checkout |
| — | `quote/new` | Estimation de prix course |
| — | `driver-onboarding` | Profil conducteur obligatoire |
| — | `restaurant-onboarding` | Profil restaurant obligatoire |
| `profile/` | `info`, `addresses`, `payments`, `favorites`, `notifications`, `reorder`, `reviews`, `coupons`, `support`, `feedback`, `help`, `language`, `privacy`, `legal`, `report` | Sous-pages profil |

**Fonctionnalités clés mobiles :**
- Tabs rôle-conditionnels : Client / Livreur (`Livrer`) / Propriétaire (`Gérer`)
- Onboarding obligatoire avant opération (profil conducteur ou restaurant)
- Saisie code remise 4 chiffres (validation remise colis)
- Suivi commande live via SSE + carte Leaflet (WebView)
- OTP via Twilio SMS ou WhatsApp (fallback automatique)
- Gestion complète du profil (adresses, paiements, favoris, avis, notifications, etc.)
- Système de devis / estimation de course (quote/new)
- Navigation par catégorie (catégorie filtrée `category/[slug]`)

---

## 5. PWA Web (React)

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | **React** | 19.1.0 |
| Bundler | **Vite** | ^7 |
| UI Components | **shadcn/ui** + Radix | — |
| Styling | **Tailwind CSS v4** | ^4.1 |
| Animations | **Framer Motion** | ^12 |
| Requêtes | **TanStack Query** | ^5 |
| Formulaires | **react-hook-form** + Zod | — |
| Cartes | **Leaflet** + react-leaflet | ^1.9 / ^5 |
| Fond de carte | **OpenStreetMap** (tiles) | — |
| i18n | **i18next** + react-i18next | ^26 / ^17 |
| Détection langue | i18next-browser-languagedetector | ^8 |
| Langues | Français · Anglais · Arabe (RTL) | — |
| Theme | Hot pink `#E2006A` + Navy `#0A1B3D` | — |

**Fonctionnalités PWA :**
- Manifeste installable (icône, splash, thème couleur)
- Service Worker (mise en cache offline des assets statiques)
- Comptes démo intégrés (page login, onglet Email)

**Routes frontend (`food-delivery`) :**

| Route | Rôle |
|-------|------|
| `/`, `/restaurants` | Page d'accueil (restaurants, catégories, pubs) |
| `/restaurants/:id` | Détail restaurant + menu |
| `/cart` | Panier + checkout |
| `/orders`, `/orders/:id` | Historique commandes + suivi |
| `/rewards` | Programme fidélité (Bronze/Silver/Gold) |
| `/profile` | Profil utilisateur |
| `/login`, `/register`, `/forgot-password` | Authentification |
| `/legal` | CGU / mentions légales |
| `/welcome` | Onboarding adresse (fullscreen) |
| `/admin/*` | Interface admin intégrée (gated `AdminRoute`) |
| `/restaurant/dashboard`, `/restaurant/menu` | Panel propriétaire |
| `/driver/dashboard` | Panel livreur |

---

## 6. Tableau de bord back-office

Interface de gestion staff/admin (artifact `backend-dashboard`, preview path `/admin/`).

| Composant | Technologie | Détail |
|-----------|-------------|--------|
| Framework | **React 19** + Vite | Même stack que food-delivery |
| UI | **shadcn/ui** + Radix | Composants identiques, palette magenta Jatek |
| Routing | **wouter** | SPA, base path `/admin/` |
| Auth | JWT `localStorage["jatek_backend_token"]` | Séparé du token client |
| RBAC | 6 rôles | super_admin, admin, manager, restaurant_owner, employee, other |
| API | `GET|POST|PATCH|DELETE /api/backend/*` | Routes dédiées staff |

**Pages du dashboard :**

| Route | Accès | Description |
|-------|-------|-------------|
| `/` | Tous rôles | Dashboard KPI + chart commandes + todos |
| `/orders` | Tous rôles (scopé) | Gestion commandes |
| `/products` | admin, manager, owner | Items menu / produits |
| `/categories` | admin, manager | Catégories et sous-catégories |
| `/shops` | admin, manager | Restaurants et commerces |
| `/reviews` | admin, manager | Modération avis clients |
| `/customers` | admin, manager | Comptes clients |
| `/staff` | admin, super_admin | Comptes staff |
| `/deliverymen` | admin, manager | Comptes livreurs |
| `/roles` | super_admin | Rôles & permissions |
| `/settings` | admin, super_admin | Paramètres plateforme |
| `/promotions` | admin, manager | Promotions et publicités |
| `/wallets` | admin | Portefeuilles et paiements |
| `/notifications` | admin | Notifications push |
| `/reports` | admin, manager | Rapports et analytics |

> Note : Les colonnes "Accès" indiquent la politique enforced côté API (`/api/backend/*` dans `backend.ts`) — chaque endpoint vérifie le rôle et scope les données en conséquence. La navigation frontend est filtrée par l'UI mais la sécurité réelle est backend.

---

## 7. Authentification & OTP

| Mécanisme | Détail |
|-----------|--------|
| Type auth | JWT (Bearer token) — 30 jours d'expiration |
| Méthode principale | **SMS OTP** (6 chiffres, TTL 5 min) |
| Méthode alternative | **WhatsApp OTP** (même flow, fallback SMS auto) |
| Méthode admin/test | Email + mot de passe (bcrypt, coût 10) |
| Rate limiting OTP | 1 requête/minute max, 3 tentatives de vérification |
| Roles | `customer` · `driver` · `restaurant_owner` · `admin` · `manager` · `employee` · `super_admin` · `other` |
| RGPD | Consentement horodaté au register (`userConsents`) |
| Fallback WhatsApp | Si erreur Twilio 63007/63031 → bascule SMS automatiquement |

---

## 8. Messagerie SMS & WhatsApp

### Twilio (fournisseur actuel)

| Élément | Détail |
|---------|--------|
| SDK | `twilio` npm v5.13 |
| Auth | Account SID + Auth Token **ou** API Key SID + Secret |
| From number | +15072600620 (numéro US) |
| WhatsApp From | TWILIO_WHATSAPP_FROM (à configurer sur canal WhatsApp Business) |
| Fallback | SMS automatique si WhatsApp échoue |

#### Tarifs Twilio — SMS vers Maroc (+212)

| Volume messages | Prix unitaire | Total/mois |
|----------------|---------------|------------|
| 1 000 SMS | $0.088/SMS | $88.00 |
| 10 000 SMS | $0.088/SMS | $880.00 |
| 20 000 SMS | $0.088/SMS (volume discount possible) | $1 760.00 |

#### Tarifs Twilio — WhatsApp vers Maroc

| Type conversation | Prix unitaire | Commentaire |
|------------------|---------------|-------------|
| Initiée par client (OTP) | $0.0083/conv | Fenêtre 24h |
| Initiée par business | $0.0273/conv | Notifications proactives |
| Location du numéro US | $1.15/mois | Fixe |

> ⚠️ **Attention** : Avec un numéro US vers Maroc, le coût SMS Twilio est très élevé (~$0.088/SMS). Pour un usage production au Maroc, un **fournisseur SMS local** (voir section 18) peut réduire ce coût de 80 à 90 %.

#### Estimation OTP par palier (hypothèse : 1,5 OTP/MAU/mois, 60% SMS / 40% WhatsApp)

| Palier | SMS Twilio US | WhatsApp | Numéro | **Total OTP/mois** |
|--------|--------------|----------|--------|---------------------|
| 1 000 MAU | $79.20 | $4.98 | $1.15 | **$85.33** |
| 10 000 MAU | $792.00 | $49.80 | $1.15 | **$842.95** |
| 20 000 MAU | $1 584.00 | $99.60 | $1.15 | **$1 684.75** |

#### Alternative recommandée — Fournisseur SMS Maroc (ex. MarocTelecom SMS API, Youzan)

| Palier | SMS local ~$0.012/SMS | WhatsApp | **Total OTP/mois** |
|--------|-----------------------|----------|---------------------|
| 1 000 MAU | $10.80 | $4.98 | **$15.78** |
| 10 000 MAU | $108.00 | $49.80 | **$157.80** |
| 20 000 MAU | $216.00 | $99.60 | **$315.60** |

---

## 9. Email transactionnel

> **Resend** — Recommandé pour les notifications email (non encore intégré, prévu)

| Plan | Prix | Inclus |
|------|------|--------|
| Free | $0 | 3 000 emails/mois, 100/jour |
| Pro | $20/mois | 50 000 emails/mois |
| Scale | $90/mois | 200 000 emails/mois |
| Au-delà | $0.00029/email | Facturation à l'unité |

**Hypothèse : 10 emails/MAU/mois** (confirmation commande, code cuisine, reçu livraison, rappels)

| Palier | Emails/mois | Plan requis | **Coût/mois** |
|--------|------------|-------------|----------------|
| 1 000 MAU | 10 000 | Pro | **$20.00** |
| 10 000 MAU | 100 000 | Scale × 1 + 100k extra | **$120.00** |
| 20 000 MAU | 200 000 | Scale | **$90.00** |

---

## 10. Géolocalisation & Cartographie

### Stack actuelle

| Composant | Technologie | Coût |
|-----------|-------------|------|
| Rendu carte | **Leaflet.js** v1.9 | Gratuit (open-source) |
| Liaison React | **react-leaflet** v5 | Gratuit |
| Fond de carte (tiles) | **OpenStreetMap** | Gratuit (attribution requise) |
| Provider tiles prod | **MapTiler Cloud** | Voir tarifs ci-dessous |
| Géolocation mobile | **expo-location** | Gratuit (API système) |
| Géolocation web | `navigator.geolocation` | Gratuit (API navigateur) |
| Geocodage (adresse → coords) | **Nominatim** (OSM) | Gratuit, limité (1 req/s) |
| Geocodage production | **Google Maps Geocoding API** | Voir tarifs ci-dessous |

### MapTiler Cloud (fond de carte production)

| Plan | Prix/mois | Tiles inclus |
|------|-----------|--------------|
| Free | $0 | 100 000 tiles/mois |
| Standard | $25 | 500 000 tiles/mois |
| Premium | $100 | 2 500 000 tiles/mois |

**Estimation tiles/mois** (1 vue carte = ~30 tiles, sessions de suivi = 50 tiles) :

| Palier | Sessions carte/mois | **Tiles estimés** | Plan recommandé | **Coût** |
|--------|--------------------|--------------------|-----------------|----------|
| 1 000 MAU | 5 000 sessions | 175 000 | Standard | **$25** |
| 10 000 MAU | 50 000 sessions | 1 750 000 | Premium | **$100** |
| 20 000 MAU | 100 000 sessions | 3 500 000 | Premium × 1,4 | **$140** |

### Google Maps Geocoding API

| Tranche | Prix/1 000 req. | Crédit mensuel gratuit |
|---------|----------------|------------------------|
| 0 – 40 000 req. | $5.00 | $200 crédit (~40k req. gratuites) |
| 40 000 – 100 000 req. | $4.00 | — |
| 100 000+ req. | $3.00 | — |

**Estimation : 2 geocodages/commande, 5 commandes/MAU/mois**

| Palier | Geocodages/mois | Coût brut | Après crédit $200 | **Coût net** |
|--------|----------------|-----------|-------------------|--------------|
| 1 000 MAU | 10 000 | $50.00 | → $0 | **$0** |
| 10 000 MAU | 100 000 | $450.00 | → $250.00 | **$250** |
| 20 000 MAU | 200 000 | $850.00 | → $650.00 | **$650** |

> 💡 **Alternative** : Adresse Maroc → Nominatim (OSM) gratuit jusqu'à ~500k req./mois pour Maroc avec un serveur dédié ($20/mois), ou **Photon geocoder** (auto-hébergé, $0).

---

## 11. Notifications Push

| Service | Rôle | Coût |
|---------|------|------|
| **Expo Push Service** | Orchestration des tokens, envoi unifié iOS+Android | **Gratuit** |
| **Firebase Cloud Messaging (FCM)** | Notifications Android (via Expo) | **Gratuit** jusqu'à 1M/jour |
| **Apple Push Notification service (APNs)** | Notifications iOS (via Expo) | **Gratuit** (inclus Apple Dev) |
| **Apple Developer Program** | Compte requis pour distribuer sur App Store | **$99/an = $8.25/mois** |
| **Google Play Console** | Compte requis pour publier sur Play Store | **$25 (une seule fois)** |

> 💡 **Note** : expo-notifications n'est pas encore intégré dans l'app (SSE utilisé pour le web, prévu pour l'app native).

---

## 12. Stockage fichiers & médias

### Google Cloud Storage (actuel)

| Tier | Prix stockage | Prix opérations |
|------|--------------|-----------------|
| Standard | $0.020/GB/mois | $0.05/10 000 ops Class A |
| Nearline | $0.010/GB/mois | $0.10/10 000 ops |
| Free tier | **5 GB gratuits/mois** | 5 000 ops/mois |

**Estimation stockage** (images restaurants 500 KB moy., menus 200 KB, photos utilisateurs 300 KB) :

| Palier | Restaurants | Items menu | Photos users | **Total stockage** | **Coût/mois** |
|--------|-------------|------------|--------------|---------------------|----------------|
| 1 000 MAU | 20 restaurants | 200 items | 1 000 photos | ~0.6 GB | **$0** (free tier) |
| 10 000 MAU | 100 restaurants | 1 000 items | 5 000 photos | ~2.5 GB | **$0** (free tier) |
| 20 000 MAU | 200 restaurants | 2 000 items | 10 000 photos | ~5 GB | **$0–$0.10** |

> L'egress (téléchargement) depuis GCS est $0.08-0.12/GB. Avec un CDN devant (Cloudflare), l'egress GCS devient minimal car les images sont mises en cache.

---

## 13. Temps réel (Live Tracking)

| Technologie | Rôle | Coût |
|-------------|------|------|
| **Server-Sent Events (SSE)** | Push serveur → client pour statut commande | **$0** (intégré HTTP) |
| Connexion SSE persistante | ~30 sec timeout, reconnexion auto client | Coûte du CPU/RAM (inclus compute) |

> Le suivi GPS du livreur est actuellement côté mobile via expo-location. La position est envoyée à l'API qui relaie via SSE aux clients concernés.

**Alternatives pour 20k+ utilisateurs :**
- **Ably** : $0/mois jusqu'à 6M messages/mois, puis $35/mois (200 connexions simultanées)
- **Pusher Channels** : $0 jusqu'à 100 connexions/200k messages, puis $49/mois
- **WebSockets natifs** (socket.io) : auto-hébergé, coût compute uniquement

---

## 14. Infrastructure & Hébergement

### Replit Autoscale (actuel)

| Métrique | Tarif |
|----------|-------|
| vCPU-seconde | $0.000024 |
| GiB-seconde RAM | $0.0000025 |
| Egress réseau | $0.10/GB |
| Plan Core (requis) | $25/mois |

**Estimation compute API** (hypothèse : 30% d'uptime actif, scale-to-zero en inactivité) :

| Palier | vCPU moy. | RAM moy. | vCPU-sec/mois | RAM-sec/mois | **Compute** | **+ Core** | **Total hosting** |
|--------|-----------|----------|---------------|--------------|-------------|------------|-------------------|
| 1 000 MAU | 0.1 vCPU | 0.25 GB | 259 200 | 1 296 000 | $6.22 + $3.24 | $25 | **$34.46** |
| 10 000 MAU | 0.5 vCPU | 1 GB | 1 296 000 | 2 592 000 | $31.10 + $6.48 | $25 | **$62.58** |
| 20 000 MAU | 1.2 vCPU | 2 GB | 3 110 400 | 5 184 000 | $74.65 + $12.96 | $25 | **$112.61** |

> Le PWA statique est servi depuis Replit (inclus). Pour 20k+ utilisateurs, un CDN Cloudflare devant réduit significativement l'egress et la charge CPU.

### Base de données PostgreSQL (Replit Managed / Neon)

| Palier | Taille DB estimée | Plan | **Coût/mois** |
|--------|------------------|------|----------------|
| 1 000 MAU | ~300 MB | Inclus Core | **$0** |
| 10 000 MAU | ~2 GB | Neon Pro | **$19** |
| 20 000 MAU | ~5 GB | Neon Pro + storage | **$27** |

---

## 15. Monitoring & Logs

| Service | Usage | Plan gratuit | Plan payant | **Recommandé pour** |
|---------|-------|-------------|-------------|----------------------|
| **Logtail / BetterStack** | Logs Pino centralisés | 1 GB/mois | $25/mois (5 GB) | 1k–10k MAU |
| **Datadog** | APM, logs, alertes | 14j trial | $15/host/mois | 20k+ MAU |
| **Sentry** | Erreurs runtime front+back | 5k events/mois | $26/mois | Tous paliers |
| **UptimeRobot** | Uptime monitoring (HTTP ping) | 50 moniteurs | $7/mois (pro) | Tous paliers |
| **Papertrail** | Logs simples | 100 MB/mois | $7/mois | 1k MAU |

**Budget monitoring recommandé par palier :**

| Palier | Sentry | Logs | Uptime | **Total monitoring** |
|--------|--------|------|--------|----------------------|
| 1 000 MAU | $0 | $0 | $0 | **$0** |
| 10 000 MAU | $26 | $25 | $7 | **$58** |
| 20 000 MAU | $26 | $25 | $7 | **$58** |

---

## 16. CDN & Sécurité réseau

| Service | Usage | Plan | **Coût** |
|---------|-------|------|----------|
| **Cloudflare Free** | CDN, DDoS, SSL, cache assets | Free | **$0** |
| **Cloudflare Pro** | WAF avancé, règles custom, analytics | $20/mois | $20 |
| **SSL/TLS** | Certificat HTTPS (Let's Encrypt via Cloudflare) | Gratuit | **$0** |
| **Domaine** (ex. jatek.ma) | Nom de domaine .ma / .com | ~$15/an | **$1.25/mois** |

> Le domaine actuel `jatek.straight-path.eu` peut être remplacé par `jatek.ma` (~15€/an via registrar marocain).

---

## 17. Distribution App Store

| Plateforme | Frais | Type | Récurrence |
|------------|-------|------|------------|
| Apple App Store | **$99/an** | Apple Developer Program (requis) | Annuel |
| Google Play Store | **$25** | Frais d'inscription | **Une seule fois** |
| Commission App Store (IAP) | **30%** premier an, **15%** ensuite | Sur achats in-app | Par transaction |
| Commission Google Play | **15%** premiers $1M, **30%** au-delà | Sur achats in-app | Par transaction |

> Pour Jatek (livraison), les paiements sont traités hors store (COD ou Stripe direct) → **0% de commission plateforme**.

---

## 18. Tableau de coûts consolidés

### 📊 Récapitulatif par palier

#### Palier 1 — 1 000 utilisateurs actifs/mois

| Composant | Service | Coût/mois |
|-----------|---------|-----------|
| Hébergement API | Replit Autoscale + Core | $34.46 |
| Base de données | Replit PostgreSQL | $0.00 |
| Stockage fichiers | Google Cloud Storage | $0.00 |
| **OTP SMS/WhatsApp** | **Twilio (US → Maroc)** | **$85.33** |
| **OTP SMS/WhatsApp** | **Alternative locale** | **$15.78** |
| Email transactionnel | Resend Pro | $20.00 |
| Cartes (fond de carte) | MapTiler Standard | $25.00 |
| Geocodage | Google Maps API | $0.00 |
| Notifications push | Expo + FCM + APNs | $0.00 |
| Monitoring & Logs | Free tiers | $0.00 |
| CDN & SSL | Cloudflare Free | $0.00 |
| Domaine | jatek.ma | $1.25 |
| Apple Developer | Amorti/mois | $8.25 |
| Google Play | Amorti/mois | $0.07 |
| **TOTAL (avec Twilio US)** | | **$174.36** |
| **TOTAL (avec SMS local)** | | **$104.81** |

---

#### Palier 2 — 10 000 utilisateurs actifs/mois

| Composant | Service | Coût/mois |
|-----------|---------|-----------|
| Hébergement API | Replit Autoscale + Core | $62.58 |
| Base de données | Neon/Replit Pro | $19.00 |
| Stockage fichiers | Google Cloud Storage | $0.00 |
| **OTP SMS/WhatsApp** | **Twilio (US → Maroc)** | **$842.95** |
| **OTP SMS/WhatsApp** | **Alternative locale** | **$157.80** |
| Email transactionnel | Resend Scale | $120.00 |
| Cartes (fond de carte) | MapTiler Premium | $100.00 |
| Geocodage | Google Maps API | $250.00 |
| Notifications push | Expo + FCM + APNs | $0.00 |
| Monitoring & Logs | Sentry + Logtail + Uptime | $58.00 |
| CDN & SSL | Cloudflare Free | $0.00 |
| Domaine | jatek.ma | $1.25 |
| Apple Developer | Amorti/mois | $8.25 |
| Google Play | Amorti/mois | $0.07 |
| **TOTAL (avec Twilio US)** | | **$1 462.10** |
| **TOTAL (avec SMS local)** | | **$776.95** |

---

#### Palier 3 — 20 000 utilisateurs actifs/mois

| Composant | Service | Coût/mois |
|-----------|---------|-----------|
| Hébergement API | Replit Autoscale + Core | $112.61 |
| Base de données | Neon/Replit Pro + storage | $27.00 |
| Stockage fichiers | Google Cloud Storage | $0.10 |
| **OTP SMS/WhatsApp** | **Twilio (US → Maroc)** | **$1 684.75** |
| **OTP SMS/WhatsApp** | **Alternative locale** | **$315.60** |
| Email transactionnel | Resend Scale | $90.00 |
| Cartes (fond de carte) | MapTiler Premium | $140.00 |
| Geocodage | Google Maps API | $650.00 |
| Notifications push | Expo + FCM + APNs | $0.00 |
| Monitoring & Logs | Sentry + Logtail + Uptime | $58.00 |
| CDN & SSL | Cloudflare Pro | $20.00 |
| Domaine | jatek.ma | $1.25 |
| Apple Developer | Amorti/mois | $8.25 |
| Google Play | Amorti/mois | $0.07 |
| **TOTAL (avec Twilio US)** | | **$2 792.03** |
| **TOTAL (avec SMS local)** | | **$1 422.88** |

---

### 📈 Synthèse visuelle

```
Coût mensuel total estimé (avec fournisseur SMS local)
──────────────────────────────────────────────────────
1 000 MAU  ██░░░░░░░░░░░░░░░░░░░░  ~$105/mois
10 000 MAU ████████████░░░░░░░░░░  ~$777/mois
20 000 MAU ██████████████████████  ~$1 423/mois

Coût mensuel total estimé (avec Twilio US)
──────────────────────────────────────────────────────
1 000 MAU  ███░░░░░░░░░░░░░░░░░░░  ~$174/mois
10 000 MAU ████████████████████░░  ~$1 462/mois
20 000 MAU ██████████████████████  ~$2 792/mois
```

### 💰 Coût par utilisateur actif (ARPU coût infra)

| Palier | SMS local | SMS Twilio US |
|--------|-----------|---------------|
| 1 000 MAU | **$0.105/MAU** | $0.174/MAU |
| 10 000 MAU | **$0.078/MAU** | $0.146/MAU |
| 20 000 MAU | **$0.071/MAU** | $0.140/MAU |

---

## 19. Recommandations d'optimisation

### 🔴 Priorité haute — SMS (économie potentielle : 80–90%)

**Remplacer Twilio US par un agrégateur SMS marocain :**

| Fournisseur | Couverture | Prix Maroc | API |
|-------------|------------|-----------|-----|
| **Attijari SMS** | Maroc (opérateurs locaux) | ~0.10–0.15 MAD/SMS ($0.01) | REST |
| **MarocTelecom SMS API** | Maroc | ~0.12 MAD/SMS | REST |
| **Infobip** | International + Maroc | ~$0.02/SMS | REST |
| **MessageBird** | International | ~$0.025/SMS Maroc | REST |
| **Africa's Talking** | Afrique + Maroc | ~$0.02/SMS | REST |

> L'API `sendSms()` dans `artifacts/api-server/src/routes/auth.ts` est déjà abstraite — il suffit de changer le client HTTP (1 fichier).

### 🟡 Priorité moyenne — Géolocalisation (économie à 10k+ MAU)

**Geocodage auto-hébergé avec Photon (OSM) :**
- Serveur Photon sur VPS $20/mois → géocodage illimité
- Économise $250–650/mois à 10k–20k MAU
- Compatible avec les adresses marocaines (données OSM Maroc complètes)

**Tiles auto-hébergés avec PMTiles + Cloudflare Workers :**
- Fichier PMTiles Maroc (~500 MB) sur GCS
- Cloudflare Workers pour servir → ~$0.50/mois vs $100+/mois MapTiler

### 🟢 Priorité basse — Notifications push natives

**Ajouter expo-notifications pour remplacer SSE en background :**
```
pnpm --filter @workspace/jatek-mobile add expo-notifications
```
- Coût : $0 (FCM + APNs gratuits)
- Avantage : notifications même app fermée

### 📱 Publication App Store — Planning

| Étape | Durée | Coût |
|-------|-------|------|
| Build EAS (Expo Application Services) | 1–2h | $0 (free tier) |
| Review Apple App Store | 1–3 jours | $0 (inclus $99/an) |
| Review Google Play | 1–7 jours | $0 (inclus $25) |
| Certificat distribution iOS | Inclus | $0 |
| Provisioning Profile | Inclus | $0 |

### 🛡️ RGPD — Checklist opérationnel

- [x] Table `userConsents` avec horodatage et version
- [x] Consentement capturé au register
- [x] OTP TTL 5 min, suppression automatique par expiry
- [ ] Endpoint `DELETE /users/me` (suppression compte RGPD)
- [ ] Export données utilisateur `GET /users/me/export`
- [ ] Politique de confidentialité page in-app
- [ ] Mise à jour CGU avec consentement versionné

---

*Document généré depuis le codebase Jatek — Version monorepo pnpm, Node.js 24, Expo SDK 54 — 4 artifacts : food-delivery, backend-dashboard, jatek-mobile, api-server*
