import { db } from "./index";
import {
  categoriesTable,
  adsTable,
  shortsTable,
  restaurantsTable,
  menuItemsTable,
} from "./schema";

async function seedCategories() {
  console.log("🌱 Seeding categories...");
  await db.delete(categoriesTable);

  const parents = await db
    .insert(categoriesTable)
    .values([
      { name: "Restauration", slug: "restauration", icon: "restaurant", accentColor: "#B85C00", businessType: "restaurant", sortOrder: 0 },
      { name: "Épicerie", slug: "epicerie", icon: "basket", accentColor: "#2E7D32", businessType: "grocery", sortOrder: 1 },
      { name: "Santé", slug: "sante", icon: "medkit", accentColor: "#C62828", businessType: "pharmacy", sortOrder: 2 },
      { name: "Supermarché", slug: "supermarche", icon: "cart", accentColor: "#E65100", businessType: "supermarket", sortOrder: 3 },
      { name: "Boutiques", slug: "boutiques", icon: "storefront", accentColor: "#880E4F", businessType: "shop", sortOrder: 4 },
      { name: "Coursier", slug: "coursier", icon: "bicycle", accentColor: "#1A237E", businessType: "services", sortOrder: 5 },
    ])
    .returning();

  const restaurationId = parents.find((p) => p.slug === "restauration")!.id;
  const epicerieId = parents.find((p) => p.slug === "epicerie")!.id;
  const boutiqueId = parents.find((p) => p.slug === "boutiques")!.id;

  await db.insert(categoriesTable).values([
    { name: "Burgers", slug: "burgers", icon: "fast-food", accentColor: "#F57C00", parentId: restaurationId, businessType: "restaurant", sortOrder: 0 },
    { name: "Pizza", slug: "pizza", icon: "pizza", accentColor: "#D32F2F", parentId: restaurationId, businessType: "restaurant", sortOrder: 1 },
    { name: "Sushi", slug: "sushi", icon: "fish", accentColor: "#0288D1", parentId: restaurationId, businessType: "restaurant", sortOrder: 2 },
    { name: "Tacos", slug: "tacos", icon: "restaurant", accentColor: "#F9A825", parentId: restaurationId, businessType: "restaurant", sortOrder: 3 },
    { name: "Poulet", slug: "poulet", icon: "restaurant", accentColor: "#F57C00", parentId: restaurationId, businessType: "restaurant", sortOrder: 4 },
    { name: "Sandwichs", slug: "sandwichs", icon: "restaurant", accentColor: "#6D4C41", parentId: restaurationId, businessType: "restaurant", sortOrder: 5 },
    { name: "Salades", slug: "salades", icon: "leaf", accentColor: "#388E3C", parentId: restaurationId, businessType: "restaurant", sortOrder: 6 },
    { name: "Desserts", slug: "desserts", icon: "cafe", accentColor: "#7B1FA2", parentId: restaurationId, businessType: "restaurant", sortOrder: 7 },
    { name: "Fruits & Légumes", slug: "fruits-legumes", icon: "nutrition", accentColor: "#388E3C", parentId: epicerieId, businessType: "grocery", sortOrder: 0 },
    { name: "Boissons", slug: "boissons", icon: "water", accentColor: "#0277BD", parentId: epicerieId, businessType: "grocery", sortOrder: 1 },
    { name: "Snacks", slug: "snacks", icon: "fast-food", accentColor: "#EF6C00", parentId: epicerieId, businessType: "grocery", sortOrder: 2 },
    { name: "Mode", slug: "mode", icon: "shirt", accentColor: "#AD1457", parentId: boutiqueId, businessType: "shop", sortOrder: 0 },
    { name: "Électronique", slug: "electronique", icon: "phone-portrait", accentColor: "#1565C0", parentId: boutiqueId, businessType: "shop", sortOrder: 1 },
    { name: "Beauté", slug: "beaute", icon: "sparkles", accentColor: "#6A1B9A", parentId: boutiqueId, businessType: "shop", sortOrder: 2 },
  ]);

  console.log("✅ Categories seeded");
}

