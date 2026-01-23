// ui.js
// Responsible for DOM rendering and UI event wiring.

/**
 * @param {number} n
 */
function money(n) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function text(n) {
  return String(n ?? "");
}

export class InventoryUI {
  /**
   * @param {import('./inventoryService.js').InventoryService} service
   */
  constructor(service) {
    this.service = service;

    // Form elements
    this.form = document.getElementById("itemForm");
    this.name = document.getElementById("name");
    this.sku = document.getElementById("sku");
    this.quantity = document.getElementById("quantity");
    this.price = document.getElementById("price");
    this.msg = document.getElementById("formMessage");
    this.cancelBtn = document.getElementById("cancelBtn");
    this.saveBtn = document.getElementById("saveBtn");

    // Table + tools
    this.tableBody = document.getElementById("tableBody");
    this.search = document.getElementById("search");
    this.sort = document.getElementById("sort");
    this.summary = document.getElementById("summary");
    this.resetBtn = document.getElementById("resetBtn");

    // State
    this.editId = null;
    this.lastRenderItems = [];
  }

  init() {
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.onSave();
    });

    this.cancelBtn.addEventListener("click", () => this.clearForm());

    this.search.addEventListener("input", () => this.render());
    this.sort.addEventListener("change", () => this.render());

    this.resetBtn.addEventListener("click", () => {
      this.service.resetDemoData();
      this.clearForm();
      this.render();
    });

    this.render();
  }

  setMessage(kind, message) {
    this.msg.className = "message " + (kind || "");
    this.msg.textContent = message || "";
  }

  readDraft() {
    return {
      name: this.name.value,
      sku: this.sku.value,
      quantity: this.quantity.value,
      price: this.price.value,
    };
  }

  onSave() {
    const draft = this.readDraft();

    let result;
    if (this.editId) {
      result = this.service.updateItem(this.editId, draft);
    } else {
      result = this.service.addItem(draft);
    }

    if (!result.ok) {
      this.setMessage("bad", result.message);
      return;
    }

    this.setMessage("good", result.message);
    this.clearForm();
    this.render();
  }

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

  getFilteredSortedItems() {
    const raw = this.service.getAll();
    const q = (this.search.value || "").trim().toLowerCase();

    let filtered = raw;
    if (q) {
      filtered = raw.filter(i =>
        i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
      );
    }

    const [key, dir] = (this.sort.value || "name:asc").split(":");

    // Keep logic simple: use built-in sort with a comparator.
    const temp = [...filtered];
    temp.sort((a, b) => {
      if (key === "quantity" || key === "price") {
        return (a[key] - b[key]);
      }
      // name / sku
      const av = String(a[key]).toLowerCase();
      const bv = String(b[key]).toLowerCase();
      return av.localeCompare(bv);
    });

    if (dir === "desc") temp.reverse();
    return temp;
  }

  renderSummary(items) {
    const totalItems = items.length;
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalValue = items.reduce((sum, i) => sum + (i.quantity * i.price), 0);

    this.summary.textContent =
      `Items: ${totalItems} | Total quantity: ${totalQty} | Total value: ${money(totalValue)}`;
  }

  render() {
    const items = this.getFilteredSortedItems();
    this.lastRenderItems = items;

    this.renderSummary(items);
    this.tableBody.innerHTML = "";

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
          <button type="button" class="ghost" data-action="edit" data-id="${item.id}">Edit</button>
          <button type="button" class="ghost" data-action="delete" data-id="${item.id}">Delete</button>
        </td>
      `;

      tr.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () => {
          const action = btn.getAttribute("data-action");
          const id = btn.getAttribute("data-id");
          const selected = this.service.getAll().find(i => i.id === id);
          if (!selected) return;

          if (action === "edit") {
            this.startEdit(selected);
          } else if (action === "delete") {
            const ok = confirm(`Delete "${selected.name}" (${selected.sku})?`);
            if (!ok) return;
            const res = this.service.deleteItem(id);
            if (!res.ok) {
              this.setMessage("bad", res.message);
              return;
            }
            this.setMessage("good", res.message);
            this.render();
          }
        });
      });

      this.tableBody.appendChild(tr);
    }
  }
}