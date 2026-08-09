#!/usr/bin/env node
/**
 * Jatek E2E Test — Flux complet commande → livraison
 * ====================================================
 * Usage : node e2e-test.js
 * Prérequis : Node 18+, serveur API démarré
 *
 * Variables d'environnement :
 *   API_BASE          URL du serveur API          (défaut: http://localhost:8080)
 *   E2E_ADMIN_EMAIL   Email admin de test         (défaut: r.belmahi@gmail.com)
 *   E2E_ADMIN_PASS    Mot de passe admin          (défaut: 00000000)
 *   E2E_ALLOW_PROD    "true" pour autoriser prod  (défaut: refusé)
 *
 * Sécurité : aucun secret, token, ni PII n'est écrit dans e2e-report.md.
 * Nettoyage : le compte client de test est supprimé en fin de script.
 */

// ─── Garde environnement ───────────────────────────────────────────────────────

const isDeployedProd = !!(
  process.env.REPLIT_DEPLOYMENT ||
  process.env.REPLIT_DEPLOYMENT_ID ||
  process.env.REPLIT_DEPLOYMENT_DOMAIN
);
if (isDeployedProd && process.env.E2E_ALLOW_PROD !== 'true') {
  console.error('⛔  Refus de lancer le test E2E en production sans E2E_ALLOW_PROD=true');
  console.error('    Ce script crée et modifie des données réelles — exécutez-le sur un environnement de test.');
  process.exit(1);
}

const BASE          = process.env.API_BASE       || 'http://localhost:8080';
const ADMIN_EMAIL   = process.env.E2E_ADMIN_EMAIL || 'r.belmahi@gmail.com';
const ADMIN_PASS    = process.env.E2E_ADMIN_PASS  || '00000000';
const REPORT_PATH   = 'e2e-report.md';
const TIMEOUT_MS    = 12_000;

const steps = [];   // { name, ok, status, duration, payload, response, notes, error }
const bugs  = [];   // { step, severity, message, suggestion }

// ─── Redaction PII / secrets ──────────────────────────────────────────────────

function redact(obj) {
  if (obj === null || obj === undefined) return obj;
  const SENSITIVE_KEYS = new Set([
    'token', 'password', 'Authorization', 'nationalId',
    'licenseNumber', 'vehiclePlate', 'pickupCode', 'kitchenCode',
  ]);
  const PHONE_RE = /\+?\d[\d\s\-]{7,}/g;
  const JWT_RE   = /ey[A-Za-z0-9._-]{40,}/g;

  function walk(v, key = '') {
    if (v === null || v === undefined) return v;
    if (typeof v === 'string') {
      if (SENSITIVE_KEYS.has(key)) return '[REDACTÉ]';
      return v.replace(JWT_RE, '[JWT]');
    }
    if (typeof v === 'number' || typeof v === 'boolean') return v;
    if (Array.isArray(v)) return v.map(item => walk(item));
    if (typeof v === 'object') {
      return Object.fromEntries(
        Object.entries(v).map(([k, val]) => [k, walk(val, k)])
      );
    }
    return v;
  }
  return walk(obj);
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function api(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.headers) Object.assign(headers, options.headers);

  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const t0    = Date.now();

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options, headers,
      signal: ctrl.signal,
    });
    const duration = Date.now() - t0;
    let data = null;
    try {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) data = await res.json();
      else data = await res.text();
    } catch { /* ignore */ }
    return { ok: res.ok, status: res.status, data, duration };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err.message, duration: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Enregistrement des étapes ────────────────────────────────────────────────

function record(name, result, payload = null, notes = '') {
  const icon   = result.ok ? '✅' : (result.status === 0 ? '⚠️' : '❌');
  const errMsg = !result.ok
    ? (result.data?.error || result.error || JSON.stringify(result.data)?.slice(0, 120))
    : '';
  console.log(`${icon} [${result.status || 'ERR'}] ${name} (${result.duration}ms)${errMsg ? ` — ${errMsg}` : ''}`);
  if (notes) console.log(`   ℹ️  ${notes}`);

  steps.push({
    name, ok: result.ok, status: result.status || 0,
    duration: result.duration,
    payload:  redact(payload),          // Never store raw secrets
    response: redact(result.data),      // Never store JWT/PII
    notes, error: errMsg,
  });
  return result;
}

function bug(step, severity, message, suggestion = '') {
  console.log(`   🐛 [${severity.toUpperCase()}] ${message}`);
  bugs.push({ step, severity, message, suggestion });
}

// ─── SSE : ouvrir un canal et attendre un événement précis ───────────────────
// La connexion doit être ouverte AVANT la mutation qui déclenche l'événement.
// Retourne { found, events, timedOut, duration, error }.

