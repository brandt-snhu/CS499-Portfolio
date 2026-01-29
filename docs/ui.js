// ui.js
//
// This file is responsible for all user interface behavior.
// It connects user actions (form input, sorting, searching, buttons)
// to the underlying inventory logic and algorithms.
//
// For Milestone Three, this file was enhanced to apply a custom
// merge sort algorithm when ordering inventory data.

import { mergeSort } from "./algorithms.js";

// Formats numbers as U.S. currency for display purposes
function money(n) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD"
  });
}

// Safely converts values to strings for rendering
function text(n) {
  return String(n ?? "");
}

export class InventoryUI {
  constructor(service) {
    // Reference to the inventory service, which manages data and validation
    this.service = service;

    // Cache frequently used DOM elements to avoid repeated lookups
    this.form = document.getElementById("itemForm");
    this.name = document.getElementById("name");
    this.sku = document.getElementById("sku");
    this.quantity = document.getElementById("quantity");
    this.price = document.getElementById("price");
    this.msg = document.getElementById("formMessage");
    this.cancelBtn = document.getElementById("cancelBtn");
    this.saveBtn = document.getElementById("saveBtn");

    this.tableBody = document.getElementById("tableBody");
    this.search = document.getElementById("search");
    this.sort = document.getElementById("sort");
    this.summary = document.getElementById("summary");
    this.resetBtn = document.getElementById("resetBtn");

    // Tracks whether the form is being used to edit an existing item
    this.editId = null;
  }

  // Initializes event listeners and renders the initial inventory view
  init() {
    // Handle form submission for both adding and updating items
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.onSave();
    });

    // Clears the form and exits edit mode
    this.cancelBtn.addEventListener("click", () => this.clearForm());

    // Re-render inventory when search input changes
    this.search.addEventListener("input", () => this.render());

    // Re-render inventory when sort selection changes
    this.sort.addEventListener("change", () => this.render());

    // Reset demo data for testing and presentation purposes
    this.resetBtn.addEventListener("click", () => {
      this.service.resetDemoData();
      this.clearForm();
      this.render();
    });

    // Initial render on page load
    this.render();
  }

  // Displays feedback messages to the user
  setMessage(kind, message) {
    this.msg.className = "message " + (kind || "");
    this.msg.textContent = message || "";
  }

  // Reads current form values into an object
  readDraft() {
    return {
      name: this.name.value,
      sku: this.sku.value,
      quantity: this.quantity.value,
      price: this.price.value
    };
  }

  // Handles saving a new item or updating an existing item
  onSave() {
    const draft = this.readDraft();

    let result;
    if (this.editId) {
      // Update existing item
      result = this.service.updateItem(this.editId, draft);
    } else {
      // Add new item
      result = this.service.addItem(draft);
    }

    // Display validation or error messages if operation fails
    if (!result.ok) {
      this.setMessage("bad", result.message);
      return;
    }

    // Success path
    this.setMessage("good", result.message);
    this.clearForm();
    this.render();
  }

  // Resets the form to its default "add item" state
  clearForm() {
    this.editId = null;
    this.name.value = "";
    this.sku.value = "";
    this.quantity.value = "";
    this.price.value = "";
    this.saveBtn.textContent = "Save Item";
    this.setMessage("", "");
    this.name.focus();
  }

  // Populates the form with an item's data for editing
  startEdit(item) {
    this.editId = item.id;
    this.name.value = item.name;
    this.sku.value = item.sku;
    this.quantity.value = String(item.quantity);
    this.price.value = String(item.price);
    this.saveBtn.textContent = "Update Item";
    this.setMessage("", "Editing item. Update fields and click Update Item.");
    this.name.focus();
  }

  // Builds a comparison function based on the selected sort field
  // This comparator is passed into the merge sort algorithm
  buildComparator(key) {
    // Numeric comparison for quantity and price
    if (key === "quantity" || key === "price") {
      return (a, b) => a[key] - b[key];
    }

    // String comparison for name and SKU
    return (a, b) => {
      const av = String(a[key]).toLowerCase();
      const bv = String(b[key]).toLowerCase();
      return av.localeCompare(bv);
    };
  }

  // Applies filtering and sorting to inventory data
  getFilteredSortedItems() {
    const raw = this.service.getAll();
    const query = (this.search.value || "").trim().toLowerCase();

    // Filter inventory by name or SKU
    let filtered = raw;
    if (query) {
      filtered = raw.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query)
      );
    }

    // Determine sort key and direction
    const [key, direction] = (this.sort.value || "name:asc").split(":");
    const comparator = this.buildComparator(key);

    // Milestone Three enhancement:
    // Use custom merge sort instead of built-in Array.sort
    let sorted = mergeSort([...filtered], comparator);

    // Reverse order if descending sort selected
    if (direction === "desc") {
      sorted.reverse();
    }

    return sorted;
  }

  // Updates the inventory summary statistics
  renderSummary(items) {
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalValue = items.reduce(
      (sum, i) => sum + (i.quantity * i.price),
      0
    );

    this.summary.textContent =
      `Items: ${totalItems} | ` +
      `Total quantity: ${totalQuantity} | ` +
      `Total value: ${money(totalValue)}`;
  }

  // Renders the inventory table and attaches action handlers
  render() {
    const items = this.getFilteredSortedItems();

    this.renderSummary(items);
    this.tableBody.innerHTML = "";

    // Handle empty inventory case
    if (items.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.textContent = "No items yet.";
      td.style.color = "rgba(255,255,255,0.7)";
      tr.appendChild(td);
      this.tableBody.appendChild(tr);
      return;
    }

    // Render each inventory item as a table row
    for (const item of items) {
      const tr = document.createElement("tr");
      const value = item.quantity * item.price;

      tr.innerHTML = `
        <td>${text(item.name)}</td>
        <td>${text(item.sku)}</td>
        <td class="num">${text(item.quantity)}</td>
        <td class="num">${money(item.price)}</td>
        <td class="num">${money(value)}</td>
        <td>
          <button type="button" class="ghost" data-action="edit" data-id="${item.id}">
            Edit
          </button>
          <button type="button" class="ghost" data-action="delete" data-id="${item.id}">
            Delete
          </button>
        </td>
      `;

      // Attach handlers for edit and delete actions
      tr.querySelectorAll("button").forEach(button => {
        button.addEventListener("click", () => {
          const action = button.getAttribute("data-action");
          const id = button.getAttribute("data-id");
          const selected = this.service.getAll().find(i => i.id === id);

          if (!selected) return;

          if (action === "edit") {
            this.startEdit(selected);
          } else if (action === "delete") {
            const confirmed = confirm(
              `Delete "${selected.name}" (${selected.sku})?`
            );

            if (!confirmed) return;

            const result = this.service.deleteItem(id);
            if (!result.ok) {
              this.setMessage("bad", result.message);
              return;
            }

            this.setMessage("good", result.message);
            this.render();
          }
        });
      });

      this.tableBody.appendChild(tr);
    }
  }
}