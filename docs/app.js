// app.js
import { InventoryService } from "./inventoryService.js";
import { InventoryUI } from "./ui.js";

const service = new InventoryService();

// Seed demo data if empty (keeps the first run from being blank).
if (service.getAll().length === 0) {
  service.resetDemoData();
}

const ui = new InventoryUI(service);
ui.init();