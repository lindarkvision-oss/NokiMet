// ===================== db.js - Module de stockage IndexedDB =====================
// À placer dans le dossier racine et à inclure avant script.js

const DB_NAME = 'NokiMetricsDB';
const DB_VERSION = 1;
const STORES = {
  ENTRIES: 'entries',
  PRODUCTS: 'products',
  MOVEMENTS: 'movements',
  FIXED_CHARGES: 'fixedCharges'
};

// Interface de base de données
let db = null;

// ===================== INITIALISATION INDEXEDDB =====================
async function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('✅ IndexedDB initialisée avec succès');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const dbInstance = event.target.result;
      
      // Store des saisies (campagnes)
      if (!dbInstance.objectStoreNames.contains(STORES.ENTRIES)) {
        const entriesStore = dbInstance.createObjectStore(STORES.ENTRIES, { keyPath: 'id' });
        entriesStore.createIndex('dateISO', 'dateISO', { unique: false });
        entriesStore.createIndex('campaign', 'campaign', { unique: false });
        console.log('✅ Store ENTRIES créé');
      }
      
      // Store des produits
      if (!dbInstance.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productsStore = dbInstance.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
        productsStore.createIndex('name', 'name', { unique: false });
        console.log('✅ Store PRODUCTS créé');
      }
      
      // Store des mouvements de stock
      if (!dbInstance.objectStoreNames.contains(STORES.MOVEMENTS)) {
        const movementsStore = dbInstance.createObjectStore(STORES.MOVEMENTS, { keyPath: 'id' });
        movementsStore.createIndex('date', 'date', { unique: false });
        movementsStore.createIndex('product', 'product', { unique: false });
        console.log('✅ Store MOVEMENTS créé');
      }
      
      // Store des charges fixes
      if (!dbInstance.objectStoreNames.contains(STORES.FIXED_CHARGES)) {
        dbInstance.createObjectStore(STORES.FIXED_CHARGES, { keyPath: 'id', autoIncrement: true });
        console.log('✅ Store FIXED_CHARGES créé');
      }
    };
  });
}

// ===================== REQUEST PERMANENT STORAGE =====================
async function requestPersistentStorage() {
  if (!navigator.storage || !navigator.storage.persist) {
    console.log('⚠️ StorageManager non supporté');
    return false;
  }
  
  try {
    const isPersisted = await navigator.storage.persisted();
    if (isPersisted) {
      console.log('✅ Stockage persistant déjà accordé');
      return true;
    }
    
    const granted = await navigator.storage.persist();
    if (granted) {
      console.log('✅ Stockage persistant accordé - vos données sont protégées');
      showToast('💾 Stockage permanent activé - vos données sont sécurisées');
    } else {
      console.log('⚠️ Stockage persistant refusé');
    }
    return granted;
  } catch (e) {
    console.error('Erreur request persistence:', e);
    return false;
  }
}

// ===================== ENTRÉES (Campagnes) =====================
async function saveEntryDB(entry) {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.ENTRIES], 'readwrite');
    const store = transaction.objectStore(STORES.ENTRIES);
    const request = store.put(entry);
    
    request.onsuccess = () => resolve(entry);
    request.onerror = () => reject(request.error);
  });
}

async function getAllEntriesDB() {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.ENTRIES], 'readonly');
    const store = transaction.objectStore(STORES.ENTRIES);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function deleteEntryDB(id) {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.ENTRIES], 'readwrite');
    const store = transaction.objectStore(STORES.ENTRIES);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

async function clearAllEntriesDB() {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.ENTRIES], 'readwrite');
    const store = transaction.objectStore(STORES.ENTRIES);
    const request = store.clear();
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

async function getFilteredEntriesDB(campaign, dateFrom, dateTo) {
  let entries = await getAllEntriesDB();
  
  return entries.filter(e => {
    if (campaign && !e.campaign.toLowerCase().includes(campaign.toLowerCase())) return false;
    if (dateFrom && e.dateISO < dateFrom) return false;
    if (dateTo && e.dateISO > dateTo) return false;
    return true;
  });
}

// ===================== PRODUITS =====================
async function saveProductDB(product) {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PRODUCTS], 'readwrite');
    const store = transaction.objectStore(STORES.PRODUCTS);
    const request = store.put(product);
    
    request.onsuccess = () => resolve(product);
    request.onerror = () => reject(request.error);
  });
}

async function getAllProductsDB() {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PRODUCTS], 'readonly');
    const store = transaction.objectStore(STORES.PRODUCTS);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function updateProductQtyDB(productId, newQty) {
  const products = await getAllProductsDB();
  const product = products.find(p => p.id === productId);
  if (product) {
    product.qty = newQty;
    await saveProductDB(product);
  }
}

async function deleteProductDB(productId) {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PRODUCTS], 'readwrite');
    const store = transaction.objectStore(STORES.PRODUCTS);
    const request = store.delete(productId);
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// ===================== MOUVEMENTS DE STOCK =====================
async function saveMovementDB(movement) {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.MOVEMENTS], 'readwrite');
    const store = transaction.objectStore(STORES.MOVEMENTS);
    const request = store.put(movement);
    
    request.onsuccess = () => resolve(movement);
    request.onerror = () => reject(request.error);
  });
}