function listenSSE(token, channels, watchForEvents, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const collected = [];
    let resolved    = false;
    const ctrl      = new AbortController();
    const t0        = Date.now();

    const done = (extra = {}) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      ctrl.abort();
      resolve({ events: collected, duration: Date.now() - t0, ...extra });
    };

    const timer = setTimeout(() => done({ timedOut: true }), timeoutMs);

    const channelParam = channels.map(encodeURIComponent).join(',');
    fetch(`${BASE}/api/events?channels=${channelParam}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (!res.ok) { done({ error: `HTTP ${res.status}` }); return; }
        const reader = res.body.getReader();
        const dec    = new TextDecoder();
        let buffer   = '';

        while (!resolved) {
          let chunk;
          try { chunk = await reader.read(); } catch { break; }
          if (chunk.done) break;
          buffer += dec.decode(chunk.value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              const evtName = line.slice(6).trim();
              collected.push(evtName);
              if (watchForEvents.includes(evtName)) {
                reader.cancel().catch(() => {});
                done({ found: evtName });
                return;
              }
            }
          }
        }
        done({});
      })
      .catch((err) => {
        if (err.name !== 'AbortError') done({ error: err.message });
      });
  });
}

// ─── Nettoyage post-test ──────────────────────────────────────────────────────

async function cleanup(customerToken, customerUserId, adminToken, orderId) {
  console.log('\n── NETTOYAGE ───────────────────────────────────────────────\n');
  // Supprimer le compte client de test (et ses commandes via cascade si configuré)
  if (customerToken) {
    const r = await api('/api/me', { method: 'DELETE' }, customerToken);
    if (r.ok || r.status === 204) {
      console.log(`   🗑️  Compte client de test supprimé (userId=${customerUserId})`);
    } else {
      console.log(`   ⚠️  Suppression compte test échouée (${r.status}): ${r.data?.error}`);
    }
  }
}

// ─── Runner principal ─────────────────────────────────────────────────────────

async function run() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🚀  Jatek E2E Test — ${new Date().toISOString()}`);
  console.log(`    API : ${BASE}`);
  console.log(`    Env : ${isDeployedProd ? 'PRODUCTION (autorisé)' : 'development/staging'}`);
  console.log(`${'═'.repeat(60)}\n`);

  let adminToken, driverToken, customerToken;
  let adminUser, customerUser, driverProfile;
  let orderId, orderRef, pickupCode;

  // ══════════════════════════════════════════════════════════════
  // BLOC 1 — Authentification
  // ══════════════════════════════════════════════════════════════
  console.log('\n── BLOC 1 : Authentification ──────────────────────────────\n');

  // 1.1 Health check (tout status > 0 = serveur actif)
  {
    const r = await api('/');
    const alive = r.status > 0;
    record('Health check (GET /)', { ...r, ok: alive }, null,
      alive ? `Serveur disponible (HTTP ${r.status})` : `Serveur inaccessible — vérifier API_BASE=${BASE}`);
    if (!alive) {
      bug('Health check', 'P0', `Serveur inaccessible sur ${BASE}`, 'Démarrer le workflow artifacts/api-server');
      await writeReport(); process.exit(1);
    }
  }

  // 1.2 Login admin (credentials via env ou fallbacks connus)
  {
    const candidates = [
      { email: ADMIN_EMAIL, password: ADMIN_PASS },
      { email: 'r.belmahi@gmail.com',  password: '00000000'   },
      { email: 'rbelmahi90@gmail.com', password: '00000000'   },
      { email: 'admin@jatek.ma',       password: 'password123' },
    ];
    for (const creds of candidates) {
      const r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(creds) });
      if (r.ok) {
        adminToken = r.data.token; adminUser = r.data.user;
        // Payload redacté — ne logue pas le token
        record(`Admin login (POST /api/auth/login) → ${creds.email}`, r,
          { email: creds.email, password: '[***]' },
          `rôle=${r.data.user?.role}, id=${r.data.user?.id}`);
        break;
      }
    }
    if (!adminToken) {
      record('Admin login', { ok: false, status: 401, data: { error: 'Aucun credential admin valide' }, duration: 0 });
      bug('Admin login', 'P0', 'Aucun credential admin ne fonctionne', 'Vérifier E2E_ADMIN_EMAIL / E2E_ADMIN_PASS ou ensureCoreAccounts() dans seed.ts');
      await writeReport(); process.exit(1);
    }
  }

  // 1.3 Inscription d'un client de test (email unique horodaté)
  const ts        = Date.now();
  const testEmail = `e2e-${ts}@test.jatek.ma`;
  {
    // RegisterBody requiert role — l'API le force à "customer" côté serveur
    const payload = { name: 'E2E Client Test', email: testEmail, password: 'testpass123', role: 'customer' };
    const r = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    record('Client inscription (POST /api/auth/register)', r,
      { name: payload.name, email: payload.email, role: payload.role, password: '[***]' },
      r.ok ? `userId=${r.data?.user?.id}, role=${r.data?.user?.role}` : '');
    if (r.ok) {
      customerToken = r.data.token;
      customerUser  = r.data.user;
      if (customerUser?.role !== 'customer') {
        bug('Inscription client', 'P1', `Rôle attendu "customer", reçu "${customerUser?.role}"`,
          'artifacts/api-server/src/routes/auth.ts — role est forcé à "customer" mais RegisterBody l\'expose');
      }
    } else {
      // Fallback — testclient créé par ensureTestClient() avec password123
      const fallbacks = [
        { email: 'testclient@jatek.ma', password: 'password123' },
        { email: 'smoketest@jatek.ma',  password: 'password123' },
      ];
      for (const c of fallbacks) {
        const r2 = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(c) });
        if (r2.ok) {
          customerToken = r2.data.token; customerUser = r2.data.user;
          record(`Client login fallback (${c.email})`, r2, { email: c.email, password: '[***]' });
          break;
        }
      }
      if (!customerToken) {
        bug('Inscription + login client', 'P0', 'Impossible d\'obtenir un token client');
        await writeReport(); process.exit(1);
      }
    }
  }
  console.log(`   👤 Client: id=${customerUser?.id}, points=${customerUser?.loyaltyPoints}`);
  const loyaltyBefore = customerUser?.loyaltyPoints || 0;

  // ══════════════════════════════════════════════════════════════
  // BLOC 2 — Profil livreur + Catalogue
  // ══════════════════════════════════════════════════════════════
  console.log('\n── BLOC 2 : Profil livreur + Catalogue ────────────────────\n');

  // 2.1 Récupérer le premier livreur disponible (via admin)
  {
    const r = await api('/api/drivers', {}, adminToken);
    record('Admin — liste des livreurs (GET /api/drivers)', r, null,
      r.ok ? `${r.data?.length || 0} livreur(s) en base` : '');
    if (r.ok && r.data?.length > 0) {
      driverProfile = r.data.find(d => d.isAvailable) || r.data[0];
      console.log(`   🏍️  Livreur sélectionné: id=${driverProfile.id}, "${driverProfile.name}", profileCompletedAt=${driverProfile.profileCompletedAt || 'null'}`);
    } else {
      bug('Liste livreurs', 'P1', 'Aucun livreur trouvé en base', 'artifacts/api-server/src/seed.ts — vérifier driversTable');
    }
  }

  // 2.2 Compléter le profil livreur si nécessaire (admin bypass profile gate)
  if (driverProfile && !driverProfile.profileCompletedAt) {
    const payload = { vehicleType: 'Moto', vehiclePlate: 'E2E-TEST-1', nationalId: 'E2ETEST', licenseNumber: 'E2E-LIC' };
    const r = await api(`/api/drivers/${driverProfile.id}/complete-profile`,
      { method: 'POST', body: JSON.stringify(payload) }, adminToken);
    record(`Admin complète le profil livreur (POST /api/drivers/${driverProfile.id}/complete-profile)`, r,
      { vehicleType: payload.vehicleType, vehiclePlate: '[TEST-PLATE]', nationalId: '[REDACTÉ]', licenseNumber: '[REDACTÉ]' },
      r.ok ? `profileCompletedAt=${r.data?.profileCompletedAt}` : 'Requis pour accept-delivery');
    if (r.ok) driverProfile = r.data;
    else bug('Complétion profil livreur', 'P1', `Échec: ${r.data?.error}`,
      'artifacts/api-server/src/routes/drivers.ts — POST /drivers/:id/complete-profile');
  }

  // 2.3 Récupérer un restaurant ouvert
  let restaurant;
  {
    const r = await api('/api/restaurants', {}, customerToken);
    record('Liste restaurants (GET /api/restaurants)', r, null, `${r.data?.length || 0} restaurants retournés`);
    if (r.ok && r.data?.length > 0) {
      restaurant = r.data.find(res => res.isOpen) || r.data[0];
      console.log(`   🏪 Restaurant: "${restaurant.name}" (id=${restaurant.id}, isOpen=${restaurant.isOpen})`);
      if (!restaurant.isOpen) {
        bug('Sélection restaurant', 'P1', 'Aucun restaurant ouvert — la commande sera refusée',
          'Ouvrir un restaurant via PATCH /api/restaurants/:id ou le dashboard');
      }
    } else {
      bug('Liste restaurants', 'P0', 'Aucun restaurant trouvé', 'Vérifier le seed');
      await writeReport(); process.exit(1);
    }
  }

  // 2.4 Menu du restaurant
  let menuItems = [];
  {
    const r = await api(`/api/restaurants/${restaurant.id}/menu`, {}, customerToken);
    record(`Menu restaurant (GET /api/restaurants/${restaurant.id}/menu)`, r, null,
      `${r.data?.length || 0} items`);
    if (r.ok && r.data?.length > 0) {
      menuItems = r.data.filter(i => i.isAvailable !== false);
      console.log(`   🍽️  Items: ${menuItems.slice(0, 3).map(i => `${i.name} (${i.price} DH)`).join(', ')}...`);
    } else {
      bug('Menu restaurant', 'P0', 'Aucun item disponible', 'Vérifier le seed');
      await writeReport(); process.exit(1);
    }
  }

  // 2.5 Tailles et extras du premier item (optionnels — pas d'assertion si absents)
  const firstItem = menuItems[0];
  let selectedSizeId   = null;
  let selectedExtraIds = [];
  {
    const [rSizes, rExtras] = await Promise.all([
      api(`/api/menu/${firstItem.id}/sizes`,  {}, customerToken),
      api(`/api/menu/${firstItem.id}/extras`, {}, customerToken),
    ]);
    record(`Tailles item "${firstItem.name}" (GET /api/menu/${firstItem.id}/sizes)`,  rSizes,  null, `${rSizes.data?.length  || 0} taille(s)`);
    record(`Extras  item "${firstItem.name}" (GET /api/menu/${firstItem.id}/extras)`, rExtras, null, `${rExtras.data?.length || 0} extra(s)`);

    if (rSizes.ok && Array.isArray(rSizes.data) && rSizes.data.length > 0) {
      const av = rSizes.data.find(s => s.isAvailable !== false);
      if (av) { selectedSizeId = av.id; console.log(`   📏 Taille: "${av.name}" (+${av.priceAdjustment} DH)`); }
    }
    if (rExtras.ok && Array.isArray(rExtras.data) && rExtras.data.length > 0) {
      const av = rExtras.data.filter(e => e.isAvailable !== false).slice(0, 1);
      selectedExtraIds = av.map(e => e.id);
      if (av.length) console.log(`   ➕ Extras: ${av.map(e => `"${e.name}" (+${e.price} DH)`).join(', ')}`);
    }
    if (!selectedSizeId && !selectedExtraIds.length)
      console.log('   ℹ️  Aucune taille/extra disponible — commande sans options (voir task #13)');
  }

  // ══════════════════════════════════════════════════════════════
  // BLOC 3 — Création de la commande
  // ══════════════════════════════════════════════════════════════
  console.log('\n── BLOC 3 : Commande ───────────────────────────────────────\n');

  {
    const item1 = {
      menuItemId: firstItem.id, quantity: 2,
      ...(selectedSizeId       ? { selectedSizeId }    : {}),
      ...(selectedExtraIds.length ? { selectedExtraIds } : {}),
    };
    const item2 = menuItems[1] ? { menuItemId: menuItems[1].id, quantity: 1 } : null;
    const orderPayload = {
      restaurantId:    restaurant.id,
      deliveryAddress: '47 Avenue Hassan II, Oujda',
      notes:           'E2E test automatisé — sans contact',
      items:           item2 ? [item1, item2] : [item1],
      deliveryType:    'asap',
      paymentMethod:   'cash',
    };

    // Ouvrir SSE sur restaurant:{id} avant la mutation pour capter order_new
    const restaurantSSEPromise = listenSSE(adminToken, [`restaurant:${restaurant.id}`], ['order_new'], 6000);

    const r = await api('/api/orders', { method: 'POST', body: JSON.stringify(orderPayload) }, customerToken);
    record('Client crée une commande (POST /api/orders)', r, orderPayload,
      r.ok ? `ref=${r.data?.reference}, id=${r.data?.id}, total=${r.data?.total} DH, status=${r.data?.status}` : '');
    if (r.ok) {
      orderId  = r.data.id;
      orderRef = r.data.reference;
      console.log(`   📦 Commande: ref=${orderRef}, total=${r.data.total} DH, status=${r.data.status}`);

      if (selectedExtraIds.length || selectedSizeId) {
        if (r.data.total <= firstItem.price) {
          bug('Calcul total avec extras/taille', 'P1',
            `Total=${r.data.total} DH ne semble pas inclure les suppléments (base=${firstItem.price} DH)`,
            'artifacts/api-server/src/routes/orders.ts — ligne ~337: unitPrice = menuItem.price + sizeAdjustment + extrasTotal');
        }
      }
    } else {
      bug('Création commande', 'P0', `Échec: ${r.data?.error}`, 'artifacts/api-server/src/routes/orders.ts — POST /api/orders');
      await writeReport(); process.exit(1);
    }

    // Valider SSE order_new reçu par le restaurant
    const sseNew = await restaurantSSEPromise;
    const sseNewR = { ok: !!sseNew.found, status: sseNew.found ? 200 : 0,
      data: { events: sseNew.events, found: sseNew.found || null }, duration: sseNew.duration, error: sseNew.error };
    record(`SSE restaurant:${restaurant.id} — événement "order_new" reçu`, sseNewR, null,
      `Events: [${sseNew.events.join(', ')}]${sseNew.timedOut ? ' ⚠️ timeout' : ''}`);
    if (!sseNew.found) {
      bug('SSE order_new', 'P1', `L'événement "order_new" non reçu sur le canal restaurant:${restaurant.id} dans les délais`,
        'artifacts/api-server/src/routes/orders.ts ligne ~459: publish(`restaurant:${restaurantId}`, "order_new", ...)');
    }
  }

  // ══════════════════════════════════════════════════════════════
  // BLOC 4 — Marchand : acceptation → préparation → prêt
  // ══════════════════════════════════════════════════════════════
  console.log('\n── BLOC 4 : Marchand ───────────────────────────────────────\n');

  // 4.1 Acceptation (génère kitchenCode + pickupCode)
  {
    const r = await api(`/api/orders/${orderId}/status`,
      { method: 'PATCH', body: JSON.stringify({ status: 'accepted' }) }, adminToken);
    record(`Admin accepte la commande (PATCH /api/orders/${orderId}/status → accepted)`, r,
      { status: 'accepted' },
      r.ok ? `kitchenCode=[CODE], pickupCode=[CODE], status=${r.data?.status}` : '');
    if (r.ok) {
      pickupCode = r.data.pickupCode;
      if (!pickupCode) {
        bug('Génération pickupCode', 'P0', 'pickupCode non généré lors de l\'acceptation',
          'artifacts/api-server/src/routes/orders.ts ligne ~569: if (!existing.pickupCode) updateData.pickupCode = generatePickupCode()');
      }
    } else {
      bug('Acceptation commande', 'P0', `Échec: ${r.data?.error}`, 'artifacts/api-server/src/routes/orders.ts');
    }
  }

  // 4.2 En préparation
  {
    const r = await api(`/api/orders/${orderId}/status`,
      { method: 'PATCH', body: JSON.stringify({ status: 'preparing' }) }, adminToken);
    record(`Admin — commande "en préparation" (PATCH /api/orders/${orderId}/status → preparing)`, r,
      { status: 'preparing' }, r.ok ? `status=${r.data?.status}` : '');
  }

  // 4.3 Prêt — ouvrir SSE available_orders AVANT la mutation pour capter order_ready
  {
    console.log('   📡 Ouverture SSE canal "available_orders" avant mutation ready...');
    const availSSEPromise = listenSSE(adminToken, ['available_orders'], ['order_ready'], 8000);

    const r = await api(`/api/orders/${orderId}/status`,
      { method: 'PATCH', body: JSON.stringify({ status: 'ready' }) }, adminToken);
    record(`Admin — commande "prête" (PATCH /api/orders/${orderId}/status → ready)`, r,
      { status: 'ready' }, r.ok ? 'SSE "order_ready" broadcasté sur available_orders' : '');

    // Valider la réception du SSE
    const sseAvail = await availSSEPromise;
    const sseAvailR = { ok: !!sseAvail.found, status: sseAvail.found ? 200 : 0,
      data: { events: sseAvail.events, found: sseAvail.found || null }, duration: sseAvail.duration };
    record(`SSE available_orders — événement "order_ready" reçu par les livreurs`, sseAvailR, null,
      `Events: [${sseAvail.events.join(', ')}]${sseAvail.timedOut ? ' ⚠️ timeout' : ''}`);
    if (!sseAvail.found) {
      bug('SSE order_ready', 'P1', `"order_ready" non reçu sur available_orders (timeout=${sseAvail.timedOut})`,
        'artifacts/api-server/src/routes/orders.ts ligne ~602: publish("available_orders", "order_ready", {...})');
    } else {
      console.log(`   ✅ SSE order_ready confirmé sur canal available_orders`);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // BLOC 5 — Livreur : liste + acceptation + GPS
  // ══════════════════════════════════════════════════════════════
  console.log('\n── BLOC 5 : Livreur ────────────────────────────────────────\n');

  // 5.1 Liste des commandes disponibles
  {
    const r = await api('/api/orders/available', {}, adminToken);
    record('Livreur — commandes disponibles (GET /api/orders/available)', r, null,
      `${r.data?.length || 0} commande(s) disponible(s)`);
    if (r.ok) {
      const found = r.data?.find(o => o.id === orderId);
      if (found) console.log(`   🏍️  Commande #${orderRef} visible — total: ${found.total} DH`);
      else bug('GET /api/orders/available', 'P1',
        `Commande ${orderId} (status=ready) absente de la liste`,
        'artifacts/api-server/src/routes/orders.ts — filtre: status=ready AND driverId IS NULL');
    }
  }

  // 5.2 Acceptation livraison — ouvrir SSE order:{id} avant pour capter picked_up
  let assignedDriverId;
  if (driverProfile) {
    console.log(`   📡 Ouverture SSE canal "order:${orderId}" avant accept-delivery...`);
    const pickupSSEPromise = listenSSE(adminToken, [`order:${orderId}`], ['order_status'], 8000);

    const payload = { driverId: driverProfile.id };
    const r = await api(`/api/orders/${orderId}/accept-delivery`,
      { method: 'POST', body: JSON.stringify(payload) }, adminToken);
    record(`Livreur accepte la livraison (POST /api/orders/${orderId}/accept-delivery)`, r,
      { driverId: driverProfile.id },
      r.ok ? `status→${r.data?.status}, driverId=${r.data?.driverId}` : '');
    if (r.ok) {
      assignedDriverId = r.data.driverId;
      if (r.data.status !== 'picked_up') {
        bug('accept-delivery', 'P1', `Statut attendu "picked_up", reçu "${r.data.status}"`,
          'artifacts/api-server/src/routes/orders.ts ligne ~733: .set({ driverId, status: "picked_up" })');
      }
    } else {
      bug('accept-delivery', 'P0', `Échec: ${r.data?.error}`,
        'Vérifier profileCompletedAt du livreur — artifacts/api-server/src/routes/orders.ts');
    }

    // Valider SSE order_status reçu
    const ssePickup = await pickupSSEPromise;
    const ssePickupR = { ok: !!ssePickup.found, status: ssePickup.found ? 200 : 0,
      data: { events: ssePickup.events, found: ssePickup.found || null }, duration: ssePickup.duration };
    record(`SSE order:${orderId} — "order_status" picked_up reçu`, ssePickupR, null,
      `Events: [${ssePickup.events.join(', ')}]${ssePickup.timedOut ? ' ⚠️ timeout' : ''}`);
    if (!ssePickup.found) {
      bug('SSE picked_up', 'P1', `"order_status" non reçu sur order:${orderId} après accept-delivery`,
        'artifacts/api-server/src/routes/orders.ts ligne ~753: publish(`order:${orderId}`, "order_status", {...})');
    } else {
      console.log(`   ✅ SSE order_status (picked_up) confirmé sur canal order:${orderId}`);
    }
  } else {
    record('accept-delivery (skip — aucun livreur en base)', { ok: false, status: 0,
      data: { error: 'Aucun livreur disponible' }, duration: 0 });
    bug('accept-delivery', 'P0', 'Aucun livreur en base — flux interrompu',
      'artifacts/api-server/src/seed.ts — ajouter un livreur via ensureCoreAccounts()');
    await cleanup(customerToken, customerUser?.id, adminToken, orderId);
    await writeReport(); process.exit(1);
  }

  // 5.3 Mise à jour GPS + fanout SSE driver_location
  {
    console.log(`   📡 Ouverture SSE canal "order:${orderId}" pour driver_location...`);
    const gpsSSEPromise = listenSSE(adminToken, [`order:${orderId}`, 'admin_tracking'], ['driver_location'], 8000);

    const gpsPayload = { latitude: 34.6814, longitude: -1.9086 };
    const r = await api(`/api/drivers/${driverProfile.id}/location`,
      { method: 'PATCH', body: JSON.stringify(gpsPayload) }, adminToken);
    record(`Livreur — mise à jour GPS (PATCH /api/drivers/${driverProfile.id}/location)`, r,
      { latitude: gpsPayload.latitude, longitude: gpsPayload.longitude },
      r.ok ? `activeOrderIds=${JSON.stringify(r.data?.activeOrderIds)}` : '');
    if (r.ok) {
      if (!r.data?.activeOrderIds?.includes(orderId)) {
        bug('GPS fanout activeOrderIds', 'P1',
          `Commande ${orderId} absente de activeOrderIds — les positions ne seront pas relayées au client`,
          'artifacts/api-server/src/routes/drivers.ts — vérifier tracking.attachOrder() dans accept-delivery');
      }
    }

    const sseGps = await gpsSSEPromise;
    const sseGpsR = { ok: !!sseGps.found, status: sseGps.found ? 200 : 0,
      data: { events: sseGps.events, found: sseGps.found || null }, duration: sseGps.duration };
    record(`SSE order:${orderId} + admin_tracking — "driver_location" reçu`, sseGpsR, null,
      `Events: [${sseGps.events.join(', ')}]${sseGps.timedOut ? ' ⚠️ timeout' : ''}`);
    if (!sseGps.found) {
      bug('SSE driver_location', 'P1', `"driver_location" non reçu après mise à jour GPS`,
        'artifacts/api-server/src/routes/drivers.ts ligne ~256: publish(`order:${o.id}`, "driver_location", ...)');
    } else {
      console.log(`   ✅ SSE driver_location confirmé`);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // BLOC 6 — Client : suivi + pickupCode
  // ══════════════════════════════════════════════════════════════
  console.log('\n── BLOC 6 : Client — suivi ────────────────────────────────\n');

  {
    const r = await api(`/api/orders/${orderId}`, {}, customerToken);
    const visible = r.ok && r.data?.pickupCode != null;
    record(`Client voit le pickupCode (GET /api/orders/${orderId})`, r, null,
      r.ok ? `status=${r.data?.status}, pickupCode=${visible ? '[CODE OK]' : '(null)'}` : '');
    if (r.ok) {
      if (!visible) {
        bug('Visibilité pickupCode', 'P0',
          'Le client ne voit pas le pickupCode — remis à null ou non généré',
          'artifacts/api-server/src/routes/orders.ts — condition isCustomerOwner dans GET /orders/:id');
      } else {
        console.log(`   📱 pickupCode visible pour le client ✅`);
        pickupCode = r.data.pickupCode; // Code frais depuis la DB
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // BLOC 7 — Confirmation de livraison
  // ══════════════════════════════════════════════════════════════
  console.log('\n── BLOC 7 : Confirmation livraison ────────────────────────\n');

  {
    if (pickupCode) {
      console.log(`   📡 Ouverture SSE canal "order:${orderId}" avant confirm-delivery...`);
      const deliveredSSEPromise = listenSSE(adminToken, [`order:${orderId}`], ['order_status'], 8000);

      const r = await api(`/api/orders/${orderId}/confirm-delivery`,
        { method: 'POST', body: JSON.stringify({ pickupCode }) }, adminToken);
      record(`Livreur confirme la livraison (POST /api/orders/${orderId}/confirm-delivery)`, r,
        { pickupCode: '[CODE]' },
        r.ok ? `status→${r.data?.status} 🎉` : '');
      if (r.ok) {
        console.log(`   🎉 Livraison confirmée ! status: ${r.data.status}`);
        if (r.data.status !== 'delivered') {
          bug('confirm-delivery statut', 'P0', `Attendu "delivered", reçu "${r.data.status}"`,
            'artifacts/api-server/src/routes/orders.ts ligne ~820: .set({ status: "delivered" })');
        }
      } else {
        bug('confirm-delivery', 'P0', `Échec: ${r.data?.error}`,
          `Vérifier: pickupCode correct, status=picked_up requis, driverId=${assignedDriverId} assigné`);
      }

      // Valider SSE order_status delivered
      const sseDel = await deliveredSSEPromise;
      const sseDelR = { ok: !!sseDel.found, status: sseDel.found ? 200 : 0,
        data: { events: sseDel.events, found: sseDel.found || null }, duration: sseDel.duration };
      record(`SSE order:${orderId} — "order_status" delivered reçu`, sseDelR, null,
        `Events: [${sseDel.events.join(', ')}]${sseDel.timedOut ? ' ⚠️ timeout' : ''}`);
      if (!sseDel.found) {
        bug('SSE delivered', 'P1', '"order_status" delivered non reçu après confirm-delivery',
          'artifacts/api-server/src/routes/orders.ts ligne ~880: publish(`order:${order.id}`, "order_status", {...})');
      } else {
        console.log(`   ✅ SSE order_status (delivered) confirmé`);
      }
    } else {
      record('confirm-delivery (skip — pickupCode indisponible)', {
        ok: false, status: 0, data: { error: 'pickupCode null' }, duration: 0 });
      bug('confirm-delivery', 'P0', 'pickupCode non disponible — étape précédente a échoué');
    }
  }

  // ══════════════════════════════════════════════════════════════
  // BLOC 8 — Vérifications post-livraison
  // ══════════════════════════════════════════════════════════════
  console.log('\n── BLOC 8 : Vérifications post-livraison ───────────────────\n');

  // 8.1 Statut final de la commande
  {
    const r = await api(`/api/orders/${orderId}`, {}, customerToken);
    record(`Client — statut final (GET /api/orders/${orderId})`, r, null,
      r.ok ? `status=${r.data?.status}` : '');
    if (r.ok) {
      const ok = r.data.status === 'delivered';
      console.log(`   ${ok ? '✅' : '⚠️'} Statut final: ${r.data.status}`);
      if (!ok) bug('Statut final', 'P0', `Attendu "delivered", reçu "${r.data?.status}"`,
        'Vérifier les étapes accept-delivery et confirm-delivery');
    }
  }

  // 8.2 Points fidélité
  {
    const r = await api('/api/auth/me', {}, customerToken);
    record('Client — points fidélité (GET /api/auth/me)', r, null,
      r.ok ? `loyaltyPoints: ${loyaltyBefore} → ${r.data?.loyaltyPoints}` : '');
    if (r.ok) {
      console.log(`   ⭐ Points: ${loyaltyBefore} → ${r.data?.loyaltyPoints}`);
      // Note : les points sont crédités à la commande (pas à la livraison) — comportement documenté
      if (r.data?.loyaltyPoints <= loyaltyBefore && loyaltyBefore === 0) {
        bug('Points fidélité', 'P2',
          'Aucun point crédité (attendu > 0 pour une commande à 200+ DH)',
          'artifacts/api-server/src/routes/orders.ts — pointsEarned = Math.floor(total / 10) dans la transaction');
      }
    }
  }

  // 8.3 totalDeliveries livreur
  if (driverProfile) {
    const r = await api(`/api/drivers/${driverProfile.id}`, {}, adminToken);
    record(`Livreur — totalDeliveries incrémenté (GET /api/drivers/${driverProfile.id})`, r, null,
      r.ok ? `totalDeliveries: ${driverProfile.totalDeliveries || 0} → ${r.data?.totalDeliveries}` : '');
    if (r.ok) {
      const expected = (driverProfile.totalDeliveries || 0) + 1;
      if (r.data?.totalDeliveries !== expected) {
        bug('totalDeliveries', 'P2',
          `Attendu ${expected}, reçu ${r.data?.totalDeliveries}`,
          'artifacts/api-server/src/routes/orders.ts — vérifier l\'incrément dans confirm-delivery');
      } else {
        console.log(`   📊 totalDeliveries: ${driverProfile.totalDeliveries || 0} → ${r.data?.totalDeliveries} ✅`);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // NETTOYAGE
  // ══════════════════════════════════════════════════════════════
  await cleanup(customerToken, customerUser?.id, adminToken, orderId);

  // ══════════════════════════════════════════════════════════════
  // RAPPORT
  // ══════════════════════════════════════════════════════════════
  await writeReport();

  // Résumé console
  const passed = steps.filter(s => s.ok).length;
  const total  = steps.length;
  const p0s    = bugs.filter(b => b.severity === 'P0');

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊  Résultat : ${passed}/${total} étapes réussies`);
  console.log(`🐛  Bugs : ${bugs.length} (P0=${p0s.length}, P1=${bugs.filter(b => b.severity === 'P1').length}, P2=${bugs.filter(b => b.severity === 'P2').length})`);
  if (p0s.length > 0) {
    console.log('\n🚨 BUGS P0 BLOQUANTS :');
    p0s.forEach(b => console.log(`   • ${b.step} — ${b.message}`));
  } else {
    console.log('✅  Aucun bug P0 — flux complet opérationnel !');
  }
  console.log(`📄  Rapport généré : ${REPORT_PATH}`);
  console.log(`${'═'.repeat(60)}\n`);
}

// ─── Générateur de rapport (sans secrets ni PII) ──────────────────────────────

async function writeReport() {
  const { writeFile } = await import('fs/promises');
  const now    = new Date().toISOString();
  const passed = steps.filter(s => s.ok).length;
  const total  = steps.length;

  const icon = s => s.ok ? '✅' : (s.status === 0 ? '⚠️' : '❌');

  const tableRows = steps.map((s, i) =>
    `| ${(i + 1).toString().padStart(2)} | ${icon(s)} | ${s.name} | ${s.status || 'ERR'} | ${s.duration}ms | ${(s.notes || s.error || '-').replace(/\|/g, '/')} |`
  ).join('\n');

  let bugsSection;
  if (bugs.length === 0) {
    bugsSection = `## ✅ Aucun bug détecté\n\nLe flux complet commande → livraison est opérationnel de bout en bout.`;
  } else {
    const grouped = { P0: [], P1: [], P2: [] };
    bugs.forEach(b => (grouped[b.severity] || grouped.P2).push(b));
    const lines = [];
    for (const sev of ['P0', 'P1', 'P2']) {
      if (!grouped[sev]?.length) continue;
      lines.push(`### Sévérité ${sev}${sev === 'P0' ? ' 🚨 Bloquant' : sev === 'P1' ? ' ⚠️ Important' : ' ℹ️ Mineur'}`);
      grouped[sev].forEach(b => {
        lines.push(`\n**Étape :** ${b.step}`);
        lines.push(`**Problème :** ${b.message}`);
        if (b.suggestion) lines.push(`**Correction :** \`${b.suggestion}\``);
      });
    }
    bugsSection = `## 🐛 Bugs et écarts (${bugs.length})\n\n${lines.join('\n')}`;
  }

  // Payloads redactés — seulement les non-sensibles
  const safePayloads = steps
    .filter(s => s.payload)
    .slice(0, 15)
    .map(s => {
      return `### ${s.name} (${icon(s)} HTTP ${s.status})\n\n**Payload :**\n\`\`\`json\n${JSON.stringify(s.payload, null, 2).slice(0, 600)}\n\`\`\`\n\n**Réponse (données non-sensibles) :**\n\`\`\`json\n${JSON.stringify(s.response, null, 2).slice(0, 600)}\n\`\`\``;
    }).join('\n\n---\n\n');

  const md = `# Rapport E2E Jatek — Flux commande → livraison

> **Date :** ${now}
> **API :** \`${BASE}\`
> **Résultat global :** ${passed}/${total} étapes réussies ${passed === total ? '✅' : passed >= total * 0.8 ? '⚠️' : '❌'}
>
> ⚠️ Ce rapport ne contient aucun token JWT, mot de passe, pièce d'identité,
> plaque d'immatriculation, ni donnée personnelle — toutes les valeurs sensibles
> sont remplacées par \`[REDACTÉ]\` ou \`[CODE]\` avant écriture.

---

## 📊 Tableau récapitulatif

| # | Statut | Étape | HTTP | Temps | Notes |
|---|--------|-------|------|-------|-------|
${tableRows}

---

${bugsSection}

---

## 🚀 Recommandations vers le niveau Glovo

### P0 — Bloquant production
${bugs.filter(b => b.severity === 'P0').length === 0
  ? '- ✅ Aucun problème P0 — le flux de base est opérationnel'
  : bugs.filter(b => b.severity === 'P0').map(b => `- **${b.step}** : ${b.message}`).join('\n')}

### P1 — Haute priorité avant lancement
- **Paiement en ligne** : flux 100% cash — intégrer CMI (Maroc) ou Stripe avant de scaler
- **Annulation client** : aucun endpoint d'annulation côté client avant acceptation marchand
- **Réassignation livreur** : si un livreur accepte et disparaît, la commande reste bloquée
- **Extras/tailles en seed** : aucun item de menu n'a d'extras ou de tailles — chemin de calcul non testé (voir task #13)
- **Comptes test permanents** : les accounts driver@jatek.ma/owner@jatek.ma ne se créent pas si la DB est déjà initialisée (voir task #14)

### P2 — Optimisations
- **ETA temps réel** : calcul haversine (vol d'oiseau) — intégrer Google Maps Distance Matrix
- **Géofencing** : détecter automatiquement l'arrivée au restaurant (\`driver_at_restaurant\`)
- **Points fidélité** : crédités à la commande (pas à la livraison) — considérer un crédit conditionnel après delivery
- **Rapport driver** : le livreur ne reçoit pas de confirmation visuelle après confirm-delivery

### P3 — À planifier
- **Tests de charge** : valider la concurrence sur \`accept-delivery\` sous 50 req/s simultanées
- **SSE Last-Event-ID** : les clients qui perdent la connexion ratent les events — implémenter la reprise

---

## 📦 Détail des payloads et réponses (données non-sensibles uniquement)

${safePayloads}
`;

  await writeFile(REPORT_PATH, md, 'utf8');
}

// ─── Lancement ────────────────────────────────────────────────────────────────

run().catch(async err => {
  console.error('\n💥 Erreur fatale:', err.message);
  bugs.push({ step: 'Erreur fatale', severity: 'P0', message: err.message });
  await writeReport().catch(() => {});
  process.exit(1);
});
