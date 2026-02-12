// ui.js
//
// This file handles all user interface logic for the inventory application.
// Responsibilities:
// - Rendering the inventory table and summary
// - Handling form input and validation feedback
// - Wiring up search and sort functionality
// - Calling the InventoryService for all CRUD operations
// - Reflecting permission state (read-only vs admin unlocked)
//
// Milestone Three:
// - Uses a custom merge sort implementation for predictable O(n log n) sorting
//
// Milestone Four:
// - All write operations are async due to IndexedDB persistence
// - Write actions are gated behind a permission manager
// - Includes a Change PIN flow that enforces least privilege

import { mergeSort } from "./algorithms.js";

// Helper for formatting currency
function money(n) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

// Safe text conversion for rendering
function text(v) {
  return String(v ?? "");
}

export class InventoryUI {
  constructor(service, permissionManager) {
    this.service = service;
    this.perms = permissionManager;

    // Form elements
    this.form = document.getElementById("itemForm");
    this.name = document.getElementById("name");
    this.sku = document.getElementById("sku");
    this.quantity = document.getElementById("quantity");
    this.price = document.getElementById("price");
    this.msg = document.getElementById("formMessage");
    this.saveBtn = document.getElementById("saveBtn");
    this.cancelBtn = document.getElementById("cancelBtn");

    // Table + toolbar elements
    this.tableBody = document.getElementById("tableBody");
    this.search = document.getElementById("search");
    this.sort = document.getElementById("sort");
    this.summary = document.getElementById("summary");
    this.resetBtn = document.getElementById("resetBtn");

    // Permission controls
    this.unlockBtn = document.getElementById("unlockBtn");
    this.lockBtn = document.getElementById("lockBtn");
    this.changePinBtn = document.getElementById("changePinBtn");
    this.authLine = document.getElementById("authLine");

    // Internal UI state
    this.editId = null;
    this.isBusy = false;
  }

