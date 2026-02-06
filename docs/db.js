// db.js
//
// Milestone Four (Databases):
// IndexedDB is a native browser database API. It works on GitHub Pages because
// it does not require a backend server. This gives the project real persistence
// and allows me to demonstrate database concepts like schema, indexes, and transactions.
//
// Database design choices:
// - DB name: cs499_inventory_db
// - Object store (table): items
// - Primary key: id (keyPath)
// - Unique index on sku to enforce data integrity at the database level

const DB_NAME = "cs499_inventory_db";
const DB_VERSION = 1;
const STORE_ITEMS = "items";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Runs when the DB is first created OR version changes
    request.onupgradeneeded = () => {
      const db = request.result;

      // Object store is basically a table
      const store = db.createObjectStore(STORE_ITEMS, { keyPath: "id" });

      // Unique index ensures duplicate SKUs cannot exist in the DB
      store.createIndex("sku", "sku", { unique: true });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Converts an IndexedDB request into a Promise so async/await works cleanly
function runRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// READ: get all items
export async function getAllItems() {
  const db = await openDb();
  const tx = db.transaction(STORE_ITEMS, "readonly");
  const store = tx.objectStore(STORE_ITEMS);

  const result = await runRequest(store.getAll());
  db.close();
  return result || [];
}

// CREATE/UPDATE: put = insert or update (upsert)
export async function putItem(item) {
  const db = await openDb();
  const tx = db.transaction(STORE_ITEMS, "readwrite");
  const store = tx.objectStore(STORE_ITEMS);

  await runRequest(store.put(item));
  db.close();
  return true;
}

// DELETE by primary key (id)
export async function deleteItemById(id) {
  const db = await openDb();
  const tx = db.transaction(STORE_ITEMS, "readwrite");
  const store = tx.objectStore(STORE_ITEMS);

  await runRequest(store.delete(id));
  db.close();
  return true;
}

// Utility: clear store and seed it with demo data
export async function clearAndSeed(items) {
  const db = await openDb();
  const tx = db.transaction(STORE_ITEMS, "readwrite");
  const store = tx.objectStore(STORE_ITEMS);

  await runRequest(store.clear());

  for (const item of items) {
    await runRequest(store.put(item));
  }

  db.close();
  return true;
}

// READ using an index (sku index)
export async function getBySku(sku) {
  const db = await openDb();
  const tx = db.transaction(STORE_ITEMS, "readonly");
  const store = tx.objectStore(STORE_ITEMS);
  const index = store.index("sku");

  const result = await runRequest(index.get(sku));
  db.close();
  return result || null;
}
