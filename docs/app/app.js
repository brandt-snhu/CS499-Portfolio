// app.js
//
// App entry point.
// This file bootstraps the application by:
// 1) Creating the permission manager (client-side access control)
// 2) Creating the inventory service (business logic + IndexedDB persistence)
// 3) Loading inventory from the database into memory
// 4) Starting the UI
//
// Milestone Four notes:
// - The database is IndexedDB (native browser database API)
// - The app starts in read-only mode until admin unlock is performed

import { InventoryService } from "./inventoryService.js";
import { InventoryUI } from "./ui.js";
import { PermissionManager } from "./permissions.js";

const statusLine = document.getElementById("statusLine");

function setStatus(text) {
  if (statusLine) statusLine.textContent = text;
}

(async function main() {
  try {
    setStatus("Status: Opening database and loading inventory...");

    const perms = new PermissionManager();

    // Inject permissions into the service so write actions are protected in logic
    const service = new InventoryService(perms);
    await service.init();

    setStatus("Status: Connected to database (IndexedDB).");

    // Start UI and inject permissions so UI can reflect lock/unlock state
    const ui = new InventoryUI(service, perms);
    ui.init();
  } catch (err) {
    console.error(err);
    setStatus("Status: Database failed to load. Check console for details.");
  }
})();