  init() {
    // Handle add/update submit
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.onSave();
    });

    // Cancel editing
    this.cancelBtn.addEventListener("click", () => this.clearForm());

    // Read-only operations
    this.search.addEventListener("input", () => this.render());
    this.sort.addEventListener("change", () => this.render());

    // Write operations (permission gated)
    this.resetBtn.addEventListener("click", () => this.onResetDemo());

    // Permission actions
    this.unlockBtn.addEventListener("click", () => this.onUnlock());
    this.lockBtn.addEventListener("click", () => this.onLock());
    this.changePinBtn.addEventListener("click", () => this.onChangePin());

    this.updateAuthUI();
    this.render();
  }

  // Controls UI disable state during async operations
  setBusy(isBusy) {
    this.isBusy = isBusy;

    this.saveBtn.disabled = isBusy || !this.perms.canWrite();
    this.resetBtn.disabled = isBusy || !this.perms.canWrite();
    this.cancelBtn.disabled = isBusy;
  }

  // Updates UI based on permission state
  updateAuthUI() {
    const unlocked = this.perms.canWrite();

    if (this.authLine) {
      this.authLine.textContent = unlocked
        ? "Mode: Admin (unlocked)"
        : "Mode: Read-only (locked)";
    }

    this.saveBtn.disabled = !unlocked || this.isBusy;
    this.resetBtn.disabled = !unlocked || this.isBusy;
    this.lockBtn.disabled = !unlocked;

    // Least privilege: only unlocked admins can change PIN
    this.changePinBtn.disabled = !unlocked;
  }

  setMessage(type, message) {
    this.msg.className = "message " + (type || "");
    this.msg.textContent = message || "";
  }

  readDraft() {
    return {
      name: this.name.value,
      sku: this.sku.value,
      quantity: this.quantity.value,
      price: this.price.value
    };
  }

  async onSave() {
    if (this.isBusy) return;

    this.setBusy(true);
    this.setMessage("", "");

    const draft = this.readDraft();
    let result;

    if (this.editId) {
      result = await this.service.updateItem(this.editId, draft);
    } else {
      result = await this.service.addItem(draft);
    }

    if (!result.ok) {
      this.setMessage("bad", result.message);
      this.setBusy(false);
      this.updateAuthUI();
      return;
    }

    this.setMessage("good", result.message);
    this.clearForm();
    this.render();

    this.setBusy(false);
    this.updateAuthUI();
  }

  clearForm() {
    this.editId = null;
    this.name.value = "";
    this.sku.value = "";
    this.quantity.value = "";
    this.price.value = "";
    this.saveBtn.textContent = "Save Item";
    this.name.focus();
  }

  startEdit(item) {
    if (!this.perms.canWrite()) {
      this.setMessage("bad", "Read-only mode. Unlock admin mode to edit items.");
      return;
    }

    this.editId = item.id;
    this.name.value = item.name;
    this.sku.value = item.sku;
    this.quantity.value = String(item.quantity);
    this.price.value = String(item.price);
    this.saveBtn.textContent = "Update Item";
    this.setMessage("", "Editing item. Update fields and click Update Item.");
    this.name.focus();
  }

  buildComparator(key) {
    if (key === "quantity" || key === "price") {
      return (a, b) => a[key] - b[key];
    }

    return (a, b) =>
      String(a[key]).toLowerCase().localeCompare(String(b[key]).toLowerCase());
  }

  getFilteredSortedItems() {
    const items = this.service.getAll();
    const query = (this.search.value || "").trim().toLowerCase();

    let filtered = items;
    if (query) {
      filtered = items.filter(
        i =>
          i.name.toLowerCase().includes(query) ||
          i.sku.toLowerCase().includes(query)
      );
    }

    const [key, direction] = (this.sort.value || "name:asc").split(":");
    const comparator = this.buildComparator(key);

    let sorted = mergeSort([...filtered], comparator);
    if (direction === "desc") sorted.reverse();

    return sorted;
  }

  renderSummary(items) {
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalValue = items.reduce(
      (sum, i) => sum + i.quantity * i.price,
      0
    );

    this.summary.textContent =
      `Items: ${totalItems} | ` +
      `Total quantity: ${totalQuantity} | ` +
      `Total value: ${money(totalValue)}`;
  }

  async onResetDemo() {
    if (this.isBusy) return;

    this.setBusy(true);
    this.setMessage("", "");

    const res = await this.service.resetDemoData();
    if (!res.ok) {
      this.setMessage("bad", res.message);
      this.setBusy(false);
      this.updateAuthUI();
      return;
    }

    this.setMessage("good", res.message);
    this.clearForm();
    this.render();

    this.setBusy(false);
    this.updateAuthUI();
  }

  async onUnlock() {
    if (!this.perms.hasAdminConfigured()) {
      const newPin = prompt(
        "Set an Admin PIN (at least 4 characters). This is stored as a hash in your browser."
      );
      if (newPin === null) return;

      const res = await this.perms.setAdminPin(newPin);
      this.setMessage(res.ok ? "good" : "bad", res.message);
      this.updateAuthUI();
      return;
    }

    const pin = prompt("Enter Admin PIN to unlock write actions:");
    if (pin === null) return;

    const res = await this.perms.unlock(pin);
    this.setMessage(res.ok ? "good" : "bad", res.message);
    this.updateAuthUI();
  }

  onLock() {
    this.perms.lock();
    this.setMessage("good", "Locked. Write actions disabled.");
    this.updateAuthUI();
  }

  async onChangePin() {
    // Enforce least privilege
    if (!this.perms.canWrite()) {
      this.setMessage("bad", "Unlock admin mode to change the PIN.");
      return;
    }

    if (!this.perms.hasAdminConfigured()) {
      this.setMessage("bad", "No PIN exists yet. Use Unlock to set one.");
      return;
    }

    const currentPin = prompt("Enter CURRENT Admin PIN:");
    if (currentPin === null) return;

    const newPin = prompt("Enter NEW Admin PIN (at least 4 characters):");
    if (newPin === null) return;

    const confirmPin = prompt("Re-enter NEW Admin PIN:");
    if (confirmPin === null) return;

    if (String(newPin).trim() !== String(confirmPin).trim()) {
      this.setMessage("bad", "New PIN entries did not match.");
      return;
    }

    const res = await this.perms.changePin(currentPin, newPin);
    this.setMessage(res.ok ? "good" : "bad", res.message);
    this.updateAuthUI();
  }

  render() {
    const items = this.getFilteredSortedItems();
    this.renderSummary(items);
    this.tableBody.innerHTML = "";

    if (items.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.textContent = "No items found.";
      td.style.color = "rgba(255,255,255,0.7)";
      tr.appendChild(td);
      this.tableBody.appendChild(tr);
      return;
    }

    const canWrite = this.perms.canWrite();

    for (const item of items) {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${text(item.name)}</td>
        <td>${text(item.sku)}</td>
        <td class="num">${text(item.quantity)}</td>
        <td class="num">${money(item.price)}</td>
        <td class="num">${money(item.quantity * item.price)}</td>
        <td>
          <button type="button" class="ghost" data-action="edit" data-id="${item.id}" ${canWrite ? "" : "disabled"}>Edit</button>
          <button type="button" class="ghost" data-action="delete" data-id="${item.id}" ${canWrite ? "" : "disabled"}>Delete</button>
        </td>
      `;

      tr.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", async () => {
          if (this.isBusy) return;

          const action = btn.dataset.action;
          const id = btn.dataset.id;
          const selected = this.service.getAll().find(i => i.id === id);
          if (!selected) return;

          if (action === "edit") {
            this.startEdit(selected);
            return;
          }

          if (action === "delete") {
            const ok = confirm(`Delete "${selected.name}" (${selected.sku})?`);
            if (!ok) return;

            this.setBusy(true);

            const res = await this.service.deleteItem(id);
            this.setMessage(res.ok ? "good" : "bad", res.message);

            this.render();
            this.setBusy(false);
            this.updateAuthUI();
          }
        });
      });

      this.tableBody.appendChild(tr);
    }
  }
}