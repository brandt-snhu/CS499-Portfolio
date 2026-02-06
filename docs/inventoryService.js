// inventoryService.js
//
// This file is the business logic layer for the inventory app.
// It handles validation, keeps an in-memory copy for the UI,
// and now persists data through IndexedDB for Milestone Four.
//
// It also enforces write permission at the service layer so that
// write actions are blocked even if someone tries to bypass the UI.

import { getAllItems, putItem, deleteItemById, clearAndSeed } from "./db.js";

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

export class InventoryService {
  constructor(permissionManager) {
    this.perms = permissionManager;

    // Primary structure: array for rendering and iteration
    this.items = [];

    // Secondary structure: Map for fast SKU checks (average O(1))
    this.skuIndex = new Map();
  }

  // Load items from the database into memory at startup
  async init() {
    this.items = await getAllItems();
    this.rebuildIndex();
  }

  // Keep the Map index consistent with the array
  rebuildIndex() {
    this.skuIndex.clear();
    for (const item of this.items) {
      this.skuIndex.set(normalizeSku(item.sku), item);
    }
  }

  getAll() {
    return [...this.items];
  }

  // Centralized validation so add/update share the same rules
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

    // SKU uniqueness is enforced two ways:
    // - In memory using Map
    // - In IndexedDB using a unique index on sku
    const existing = this.skuIndex.get(sku);
    if (existing && existing.id !== existingId) {
      return { ok: false, message: "SKU must be unique." };
    }

    return { ok: true, message: "OK", value: { name, sku, quantity, price } };
  }

  // Small helper to enforce least privilege
  requireWritePermission() {
    if (!this.perms.canWrite()) {
      return { ok: false, message: "Read-only mode. Unlock admin mode to make changes." };
    }
    return { ok: true };
  }

  async addItem(draft) {
    const gate = this.requireWritePermission();
    if (!gate.ok) return gate;

    const v = this.validateDraft(draft);
    if (!v.ok) return v;

    const item = { id: makeId(), ...v.value };

    try {
      await putItem(item);
    } catch {
      // If the DB unique index blocks the insert, show a friendly message
      return { ok: false, message: "Database rejected this item (possible duplicate SKU)." };
    }

    this.items.push(item);
    this.skuIndex.set(item.sku, item);

    return { ok: true, message: "Item added.", item };
  }

  async updateItem(id, draft) {
    const gate = this.requireWritePermission();
    if (!gate.ok) return gate;

    const v = this.validateDraft(draft, { existingId: id });
    if (!v.ok) return v;

    const idx = this.items.findIndex(i => i.id === id);
    if (idx === -1) return { ok: false, message: "Item not found." };

    const oldSku = normalizeSku(this.items[idx].sku);
    const updated = { ...this.items[idx], ...v.value };

    try {
      await putItem(updated);
    } catch {
      return { ok: false, message: "Database rejected this update (possible duplicate SKU)." };
    }

    this.items[idx] = updated;

    const newSku = normalizeSku(updated.sku);
    if (oldSku !== newSku) {
      this.skuIndex.delete(oldSku);
    }
    this.skuIndex.set(newSku, updated);

    return { ok: true, message: "Item updated.", item: updated };
  }

  async deleteItem(id) {
    const gate = this.requireWritePermission();
    if (!gate.ok) return gate;

    const idx = this.items.findIndex(i => i.id === id);
    if (idx === -1) return { ok: false, message: "Item not found." };

    const sku = normalizeSku(this.items[idx].sku);

    await deleteItemById(id);

    this.items.splice(idx, 1);
    this.skuIndex.delete(sku);

    return { ok: true, message: "Item deleted." };
  }

  async resetDemoData() {
    const gate = this.requireWritePermission();
    if (!gate.ok) return gate;

    const demo = [
      { id: makeId(), name: "Coffee Beans", sku: "CB-100", quantity: 3, price: 12.99 },
      { id: makeId(), name: "Filters", sku: "FLT-200", quantity: 25, price: 4.50 },
      { id: makeId(), name: "Mugs", sku: "MUG-300", quantity: 6, price: 8.00 },
    ];

    await clearAndSeed(demo);

    this.items = demo;
    this.rebuildIndex();

    return { ok: true, message: "Demo data reset and saved to database." };
  }
}