async function getAllMovementsDB() {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.MOVEMENTS], 'readonly');
    const store = transaction.objectStore(STORES.MOVEMENTS);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function deleteMovementsByDateRange(dateFrom, dateTo) {
  const movements = await getAllMovementsDB();
  const filtered = movements.filter(m => m.date < dateFrom || m.date > dateTo);
  
  await clearAllMovementsDB();
  for (const m of filtered) {
    await saveMovementDB(m);
  }
  return movements.length - filtered.length;
}

async function clearAllMovementsDB() {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.MOVEMENTS], 'readwrite');
    const store = transaction.objectStore(STORES.MOVEMENTS);
    const request = store.clear();
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// ===================== CHARGES FIXES =====================
async function saveFixedChargesDB(charges) {
  if (!db) await initIndexedDB();
  
  // Supprimer l'ancien store et recréer
  await clearAllFixedChargesDB();
  
  for (const charge of charges) {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.FIXED_CHARGES], 'readwrite');
      const store = transaction.objectStore(STORES.FIXED_CHARGES);
      const request = store.add(charge);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

async function getAllFixedChargesDB() {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.FIXED_CHARGES], 'readonly');
    const store = transaction.objectStore(STORES.FIXED_CHARGES);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function clearAllFixedChargesDB() {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.FIXED_CHARGES], 'readwrite');
    const store = transaction.objectStore(STORES.FIXED_CHARGES);
    const request = store.clear();
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// ===================== MIGRATION DEPUIS LOCALSTORAGE =====================
async function migrateFromLocalStorage() {
  console.log('🔄 Vérification migration depuis localStorage...');
  
  const migrationDone = localStorage.getItem('noki_migration_v2_done');
  if (migrationDone === 'true') {
    console.log('✅ Migration déjà effectuée');
    return;
  }
  
  try {
    // Récupérer les anciennes données
    const oldStateRaw = localStorage.getItem('noki_v3');
    if (oldStateRaw) {
      const oldState = JSON.parse(oldStateRaw);
      
      // Migrer les entrées
      if (oldState.entries && oldState.entries.length > 0) {
        for (const entry of oldState.entries) {
          await saveEntryDB(entry);
        }
        console.log(`✅ ${oldState.entries.length} entrées migrées`);
      }
      
      // Migrer les charges fixes
      if (oldState.fixedCharges && oldState.fixedCharges.length > 0) {
        await saveFixedChargesDB(oldState.fixedCharges);
        console.log(`✅ ${oldState.fixedCharges.length} charges fixes migrées`);
      }
    }
    
    // Migrer le stock
    const oldStockRaw = localStorage.getItem('noki_stock');
    if (oldStockRaw) {
      const oldStock = JSON.parse(oldStockRaw);
      
      if (oldStock.products && oldStock.products.length > 0) {
        for (const product of oldStock.products) {
          await saveProductDB(product);
        }
        console.log(`✅ ${oldStock.products.length} produits migrés`);
      }
      
      if (oldStock.movements && oldStock.movements.length > 0) {
        for (const movement of oldStock.movements) {
          await saveMovementDB(movement);
        }
        console.log(`✅ ${oldStock.movements.length} mouvements migrés`);
      }
    }
    
    localStorage.setItem('noki_migration_v2_done', 'true');
    console.log('🎉 Migration terminée avec succès');
    showToast('📀 Migration vers stockage sécurisé terminée');
    
  } catch (err) {
    console.error('❌ Erreur migration:', err);
  }
}

// ===================== SYNC VERS LOCALSTORAGE (UI Cache) =====================
async function syncUIStateToLocalStorage() {
  // Récupérer les données pour l'UI depuis IndexedDB
  const entries = await getAllEntriesDB();
  const products = await getAllProductsDB();
  const movements = await getAllMovementsDB();
  const charges = await getAllFixedChargesDB();
  
  // Mettre à jour l'objet state pour l'UI
  state.entries = entries;
  state.fixedCharges = charges;
  
  // Mettre à jour le stock dans state.stock pour compatibilité
  state.stock = { products, movements };
  
  // Sauvegarder aussi dans localStorage pour compatibilité
  saveState();
  
  // Sauvegarder le stock séparément
  try {
    localStorage.setItem('noki_stock', JSON.stringify({ products, movements }));
  } catch(e) {}
}

// Exporter les fonctions globales
window.initIndexedDB = initIndexedDB;
window.requestPersistentStorage = requestPersistentStorage;
window.saveEntryDB = saveEntryDB;
window.getAllEntriesDB = getAllEntriesDB;
window.deleteEntryDB = deleteEntryDB;
window.clearAllEntriesDB = clearAllEntriesDB;
window.getFilteredEntriesDB = getFilteredEntriesDB;
window.saveProductDB = saveProductDB;
window.getAllProductsDB = getAllProductsDB;
window.updateProductQtyDB = updateProductQtyDB;
window.deleteProductDB = deleteProductDB;
window.saveMovementDB = saveMovementDB;
window.getAllMovementsDB = getAllMovementsDB;
window.deleteMovementsByDateRange = deleteMovementsByDateRange;
window.clearAllMovementsDB = clearAllMovementsDB;
window.saveFixedChargesDB = saveFixedChargesDB;
window.getAllFixedChargesDB = getAllFixedChargesDB;
window.clearAllFixedChargesDB = clearAllFixedChargesDB;
window.migrateFromLocalStorage = migrateFromLocalStorage;
window.syncUIStateToLocalStorage = syncUIStateToLocalStorage;
