// inventoryService.js
//
// This service manages inventory state, validation, and persistence.
// For Milestone Three, it was enhanced to include a Map-based index
// for SKU lookups, improving efficiency and clarity.

const STORAGE_KEY = "cs499_inventory_items_v1";

// Generates a reasonably unique identifier for each item
function makeId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);
}

// Safely converts values to numbers
function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

// Normalizes SKUs so comparisons are consistent
function normalizeSku(sku) {
  return sku.trim().toUpperCase();
}

// Loads inventory data from browser storage
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Saves inventory data to browser storage
function saveToStorage(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export class InventoryService {
  constructor() {
    // Primary data structure: array for ordered iteration and rendering
    this.items = loadFromStorage();

    // Secondary data structure: Map for fast SKU lookups
    // This allows average O(1) access instead of linear searches
    this.skuIndex = new Map();

    this.rebuildIndex();
  }

  // Rebuilds the SKU index to keep it in sync with the items array
  rebuildIndex() {
    this.skuIndex.clear();
    for (const item of this.items) {
      this.skuIndex.set(normalizeSku(item.sku), item);
    }
  }

  // Resets inventory with small demo data for testing and presentation
  resetDemoData() {
    this.items = [
      { id: makeId(), name: "Coffee Beans", sku: "CB-100", quantity: 3, price: 12.99 },
      { id: makeId(), name: "Filters", sku: "FLT-200", quantity: 25, price: 4.50 },
      { id: makeId(), name: "Mugs", sku: "MUG-300", quantity: 6, price: 8.00 },
    ];

    this.rebuildIndex();
    saveToStorage(this.items);
  }

  // Returns a shallow copy to prevent accidental external mutation
  getAll() {
    return [...this.items];
  }

  // Retrieves an item by SKU using the Map-based index
  getBySku(sku) {
    return this.skuIndex.get(normalizeSku(sku)) || null;
  }

  // Validates user input before modifying inventory data
  validateDraft(draft, { existingId = null } = {}) {
    const name = (draft.name ?? "").trim();
    const skuRaw = (draft.sku ?? "").trim();
    const sku = normalizeSku(skuRaw);
    const quantity = toNumber(draft.quantity);
    const price = toNumber(draft.price);

    if (!name) return { ok: false, message: "Name is required." };
    if (!sku) return { ok: false, message: "SKU is required." };
    if (!Number.isInteger(quantity) || quantity < 0) {
      return { ok: false, message: "Quantity must be a non-negative integer." };
    }
    if (!Number.isFinite(price) || price < 0) {
      return { ok: false, message: "Price must be a non-negative number." };
    }

    // Uses Map for efficient SKU uniqueness validation
    const existing = this.skuIndex.get(sku);
    if (existing && existing.id !== existingId) {
      return { ok: false, message: "SKU must be unique." };
    }

    return { ok: true, message: "OK", value: { name, sku, quantity, price } };
  }

  addItem(draft) {
    const v = this.validateDraft(draft);
    if (!v.ok) return v;

    const item = { id: makeId(), ...v.value };
    this.items.push(item);

    // Update Map index to keep data structures in sync
    this.skuIndex.set(item.sku, item);
    saveToStorage(this.items);

    return { ok: true, message: "Item added.", item };
  }

  updateItem(id, draft) {
    const v = this.validateDraft(draft, { existingId: id });
    if (!v.ok) return v;

    const idx = this.items.findIndex(i => i.id === id);
    if (idx === -1) return { ok: false, message: "Item not found." };

    const oldSku = normalizeSku(this.items[idx].sku);
    const nextSku = normalizeSku(v.value.sku);

    this.items[idx] = { ...this.items[idx], ...v.value };

    // Maintain correctness of the SKU index
    if (oldSku !== nextSku) {
      this.skuIndex.delete(oldSku);
    }
    this.skuIndex.set(nextSku, this.items[idx]);

    saveToStorage(this.items);
    return { ok: true, message: "Item updated.", item: this.items[idx] };
  }

  deleteItem(id) {
    const idx = this.items.findIndex(i => i.id === id);
    if (idx === -1) return { ok: false, message: "Item not found." };

    const sku = normalizeSku(this.items[idx].sku);

    this.items.splice(idx, 1);
    this.skuIndex.delete(sku);

    saveToStorage(this.items);
    return { ok: true, message: "Item deleted." };
  }
}