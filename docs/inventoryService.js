// inventoryService.js
// Responsible for inventory state, validation, and persistence (local for Milestone Two).

const STORAGE_KEY = "cs499_inventory_items_v1";

/**
 * @typedef {Object} Item
 * @property {string} id
 * @property {string} name
 * @property {string} sku
 * @property {number} quantity
 * @property {number} price
 */

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function normalizeSku(sku) {
  return sku.trim().toUpperCase();
}

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

function saveToStorage(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export class InventoryService {
  constructor() {
    /** @type {Item[]} */
    this.items = loadFromStorage();
  }

  resetDemoData() {
    this.items = [
      { id: makeId(), name: "Coffee Beans", sku: "CB-100", quantity: 3, price: 12.99 },
      { id: makeId(), name: "Filters", sku: "FLT-200", quantity: 25, price: 4.50 },
      { id: makeId(), name: "Mugs", sku: "MUG-300", quantity: 6, price: 8.00 },
    ];
    saveToStorage(this.items);
  }

  getAll() {
    return [...this.items];
  }

  /**
   * Basic validation for Milestone Two.
   * Returns { ok: boolean, message: string, value?: Partial<Item> }
   */
  validateDraft(draft, { existingId = null } = {}) {
    const name = (draft.name ?? "").trim();
    const skuRaw = (draft.sku ?? "").trim();
    const sku = normalizeSku(skuRaw);
    const quantity = toNumber(draft.quantity);
    const price = toNumber(draft.price);

    if (!name) return { ok: false, message: "Name is required." };
    if (!sku) return { ok: false, message: "SKU is required." };
    if (!Number.isInteger(quantity) || quantity < 0) return { ok: false, message: "Quantity must be a non-negative integer." };
    if (!Number.isFinite(price) || price < 0) return { ok: false, message: "Price must be a non-negative number." };

    // SKU uniqueness check
    const conflict = this.items.find(i => i.sku.toUpperCase() === sku && i.id !== existingId);
    if (conflict) return { ok: false, message: "SKU must be unique." };

    return { ok: true, message: "OK", value: { name, sku, quantity, price } };
  }

  addItem(draft) {
    const v = this.validateDraft(draft);
    if (!v.ok) return v;

    const item = { id: makeId(), ...v.value };
    this.items.push(item);
    saveToStorage(this.items);
    return { ok: true, message: "Item added.", item };
  }

  updateItem(id, draft) {
    const v = this.validateDraft(draft, { existingId: id });
    if (!v.ok) return v;

    const idx = this.items.findIndex(i => i.id === id);
    if (idx === -1) return { ok: false, message: "Item not found." };

    this.items[idx] = { ...this.items[idx], ...v.value };
    saveToStorage(this.items);
    return { ok: true, message: "Item updated.", item: this.items[idx] };
  }

  deleteItem(id) {
    const idx = this.items.findIndex(i => i.id === id);
    if (idx === -1) return { ok: false, message: "Item not found." };

    this.items.splice(idx, 1);
    saveToStorage(this.items);
    return { ok: true, message: "Item deleted." };
  }
}
