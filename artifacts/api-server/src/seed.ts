import bcrypt from "bcryptjs";
import { db, usersTable, restaurantsTable, menuItemsTable, driversTable, reviewsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function runSeedIfEmpty() {
  const isProd = process.env.NODE_ENV === "production";
  try {
    // Always ensure core admin accounts exist (safe in prod)
    await ensureCoreAccounts();

    if (isProd) {
      // Production: never seed demo/test data — real data only
      console.log("[seed] Production mode: skipping demo data seeding.");
      return;
    }

    const existing = await db.select().from(restaurantsTable).limit(1);
    if (existing.length > 0) return;

    // Also ensure the dev test-client account exists
    await ensureTestClient();

    console.log("[seed] Dev/test mode: DB is empty, seeding demo data…");
    await seedAll();
    console.log("[seed] Done!");
  } catch (err) {
    console.error("[seed] Error:", err);
  }
}

// Ensures essential accounts exist in any environment (admin, super_admin)
async function ensureCoreAccounts() {
  const hashedPassword = await bcrypt.hash("00000000", 10);

  await db
    .insert(usersTable)
    .values({
      name: "Belmahi Rachid",
      email: "r.belmahi@gmail.com",
      password: hashedPassword,
      role: "admin",
      phone: "+212600000001",
      loyaltyPoints: 0,
      isActive: true,
    })
    .onConflictDoNothing({ target: usersTable.email });

  await db
    .insert(usersTable)
    .values({
      name: "Belmahi Rachid Super",
      email: "rbelmahi90@gmail.com",
      password: hashedPassword,
      role: "super_admin",
      phone: "+212600000002",
      loyaltyPoints: 0,
      isActive: true,
    })
    .onConflictDoNothing({ target: usersTable.email });
}

const TEST_CLIENT_EMAIL = "testclient@jatek.ma";

async function ensureTestClient() {
  const hashedPassword = await bcrypt.hash("password123", 10);
  const inserted = await db
    .insert(usersTable)
    .values({
      name: "Test Client Jatek",
      email: TEST_CLIENT_EMAIL,
      password: hashedPassword,
      role: "customer",
      phone: "+212600000099",
      loyaltyPoints: 0,
      isActive: true,
    })
    .onConflictDoNothing({ target: usersTable.email })
    .returning({ id: usersTable.id });
  if (inserted.length > 0) {
    console.log(`[seed] Created test client account ${TEST_CLIENT_EMAIL}`);
  }
}

async function seedAll() {
  const hashedPassword = await bcrypt.hash("password123", 10);

  const existingAdmin = await db.select().from(usersTable).where(eq(usersTable.email, "admin@jatek.ma")).limit(1);

  let customerUser: any, ownerUser: any;

  if (existingAdmin.length === 0) {
    const users = await db.insert(usersTable).values([
      { name: "Mohammed Alami", email: "customer@jatek.ma", password: hashedPassword, role: "customer", phone: "+212661000001", loyaltyPoints: 250, isActive: true },
      { name: "Youssef Benali", email: "driver@jatek.ma", password: hashedPassword, role: "driver", phone: "+212661000002", loyaltyPoints: 0, isActive: true },
      { name: "Fatima Zahra", email: "owner@jatek.ma", password: hashedPassword, role: "restaurant_owner", phone: "+212661000003", loyaltyPoints: 0, isActive: true },
      { name: "Admin Jatek", email: "admin@jatek.ma", password: hashedPassword, role: "admin", phone: "+212661000004", loyaltyPoints: 0, isActive: true },
      { name: "Khalid Mansouri", email: "driver2@jatek.ma", password: hashedPassword, role: "driver", phone: "+212661000005", loyaltyPoints: 0, isActive: true },
    ]).returning();

    [customerUser, , ownerUser] = users;

    await db.insert(driversTable).values([
      { userId: users[1].id, name: users[1].name, phone: users[1].phone, isAvailable: true, totalDeliveries: 47, vehicleType: "Moto", rating: 4.8 },
      { userId: users[4].id, name: users[4].name, phone: users[4].phone, isAvailable: true, totalDeliveries: 23, vehicleType: "Voiture", rating: 4.6 },
    ]);
  } else {
    const allUsers = await db.select().from(usersTable).limit(10);
    customerUser = allUsers.find(u => u.role === "customer");
    ownerUser = allUsers.find(u => u.role === "restaurant_owner");
  }

  const ownerId = ownerUser?.id || 1;

  const restaurants = await db.insert(restaurantsTable).values([
    {
      ownerId,
      name: "Dar Zitoun",
      description: "Authentic Moroccan cuisine with traditional tajines, couscous, and pastilla. A taste of Oujda's rich culinary heritage.",
      address: "12 Rue Mohammed V, Oujda",
      phone: "+212536700001",
      imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200&auto=format&fit=crop",
      logoUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200&h=200&auto=format&fit=crop&crop=center",
      category: "Moroccan",
      isLocal: true,
      isOpen: true,
      deliveryTime: 30,
      deliveryFee: 10,
      minimumOrder: 50,
      rating: 4.8,
      reviewCount: 124,
      isVerified: true,
    },
    {
      ownerId,
      name: "Pizza Palace",
      description: "Wood-fired pizzas with premium ingredients. Italian-inspired recipes with a Moroccan twist.",
      address: "45 Boulevard Allal Ben Abdellah, Oujda",
      phone: "+212536700002",
      imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=1200&auto=format&fit=crop",
      logoUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&h=200&auto=format&fit=crop&crop=center",
      category: "Pizza",
      isLocal: false,
      isOpen: true,
      deliveryTime: 25,
      deliveryFee: 8,
      minimumOrder: 40,
      rating: 4.5,
      reviewCount: 89,
      isVerified: true,
    },
    {
      ownerId,
      name: "Burger Station",
      description: "Juicy smash burgers with fresh ingredients. Our signature double smash is a must-try!",
      address: "78 Avenue Hassan II, Oujda",
      phone: "+212536700003",
      imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&auto=format&fit=crop",
      logoUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&auto=format&fit=crop&crop=center",
      category: "Burgers",
      isLocal: true,
      isOpen: true,
      deliveryTime: 20,
      deliveryFee: 0,
      minimumOrder: 35,
      rating: 4.7,
      reviewCount: 203,
      isVerified: true,
    },
    {
      ownerId,
      name: "Sushi Oujda",
      description: "Fresh sushi and Japanese-inspired dishes. Quality ingredients sourced daily.",
      address: "23 Rue de la Paix, Oujda",
      phone: "+212536700004",
      imageUrl: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&auto=format&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=1200&auto=format&fit=crop",
      logoUrl: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=200&h=200&auto=format&fit=crop&crop=center",
      category: "Sushi",
      isLocal: false,
      isOpen: true,
      deliveryTime: 40,
      deliveryFee: 15,
      minimumOrder: 80,
      rating: 4.4,
      reviewCount: 56,
      isVerified: false,
    },
    {
      ownerId,
      name: "Sandwich Express",
      description: "Quick and delicious sandwiches. Perfect for a fast lunch or dinner.",
      address: "9 Rue des FAR, Oujda",
      phone: "+212536700005",
      imageUrl: "https://images.unsplash.com/photo-1553909489-cd47e0907980?w=800&auto=format&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1200&auto=format&fit=crop",
      logoUrl: "https://images.unsplash.com/photo-1553909489-cd47e0907980?w=200&h=200&auto=format&fit=crop&crop=center",
      category: "Sandwiches",
      isLocal: true,
      isOpen: true,
      deliveryTime: 15,
      deliveryFee: 5,
      minimumOrder: 20,
      rating: 4.3,
      reviewCount: 178,
      isVerified: true,
    },
    {
      ownerId,
      name: "Poulet d'Or",
      description: "Rotisserie chicken cooked to perfection. Tender, juicy, and full of flavor.",
      address: "56 Avenue de la Résistance, Oujda",
      phone: "+212536700006",
      imageUrl: "https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=800&auto=format&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=1200&auto=format&fit=crop",
      logoUrl: "https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=200&h=200&auto=format&fit=crop&crop=center",
      category: "Chicken",
      isLocal: true,
      isOpen: true,
      deliveryTime: 25,
      deliveryFee: 8,
      minimumOrder: 45,
      rating: 4.6,
      reviewCount: 341,
      isVerified: true,
    },
    {
      ownerId,
      name: "Tajine & Co",
      description: "Home-style Moroccan cooking. Our grandmother's recipes, delivered fresh to your door.",
      address: "3 Derb Sfou, Oujda Médina",
      phone: "+212536700007",
      imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&auto=format&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=1200&auto=format&fit=crop",
      logoUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=200&h=200&auto=format&fit=crop&crop=center",
      category: "Moroccan",
      isLocal: true,
      isOpen: false,
      deliveryTime: 35,
      deliveryFee: 10,
      minimumOrder: 60,
      rating: 4.9,
      reviewCount: 67,
      isVerified: false,
    },
    {
      ownerId,
      name: "Crispy Chicken",
      description: "Korean-style crispy fried chicken. Crispy on the outside, juicy on the inside.",
      address: "11 Rue Ibn Khaldoun, Oujda",
      phone: "+212536700008",
      imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=1200&auto=format&fit=crop",
      logoUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=200&h=200&auto=format&fit=crop&crop=center",
      category: "Chicken",
      isLocal: false,
      isOpen: true,
      deliveryTime: 20,
      deliveryFee: 0,
      minimumOrder: 40,
      rating: 4.5,
      reviewCount: 112,
      isVerified: true,
    },
  ]).returning();

  const menuData = [
    {
      restaurantId: restaurants[0].id,
      items: [
        { name: "Tajine Agneau Pruneaux", description: "Slow-cooked lamb with prunes, almonds and spices", price: 75, category: "Tajines", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Couscous Royale", description: "Semolina with 7 vegetables and mixed meat", price: 65, category: "Couscous", imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Pastilla au Poulet", description: "Flaky pastry filled with chicken, almonds and egg", price: 55, category: "Entrées", imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Harira", description: "Traditional Moroccan soup with tomatoes, lentils and herbs", price: 20, category: "Soupes", imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Mrouzia", description: "Sweet and savory lamb with honey, raisins and almonds", price: 80, category: "Tajines", imageUrl: "https://images.unsplash.com/photo-1542223616-9de9adb5e3e8?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Thé à la Menthe", description: "Traditional Moroccan mint tea", price: 15, category: "Boissons", imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop", isAvailable: true },
      ]
    },
    {
      restaurantId: restaurants[1].id,
      items: [
        { name: "Pizza Margherita", description: "Classic tomato, fresh mozzarella and basil", price: 60, category: "Pizzas Classiques", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Pizza Kebab", description: "Tomato, mozzarella, spiced meat, onions and peppers", price: 75, category: "Pizzas Spéciales", imageUrl: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Pizza 4 Fromages", description: "Mozzarella, gouda, emmental and blue cheese", price: 80, category: "Pizzas Classiques", imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Calzone Poulet", description: "Folded pizza with chicken, mushrooms and cream", price: 70, category: "Pizzas Spéciales", imageUrl: "https://images.unsplash.com/photo-1555072956-7758afb20e8f?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Tiramisu", description: "Classic Italian dessert", price: 30, category: "Desserts", imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&auto=format&fit=crop", isAvailable: true },
      ]
    },
    {
      restaurantId: restaurants[2].id,
      items: [
        { name: "Classic Smash Burger", description: "Double smash patty, cheddar, pickles, special sauce", price: 55, category: "Burgers", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "BBQ Bacon Burger", description: "Smash patty, crispy bacon, BBQ sauce, onion rings", price: 70, category: "Burgers", imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Chicken Burger", description: "Crispy chicken fillet, coleslaw, sriracha mayo", price: 60, category: "Burgers", imageUrl: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Frites Maison", description: "Crispy fries seasoned with paprika and herbs", price: 20, category: "Accompagnements", imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Onion Rings", description: "Beer-battered crispy onion rings", price: 25, category: "Accompagnements", imageUrl: "https://images.unsplash.com/photo-1633407979541-e11deb17b91c?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Milkshake Chocolat", description: "Rich chocolate milkshake", price: 30, category: "Boissons", imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&auto=format&fit=crop", isAvailable: true },
      ]
    },
    {
      restaurantId: restaurants[3].id,
      items: [
        { name: "Plateau Sushi 12 pcs", description: "Chef's selection of nigiri and maki", price: 120, category: "Plateaux", imageUrl: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "California Roll", description: "Crab, avocado and cucumber", price: 55, category: "Maki", imageUrl: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Salmon Nigiri x4", description: "Fresh salmon over seasoned rice", price: 65, category: "Nigiri", imageUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Soupe Miso", description: "Traditional Japanese miso soup with tofu", price: 20, category: "Soupes", imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&auto=format&fit=crop", isAvailable: true },
      ]
    },
    {
      restaurantId: restaurants[4].id,
      items: [
        { name: "Sandwich Kefta", description: "Spiced minced meat with tomatoes and harissa", price: 25, category: "Sandwichs Chauds", imageUrl: "https://images.unsplash.com/photo-1553909489-cd47e0907980?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Sandwich Merguez", description: "Spicy lamb sausage with grilled peppers", price: 28, category: "Sandwichs Chauds", imageUrl: "https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Club Sandwich", description: "Chicken, tomato, egg and lettuce", price: 35, category: "Sandwichs Froids", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Jus d'Orange", description: "Fresh-squeezed orange juice", price: 15, category: "Boissons", imageUrl: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&auto=format&fit=crop", isAvailable: true },
      ]
    },
    {
      restaurantId: restaurants[5].id,
      items: [
        { name: "Demi Poulet Rôti", description: "Half rotisserie chicken with fries and salad", price: 55, category: "Poulet", imageUrl: "https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Quart Poulet + Frites", description: "Quarter chicken with crispy fries", price: 35, category: "Poulet", imageUrl: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Brochettes Poulet x3", description: "3 chicken skewers marinated in herbs", price: 45, category: "Grillades", imageUrl: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Salade Maison", description: "Fresh garden salad with lemon dressing", price: 20, category: "Accompagnements", imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&auto=format&fit=crop", isAvailable: true },
      ]
    },
    {
      restaurantId: restaurants[6].id,
      items: [
        { name: "Tajine Poulet Citron", description: "Chicken with preserved lemons and olives", price: 70, category: "Tajines", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Couscous Végétarien", description: "Semolina with seasonal vegetables and chickpeas", price: 55, category: "Couscous", imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Briouates au Fromage", description: "Crispy phyllo pastry filled with cheese and herbs", price: 35, category: "Entrées", imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&auto=format&fit=crop", isAvailable: true },
      ]
    },
    {
      restaurantId: restaurants[7].id,
      items: [
        { name: "Bucket Crispy x8", description: "8 pieces of crispy fried chicken", price: 90, category: "Buckets", imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Wings Sauce BBQ x10", description: "10 crispy wings with BBQ sauce", price: 65, category: "Wings", imageUrl: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Tenders x5 + Sauce", description: "5 chicken tenders with dipping sauce", price: 55, category: "Tenders", imageUrl: "https://images.unsplash.com/photo-1562802378-063ec186a863?w=400&auto=format&fit=crop", isAvailable: true },
        { name: "Combo Burger Crispy", description: "Crispy chicken burger with fries and drink", price: 70, category: "Combos", imageUrl: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&auto=format&fit=crop", isAvailable: true },
      ]
    },
  ];

  for (const { restaurantId, items } of menuData) {
    await db.insert(menuItemsTable).values(
      items.map(item => ({ ...item, restaurantId }))
    );
  }

  if (customerUser) {
    const reviewerName = customerUser.name || "Mohammed Alami";
    await db.insert(reviewsTable).values([
      { userId: customerUser.id, restaurantId: restaurants[0].id, userName: reviewerName, rating: 5, comment: "Excellent tajine! Vraiment authentique et délicieux." },
      { userId: customerUser.id, restaurantId: restaurants[2].id, userName: reviewerName, rating: 5, comment: "Le meilleur smash burger d'Oujda, sans hésitation!" },
      { userId: customerUser.id, restaurantId: restaurants[5].id, userName: reviewerName, rating: 4, comment: "Poulet rôti parfait, livraison rapide." },
    ]).onConflictDoNothing();
  }
}