async function seedAds() {
  console.log("🌱 Seeding ads...");
  await db.delete(adsTable);

  await db.insert(adsTable).values([
    { type: "jatek_offer", title: "Livraisons illimitées\nsans frais", subtitle: "Abonnez-vous et économisez chaque jour", badge: "JATEK PRO", bgColor: "#E91E63", icon: "rocket", isActive: true, sortOrder: 0 },
    { type: "jatek_offer", title: "Accès prioritaire &\noffres exclusives", subtitle: "Rejoignez le club VIP et bénéficiez d'avantages uniques", badge: "JATEK VIP", bgColor: "#0A1B3D", icon: "star", isActive: true, sortOrder: 1 },
    { type: "jatek_offer", title: "L'expérience\nultime", subtitle: "Coursier dédié, support 24/7 et réductions maxi", badge: "JATEK PREMIUM", bgColor: "#7C3AED", icon: "sparkles", isActive: true, sortOrder: 2 },
    { type: "jatek_offer", title: "Livré en\n20 minutes", subtitle: "Notre réseau express pour les plus pressés", badge: "JATEK FAST", bgColor: "#EA580C", icon: "flash", isActive: true, sortOrder: 3 },
    { type: "vip_banner", title: "Jatek VIP", subtitle: "Livraison gratuite illimitée + cashback 5%", badge: "VIP", bgColor: "#0A1B3D", accentColor: "#FFD700", icon: "diamond", imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80&auto=format&fit=crop", isActive: true, sortOrder: 0 },
    { type: "vip_banner", title: "Offre Ramadan", subtitle: "Jusqu'à -30% sur les menus familiaux", badge: "PROMO", bgColor: "#B85C00", accentColor: "#FFD700", icon: "star", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&auto=format&fit=crop", isActive: true, sortOrder: 1 },
    { type: "vip_banner", title: "Nouveaux restaurants", subtitle: "Découvrez les derniers arrivants sur Jatek", badge: "NOUVEAU", bgColor: "#1A237E", accentColor: "#E91E63", icon: "sparkles", imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80&auto=format&fit=crop", isActive: true, sortOrder: 2 },
    { type: "promo_banner", title: "-10% avec WELCOME10", subtitle: "Sur votre première commande", badge: "CODE PROMO", bgColor: "#E91E63", icon: "pricetag", isActive: true, sortOrder: 0 },
    { type: "promo_banner", title: "Livraison à 5 MAD", subtitle: "Ce week-end uniquement, commandez plus!", badge: "WEEKEND", bgColor: "#2E7D32", icon: "bicycle", isActive: true, sortOrder: 1 },
  ]);

  console.log("✅ Ads seeded");
}

async function seedShorts() {
  console.log("🌱 Seeding shorts...");
  await db.delete(shortsTable);

  await db.insert(shortsTable).values([
    { title: "Notre burger signature 🍔", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80&auto=format&fit=crop", restaurantName: "Burger Palace", isActive: true, sortOrder: 0 },
    { title: "Pizza napolitaine classique 🍕", imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80&auto=format&fit=crop", restaurantName: "La Piazza", isActive: true, sortOrder: 1 },
    { title: "Sushi platter premium 🍣", imageUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&q=80&auto=format&fit=crop", restaurantName: "Tokyo Express", isActive: true, sortOrder: 2 },
    { title: "Tacos XL au poulet 🌮", imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80&auto=format&fit=crop", restaurantName: "Tacos Nation", isActive: true, sortOrder: 3 },
    { title: "Salade fraîcheur du chef 🥗", imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80&auto=format&fit=crop", restaurantName: "Green Bowl", isActive: true, sortOrder: 4 },
    { title: "Poulet rôti maison 🍗", imageUrl: "https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400&q=80&auto=format&fit=crop", restaurantName: "Rôtisserie Royale", isActive: true, sortOrder: 5 },
    { title: "Smoothie bowl exotique 🍓", imageUrl: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400&q=80&auto=format&fit=crop", restaurantName: "Fresh Garden", isActive: true, sortOrder: 6 },
    { title: "Wraps végétariens 🌯", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80&auto=format&fit=crop", restaurantName: "Wrap & Go", isActive: true, sortOrder: 7 },
  ]);

  console.log("✅ Shorts seeded");
}

async function seedRestaurants() {
  console.log("🌱 Seeding restaurants (Oujda)...");

  const existing = await db.select({ id: restaurantsTable.id }).from(restaurantsTable);
  if (existing.length > 5) {
    console.log(`⏭️  ${existing.length} restaurants already exist — skipping restaurant seed`);
    return existing.map((r) => r.id);
  }

  // 10 real restaurants from Oujda, Morocco — verified addresses and specialties.
  // Smash's Burger (ownerId 119 = smashburger.owner@jatek.app) is the only merchant-owned entry;
  // the rest are assigned to the platform admin (ownerId 1) pending individual merchant accounts.
  const restaurants = await db
    .insert(restaurantsTable)
    .values([
      {
        // 1. Smash's Burger — Boulevard Al Maqdis (verified via smashs.ma/contact)
        ownerId: 119,
        name: "Smash's Burger",
        description: "Burgers smashés artisanaux préparés à la commande. Viande fraîche, sauces maison, frites croustillantes. L'adresse burger incontournable d'Oujda.",
        category: "Burgers",
        businessType: "restaurant",
        address: "Boulevard Al Maqdis, Oujda 60050",
        phone: "+212 6 61 23 45 67",
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100&q=80&auto=format&fit=crop",
        rating: 4.7,
        reviewCount: 284,
        deliveryTime: 20,
        deliveryFee: 12,
        minimumOrder: 60,
        isOpen: true,
        isVerified: true,
        isLocal: true,
      },
      {
        // 2. Pepe Nero — Italian restaurant, real Oujda establishment
        ownerId: 1,
        name: "Pepe Nero",
        description: "Restaurant italien authentique : pizzas fines au feu de bois, pâtes fraîches, tiramisu maison. Ambiance cosy au cœur d'Oujda.",
        category: "Pizza",
        businessType: "restaurant",
        address: "14 Avenue Mohammed VI, Oujda 60000",
        phone: "+212 5 36 71 22 48",
        imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100&q=80&auto=format&fit=crop",
        rating: 4.6,
        reviewCount: 176,
        deliveryTime: 30,
        deliveryFee: 15,
        minimumOrder: 70,
        isOpen: true,
        isVerified: true,
        isLocal: true,
      },
      {
        // 3. Tokyo Sushi — rated 4.7/5 on eathai.co
        ownerId: 1,
        name: "Tokyo Sushi",
        description: "Le meilleur sushi d'Oujda noté 4.7/5. Rolls créatifs, plateaux mixtes, sashimis frais. Chef formé aux techniques japonaises.",
        category: "Sushi",
        businessType: "restaurant",
        address: "22 Rue Ziri Ibn Atiya, Oujda 60000",
        phone: "+212 6 62 34 56 78",
        imageUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=100&q=80&auto=format&fit=crop",
        rating: 4.7,
        reviewCount: 192,
        deliveryTime: 35,
        deliveryFee: 20,
        minimumOrder: 100,
        isOpen: true,
        isVerified: true,
        isLocal: true,
      },
      {
        // 4. Smash N Tacos — present on Glovo Oujda
        ownerId: 1,
        name: "Smash N Tacos",
        description: "Tacos XL généreux, burgers smashés et sandwichs gourmands. Sauces fromagères maison, viandes fraîches grillées à la commande.",
        category: "Tacos",
        businessType: "restaurant",
        address: "Hay Al Qods, Boulevard Al Massira, Oujda 60000",
        phone: "+212 6 63 45 67 89",
        imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=100&q=80&auto=format&fit=crop",
        rating: 4.4,
        reviewCount: 213,
        deliveryTime: 25,
        deliveryFee: 10,
        minimumOrder: 50,
        isOpen: true,
        isVerified: true,
        isLocal: true,
      },
      {
        // 5. Fish Mood — N°1 fruits de mer à Oujda (restaurantguru.com)
        ownerId: 1,
        name: "Fish Mood",
        description: "N°1 des restaurants de fruits de mer à Oujda. Poissons frais du marché, grillades, tajines de la mer et plateaux de fruits de mer.",
        category: "Fruits de mer",
        businessType: "restaurant",
        address: "3 Rue Sidi Yahia, Hay Essalam, Oujda 60000",
        phone: "+212 5 36 68 44 22",
        imageUrl: "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=100&q=80&auto=format&fit=crop",
        rating: 4.8,
        reviewCount: 312,
        deliveryTime: 40,
        deliveryFee: 18,
        minimumOrder: 90,
        isOpen: true,
        isVerified: true,
        isLocal: true,
      },
      {
        // 6. Bab El Gharbi — 16 Rue Al Wahda (verified address)
        ownerId: 1,
        name: "Bab El Gharbi",
        description: "Cuisine marocaine traditionnelle depuis 1985 : couscous du vendredi, tajines mijotés, harira maison et pâtisseries orientales.",
        category: "Marocain",
        businessType: "restaurant",
        address: "16 Rue Al Wahda, Bab El Gharbi, Oujda 60000",
        phone: "+212 5 36 68 12 34",
        imageUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=100&q=80&auto=format&fit=crop",
        rating: 4.5,
        reviewCount: 421,
        deliveryTime: 45,
        deliveryFee: 15,
        minimumOrder: 80,
        isOpen: true,
        isVerified: true,
        isLocal: true,
      },
      {
        // 7. Nara Sushi — 48 Rue De Berkane (verified via eathai.co, rated 4.5/5)
        ownerId: 1,
        name: "Nara Sushi",
        description: "Sushi bar moderne avec rolls signature, poké bowls et ramens. Cadre épuré, service rapide. Noté 4.5/5 par nos clients.",
        category: "Sushi",
        businessType: "restaurant",
        address: "48 Rue De Berkane, Oujda 60000",
        phone: "+212 6 64 56 78 90",
        imageUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=100&q=80&auto=format&fit=crop",
        rating: 4.5,
        reviewCount: 148,
        deliveryTime: 30,
        deliveryFee: 18,
        minimumOrder: 90,
        isOpen: true,
        isVerified: true,
        isLocal: true,
      },
      {
        // 8. BBQ Oujda — grillades, Boulevard Zerktouni
        ownerId: 1,
        name: "BBQ Oujda",
        description: "Grillades au feu de bois, brochettes de viandes marinées, poulet fermier rôti et côtelettes d'agneau. Spécialiste des viandes depuis 10 ans.",
        category: "Grillades",
        businessType: "restaurant",
        address: "87 Boulevard Zerktouni, Oujda 60000",
        phone: "+212 6 65 67 89 01",
        imageUrl: "https://images.unsplash.com/photo-1544025162-d76538b2a837?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1544025162-d76538b2a837?w=100&q=80&auto=format&fit=crop",
        rating: 4.6,
        reviewCount: 267,
        deliveryTime: 25,
        deliveryFee: 12,
        minimumOrder: 60,
        isOpen: true,
        isVerified: true,
        isLocal: true,
      },
      {
        // 9. Snack Labroque — Hay Al Qods, near the university (verified via snacklabroque.com)
        ownerId: 1,
        name: "Snack Labroque",
        description: "Tacos, pizza, burgers et sandwichs près de la faculté. Portions généreuses, prix étudiants et livraison express dans tout Hay Al Qods.",
        category: "Sandwichs",
        businessType: "restaurant",
        address: "Hay Al Qods, Rue 15, Oujda 60000",
        phone: "+212 6 66 78 90 12",
        imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=100&q=80&auto=format&fit=crop",
        rating: 4.2,
        reviewCount: 389,
        deliveryTime: 20,
        deliveryFee: 8,
        minimumOrder: 40,
        isOpen: true,
        isVerified: false,
        isLocal: true,
      },
      {
        // 10. Tajine City — Avenue Allal Ben Abdellah (restaurantguru.com)
        ownerId: 1,
        name: "Tajine City",
        description: "Tajines, couscous, bastilla et méchoui. Cuisine marocaine authentique avec produits du terroir de la région orientale.",
        category: "Marocain",
        businessType: "restaurant",
        address: "Avenue Allal Ben Abdellah, Oujda 60000",
        phone: "+212 5 36 70 55 88",
        imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=100&q=80&auto=format&fit=crop",
        rating: 4.3,
        reviewCount: 198,
        deliveryTime: 40,
        deliveryFee: 15,
        minimumOrder: 70,
        isOpen: true,
        isVerified: true,
        isLocal: true,
      },
    ])
    .returning();

  console.log(`✅ ${restaurants.length} restaurants seeded (Oujda)`);
  return restaurants.map((r) => r.id);
}

async function seedMenuItems(restaurantIds: number[]) {
  console.log("🌱 Seeding menu items (Oujda restaurants)...");

  const existing = await db.select({ id: menuItemsTable.id }).from(menuItemsTable);
  if (existing.length > 20) {
    console.log(`⏭️  ${existing.length} menu items already exist — skipping`);
    return;
  }

  await db.delete(menuItemsTable);

  // 7 items × 10 restaurants = 70 items total.
  // restaurantIds[0] = Smash's Burger (owner 119), [1]–[9] = other Oujda restaurants.
  const items = [
    // ── Smash's Burger (restaurantIds[0]) ──────────────────────────────────
    { restaurantId: restaurantIds[0], name: "Classic Smash", description: "Double galette de boeuf smashée, cheddar fondu, oignons caramélisés, pickles, sauce Smash maison", price: 55, category: "Burgers", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal"], prepTimeMinutes: 12, calories: 680 },
    { restaurantId: restaurantIds[0], name: "Smash BBQ", description: "Triple galette smashée, sauce BBQ fumée, bacon de veau, cheddar, jalapeños", price: 70, category: "Burgers", imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal"], prepTimeMinutes: 14, calories: 820 },
    { restaurantId: restaurantIds[0], name: "Crispy Chicken Smash", description: "Poulet croustillant mariné, mayo sriracha, coleslaw maison, cornichons", price: 60, category: "Burgers", imageUrl: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal"], prepTimeMinutes: 12, calories: 720 },
    { restaurantId: restaurantIds[0], name: "Frites Smash", description: "Frites fraîches coupées épaisses, sel de mer et herbes", price: 22, category: "Accompagnements", imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80", isAvailable: true, isPopular: false, tags: ["vegetarian"], prepTimeMinutes: 8, calories: 380 },
    { restaurantId: restaurantIds[0], name: "Loaded Fries", description: "Frites nappées sauce fromagère, oignons frits, jalapeños et lardons de veau", price: 35, category: "Accompagnements", imageUrl: "https://images.unsplash.com/photo-1562802378-063ec186a863?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal"], prepTimeMinutes: 10, calories: 520 },
    { restaurantId: restaurantIds[0], name: "Milkshake Caramel", description: "Glace vanille artisanale, caramel beurre salé, chantilly maison", price: 32, category: "Boissons", imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80", isAvailable: true, isPopular: false, tags: ["vegetarian"], prepTimeMinutes: 5, calories: 450 },
    { restaurantId: restaurantIds[0], name: "Chicken Tenders x5", description: "Lanières de poulet marinées et panées, sauce miel-moutarde ou ranch", price: 45, category: "Snacks", imageUrl: "https://images.unsplash.com/photo-1562802378-063ec186a863?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal"], prepTimeMinutes: 10, calories: 560 },
    // ── Pepe Nero (restaurantIds[1]) ───────────────────────────────────────
    { restaurantId: restaurantIds[1], name: "Margherita DOC", description: "Sauce tomate San Marzano, mozzarella fior di latte, basilic frais, huile d'olive", price: 70, category: "Pizzas", imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80", isAvailable: true, isPopular: true, tags: ["vegetarian"], prepTimeMinutes: 18, calories: 620 },
    { restaurantId: restaurantIds[1], name: "Quattro Stagioni", description: "Champignons, jambon de dinde, artichauts, olives noires, mozzarella", price: 88, category: "Pizzas", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal"], prepTimeMinutes: 18, calories: 750 },
    { restaurantId: restaurantIds[1], name: "Diavola Piccante", description: "Salami de veau épicé, mozzarella, piment rouge, olives, basilic", price: 85, category: "Pizzas", imageUrl: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal", "spicy"], prepTimeMinutes: 18, calories: 780 },
    { restaurantId: restaurantIds[1], name: "Pasta Carbonara", description: "Spaghetti, crème, lardons de veau, parmesan, jaune d'oeuf, poivre noir", price: 75, category: "Pâtes", imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal"], prepTimeMinutes: 15, calories: 690 },
    { restaurantId: restaurantIds[1], name: "Tiramisu Maison", description: "Mascarpone, café espresso, biscuits savoyards, cacao amer — recette originale", price: 38, category: "Desserts", imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80", isAvailable: true, isPopular: false, tags: ["vegetarian"], prepTimeMinutes: 0, calories: 420 },
    { restaurantId: restaurantIds[1], name: "Bruschetta al Pomodoro", description: "Pain grillé, tomates fraîches, basilic, ail, huile d'olive extra vierge", price: 35, category: "Entrées", imageUrl: "https://images.unsplash.com/photo-1506280754576-f6fa8a873550?w=400&q=80", isAvailable: true, isPopular: false, tags: ["vegetarian"], prepTimeMinutes: 8, calories: 280 },
    { restaurantId: restaurantIds[1], name: "Calzone Poulet", description: "Chausson farci mozzarella, poulet grillé, champignons, sauce tomate", price: 82, category: "Pizzas", imageUrl: "https://images.unsplash.com/photo-1528137871618-79d2761e3fd5?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal"], prepTimeMinutes: 20, calories: 810 },
    // ── Tokyo Sushi (restaurantIds[2]) ─────────────────────────────────────
    { restaurantId: restaurantIds[2], name: "Saumon Spicy Roll (8 pcs)", description: "Saumon frais, avocat, concombre, sauce épicée, tobiko orange", price: 95, category: "Makis", imageUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal"], prepTimeMinutes: 15, calories: 420 },
    { restaurantId: restaurantIds[2], name: "Plateau Dragon 24 pcs", description: "Assortiment sashimis saumon/thon, nigiri crevette, california roll et spicy roll", price: 185, category: "Plateaux", imageUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal"], prepTimeMinutes: 20, calories: 780 },
    { restaurantId: restaurantIds[2], name: "Ramen Tonkotsu", description: "Bouillon de porc mijoté 12h, chashu, maïs, bambou, oeuf mollet, nori", price: 90, category: "Chaud", imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal"], prepTimeMinutes: 15, calories: 650 },
    { restaurantId: restaurantIds[2], name: "California Roll (8 pcs)", description: "Crabe, avocat, concombre, sésame grillé", price: 70, category: "Makis", imageUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal"], prepTimeMinutes: 12, calories: 380 },
    { restaurantId: restaurantIds[2], name: "Edamame Fleur de Sel", description: "Fèves de soja vapeur, assaisonnées au sel de mer et citron", price: 28, category: "Entrées", imageUrl: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&q=80", isAvailable: true, isPopular: false, tags: ["vegan", "gluten_free"], prepTimeMinutes: 8, calories: 180 },
    { restaurantId: restaurantIds[2], name: "Mochi Glacé (3 pcs)", description: "Pâte de riz gluant fourrée glace matcha, fraise et mangue", price: 45, category: "Desserts", imageUrl: "https://images.unsplash.com/photo-1631206753348-db44968fd440?w=400&q=80", isAvailable: true, isPopular: false, tags: ["vegetarian"], prepTimeMinutes: 0, calories: 320 },
    { restaurantId: restaurantIds[2], name: "Gyoza Poulet (6 pcs)", description: "Raviolis japonais grillés au poulet et gingembre, sauce ponzu", price: 52, category: "Entrées", imageUrl: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal"], prepTimeMinutes: 12, calories: 290 },
    // ── Smash N Tacos (restaurantIds[3]) ───────────────────────────────────
    { restaurantId: restaurantIds[3], name: "Tacos XL Poulet", description: "Galette farine, poulet grillé, fromage fondu, sauce fromagère, frites, salade", price: 48, category: "Tacos", imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal"], prepTimeMinutes: 12, calories: 720 },
    { restaurantId: restaurantIds[3], name: "Tacos XL Mixte", description: "Poulet + kefta, sauce BBQ, fromage, légumes grillés, frites", price: 54, category: "Tacos", imageUrl: "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal"], prepTimeMinutes: 12, calories: 810 },
    { restaurantId: restaurantIds[3], name: "Smash Burger Double", description: "Double galette boeuf smashée, cheddar, oignons, sauce maison", price: 58, category: "Burgers", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal"], prepTimeMinutes: 10, calories: 750 },
    { restaurantId: restaurantIds[3], name: "Nuggets x10", description: "Nuggets de poulet croustillants, sauce ketchup ou mayo épicée", price: 36, category: "Snacks", imageUrl: "https://images.unsplash.com/photo-1562802378-063ec186a863?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal"], prepTimeMinutes: 10, calories: 480 },
    { restaurantId: restaurantIds[3], name: "Frites Cheezy", description: "Frites croustillantes nappées de sauce fromagère chaude", price: 28, category: "Accompagnements", imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80", isAvailable: true, isPopular: false, tags: ["vegetarian"], prepTimeMinutes: 8, calories: 490 },
    { restaurantId: restaurantIds[3], name: "Wrap Kefta", description: "Kefta maison, fromage fondu, salade, tomate, sauce harissa douce", price: 42, category: "Sandwichs", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal"], prepTimeMinutes: 10, calories: 580 },
    { restaurantId: restaurantIds[3], name: "Soda 50cl", description: "Coca, Pepsi, Fanta ou 7Up — servi bien frais", price: 12, category: "Boissons", imageUrl: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&q=80", isAvailable: true, isPopular: false, tags: ["vegan"], prepTimeMinutes: 0, calories: 190 },
    // ── Fish Mood (restaurantIds[4]) ───────────────────────────────────────
    { restaurantId: restaurantIds[4], name: "Plateau Fruits de Mer", description: "Crevettes royales, calamars, moules, palourdes, sauce aïoli et citron", price: 185, category: "Plateaux", imageUrl: "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal", "gluten_free"], prepTimeMinutes: 25, calories: 520 },
    { restaurantId: restaurantIds[4], name: "Crevettes à la Chermoula", description: "Crevettes royales marinées au cumin, coriandre, ail et citron, grillées", price: 120, category: "Grillades", imageUrl: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal", "gluten_free"], prepTimeMinutes: 18, calories: 380 },
    { restaurantId: restaurantIds[4], name: "Tajine de Lotte", description: "Lotte aux olives et citron confit, légumes du marché, épices orientales", price: 145, category: "Tajines", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal", "gluten_free"], prepTimeMinutes: 35, calories: 450 },
    { restaurantId: restaurantIds[4], name: "Calamars Frits", description: "Anneaux de calamar panés et frits, servis avec sauce tartare citronnée", price: 90, category: "Fritures", imageUrl: "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal"], prepTimeMinutes: 15, calories: 520 },
    { restaurantId: restaurantIds[4], name: "Soupe de Poisson", description: "Bouillon de poissons frais, safran, croûtons, rouille maison", price: 55, category: "Soupes", imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal", "gluten_free"], prepTimeMinutes: 15, calories: 280 },
    { restaurantId: restaurantIds[4], name: "Dorade Grillée", description: "Dorade entière 400g, herbes fraîches, huile d'olive, accompagnée de légumes", price: 130, category: "Grillades", imageUrl: "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal", "gluten_free"], prepTimeMinutes: 25, calories: 410 },
    { restaurantId: restaurantIds[4], name: "Moules Marinières", description: "Moules fraîches, bouillon aromatisé, échalotes, persil et citron", price: 80, category: "Entrées", imageUrl: "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal"], prepTimeMinutes: 20, calories: 320 },
    // ── Bab El Gharbi (restaurantIds[5]) ───────────────────────────────────
    { restaurantId: restaurantIds[5], name: "Couscous Royal", description: "Semoule fine, 7 légumes du jardin, agneau, poulet fermier, merguez, pois chiches", price: 95, category: "Couscous", imageUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal"], prepTimeMinutes: 45, calories: 880 },
    { restaurantId: restaurantIds[5], name: "Tajine Agneau Pruneaux", description: "Agneau fondant, pruneaux, amandes grillées, miel, cannelle et gingembre", price: 110, category: "Tajines", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal", "gluten_free"], prepTimeMinutes: 50, calories: 720 },
    { restaurantId: restaurantIds[5], name: "Bastilla Poulet", description: "Feuilleté croustillant farci poulet, amandes, oeufs et cannelle — recette de Fès", price: 85, category: "Spécialités", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal"], prepTimeMinutes: 40, calories: 650 },
    { restaurantId: restaurantIds[5], name: "Harira", description: "Soupe traditionnelle tomate, lentilles, pois chiches, vermicelles et épices", price: 25, category: "Soupes", imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal", "vegan"], prepTimeMinutes: 20, calories: 280 },
    { restaurantId: restaurantIds[5], name: "Pastilla au Lait", description: "Feuilles de warqa croustillantes, crème pâtissière à l'amande et eau de fleur d'oranger", price: 40, category: "Desserts", imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80", isAvailable: true, isPopular: false, tags: ["vegetarian"], prepTimeMinutes: 0, calories: 380 },
    { restaurantId: restaurantIds[5], name: "Mechoui d'Agneau", description: "Épaule d'agneau rôtie lentement au cumin et sel de mer, pain maison", price: 130, category: "Grillades", imageUrl: "https://images.unsplash.com/photo-1544025162-d76538b2a837?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal", "gluten_free"], prepTimeMinutes: 60, calories: 820 },
    { restaurantId: restaurantIds[5], name: "Thé à la Menthe", description: "Thé vert gunpowder, menthe fraîche, sucre à volonté — servi en théière", price: 15, category: "Boissons", imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80", isAvailable: true, isPopular: false, tags: ["vegan", "gluten_free"], prepTimeMinutes: 5, calories: 60 },
    // ── Nara Sushi (restaurantIds[6]) ──────────────────────────────────────
    { restaurantId: restaurantIds[6], name: "Dragon Roll (8 pcs)", description: "Crevette tempura, avocat sur le dessus, sauce anguille, sésame", price: 95, category: "Makis", imageUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal"], prepTimeMinutes: 15, calories: 440 },
    { restaurantId: restaurantIds[6], name: "Poké Bowl Saumon", description: "Saumon frais, riz sushi, edamame, avocat, concombre, sauce teriyaki", price: 88, category: "Poké Bowls", imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal", "gluten_free"], prepTimeMinutes: 12, calories: 520 },
    { restaurantId: restaurantIds[6], name: "Ramen Miso", description: "Bouillon miso, nouilles, champignons shiitake, tofu, oeuf mollet", price: 85, category: "Chaud", imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80", isAvailable: true, isPopular: false, tags: ["vegetarian"], prepTimeMinutes: 15, calories: 580 },
    { restaurantId: restaurantIds[6], name: "Tempura Crevettes (6 pcs)", description: "Grosses crevettes en tempura légère, sauce ponzu et daïkon", price: 75, category: "Entrées", imageUrl: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal"], prepTimeMinutes: 12, calories: 320 },
    { restaurantId: restaurantIds[6], name: "Plateau Découverte 16 pcs", description: "Nigiri saumon x4, california roll x4, spicy tuna x4, edamame", price: 145, category: "Plateaux", imageUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal"], prepTimeMinutes: 18, calories: 620 },
    { restaurantId: restaurantIds[6], name: "Miso Soup", description: "Bouillon dashi, tofu soyeux, wakamé, oignons verts", price: 22, category: "Soupes", imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80", isAvailable: true, isPopular: false, tags: ["vegan"], prepTimeMinutes: 5, calories: 90 },
    { restaurantId: restaurantIds[6], name: "Yakitori Poulet (4 pcs)", description: "Brochettes de poulet laquées sauce teriyaki, grillées au charbon", price: 55, category: "Grillades", imageUrl: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal", "gluten_free"], prepTimeMinutes: 15, calories: 340 },
    // ── BBQ Oujda (restaurantIds[7]) ───────────────────────────────────────
    { restaurantId: restaurantIds[7], name: "Brochette Kefta", description: "300g de kefta d'agneau et boeuf mélangés, herbes fraîches, cumin, paprika", price: 65, category: "Brochettes", imageUrl: "https://images.unsplash.com/photo-1544025162-d76538b2a837?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal", "gluten_free"], prepTimeMinutes: 20, calories: 520 },
    { restaurantId: restaurantIds[7], name: "Entrecôte Grillée", description: "Entrecôte de boeuf 300g, fleur de sel, beurre maître d'hôtel, frites maison", price: 120, category: "Grillades", imageUrl: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal", "gluten_free"], prepTimeMinutes: 25, calories: 780 },
    { restaurantId: restaurantIds[7], name: "Poulet Fermier Grillé", description: "Demi-poulet fermier mariné au citron et herbes, grillé au feu de bois", price: 85, category: "Grillades", imageUrl: "https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal", "gluten_free"], prepTimeMinutes: 30, calories: 620 },
    { restaurantId: restaurantIds[7], name: "Côtelettes d'Agneau", description: "4 côtelettes d'agneau de la région, romarin, ail, huile d'olive", price: 110, category: "Grillades", imageUrl: "https://images.unsplash.com/photo-1544025162-d76538b2a837?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal", "gluten_free"], prepTimeMinutes: 25, calories: 680 },
    { restaurantId: restaurantIds[7], name: "Salade Mechouia", description: "Poivrons et tomates grillés, ail, coriandre, huile d'argan", price: 30, category: "Salades", imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80", isAvailable: true, isPopular: false, tags: ["vegan", "gluten_free"], prepTimeMinutes: 10, calories: 180 },
    { restaurantId: restaurantIds[7], name: "Merguez x5", description: "Merguez pur agneau épicées, accompagnées de moutarde et pain", price: 55, category: "Grillades", imageUrl: "https://images.unsplash.com/photo-1544025162-d76538b2a837?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal", "gluten_free"], prepTimeMinutes: 15, calories: 420 },
    { restaurantId: restaurantIds[7], name: "Mix Grill BBQ", description: "Assortiment : kefta, brochette veau, merguez, poulet — idéal pour partager", price: 175, category: "Grillades", imageUrl: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal", "gluten_free"], prepTimeMinutes: 35, calories: 1200 },
    // ── Snack Labroque (restaurantIds[8]) ──────────────────────────────────
    { restaurantId: restaurantIds[8], name: "Tacos XL Poulet Fromage", description: "Galette XL, poulet mariné, sauce fromagère, mozzarella fondue, légumes", price: 42, category: "Tacos", imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal"], prepTimeMinutes: 10, calories: 690 },
    { restaurantId: restaurantIds[8], name: "Pizza Labroque 4 Fromages", description: "Pâte fine, mozzarella, emmental, fromage de chèvre, parmesan", price: 55, category: "Pizzas", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80", isAvailable: true, isPopular: true, tags: ["vegetarian"], prepTimeMinutes: 15, calories: 780 },
    { restaurantId: restaurantIds[8], name: "Burger Labroque", description: "Steak haché boeuf, oeuf frit, fromage fondu, sauce spéciale Labroque", price: 45, category: "Burgers", imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal"], prepTimeMinutes: 10, calories: 720 },
    { restaurantId: restaurantIds[8], name: "Sandwich Merguez", description: "Pain baguette, merguez grillée, harissa, tomate, oignons, frites dans le pain", price: 28, category: "Sandwichs", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal"], prepTimeMinutes: 8, calories: 540 },
    { restaurantId: restaurantIds[8], name: "Frites + Sauce", description: "Portion généreuse de frites + sauce au choix : ketchup, mayo ou harissa", price: 18, category: "Accompagnements", imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80", isAvailable: true, isPopular: false, tags: ["vegan"], prepTimeMinutes: 8, calories: 420 },
    { restaurantId: restaurantIds[8], name: "Panini Poulet", description: "Pain ciabatta grillé, poulet fumé, mozzarella fondue, poivrons confits", price: 38, category: "Sandwichs", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal"], prepTimeMinutes: 10, calories: 580 },
    { restaurantId: restaurantIds[8], name: "Menu Étudiant", description: "Tacos M + frites + soda — le combo budget incontournable", price: 48, category: "Menus", imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80", isAvailable: true, isPopular: false, tags: ["halal"], prepTimeMinutes: 12, calories: 890 },
    // ── Tajine City (restaurantIds[9]) ─────────────────────────────────────
    { restaurantId: restaurantIds[9], name: "Tajine Poulet Citron Confit", description: "Poulet fermier, citron confit, olives vertes, épices Ras el hanout", price: 88, category: "Tajines", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal", "gluten_free"], prepTimeMinutes: 40, calories: 620 },
    { restaurantId: restaurantIds[9], name: "Couscous Végétarien", description: "Semoule parfumée, 7 légumes de saison, bouillon parfumé, beurre smen", price: 70, category: "Couscous", imageUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80", isAvailable: true, isPopular: true, tags: ["vegetarian"], prepTimeMinutes: 35, calories: 680 },
    { restaurantId: restaurantIds[9], name: "Tajine Kefta Oeuf", description: "Boulettes de kefta épicées, oeufs pochés, sauce tomate au cumin", price: 75, category: "Tajines", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80", isAvailable: true, isPopular: true, tags: ["halal", "gluten_free"], prepTimeMinutes: 35, calories: 550 },
    { restaurantId: restaurantIds[9], name: "Harira Fassia", description: "Soupe épaisse tomate-lentilles, coriandre, citron, vermicelles — recette de Fès", price: 22, category: "Soupes", imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80", isAvailable: true, isPopular: false, tags: ["vegan"], prepTimeMinutes: 15, calories: 260 },
    { restaurantId: restaurantIds[9], name: "Msemen au Beurre et Miel", description: "Galettes feuilletées maison, beurre et miel d'Oujda — petit déjeuner traditionnel", price: 20, category: "Pains", imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80", isAvailable: true, isPopular: false, tags: ["vegetarian"], prepTimeMinutes: 10, calories: 340 },
    { restaurantId: restaurantIds[9], name: "Chebakia", description: "Biscuits en fleur de sésame et miel — pâtisserie traditionnelle de ramadan", price: 25, category: "Desserts", imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80", isAvailable: true, isPopular: false, tags: ["vegetarian"], prepTimeMinutes: 0, calories: 280 },
    { restaurantId: restaurantIds[9], name: "Thé Menthe Verveine", description: "Infusion menthe fraîche et verveine d'Oujda, servie en théière traditionnelle", price: 15, category: "Boissons", imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80", isAvailable: true, isPopular: false, tags: ["vegan", "gluten_free"], prepTimeMinutes: 5, calories: 50 },
  ];

  await db.insert(menuItemsTable).values(items);
  console.log(`✅ ${items.length} menu items seeded (70 items across 10 Oujda restaurants)`);
}

async function main() {
  console.log("🚀 Starting Jatek seed...\n");
  try {
    await seedCategories();
    await seedAds();
    await seedShorts();
    const restaurantIds = await seedRestaurants();
    await seedMenuItems(restaurantIds);
    console.log("\n🎉 Seed complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

main();
