// permissions.js
//
// Client-side permission gate:
// The main goal here is to demonstrate the concept of least privilege:
// - The app is read-only by default
// - Write actions (add/update/delete/reset) require admin unlock
//
// Because this is a static GitHub Pages app, this is NOT true security.
// A real implementation would enforce permissions on a server.
// However, it still demonstrates a security mindset in the UI and service layers.
//
// Design choices:
// - Store PIN as a SHA-256 hash in localStorage (not plaintext)
// - Store "unlocked for this session" in sessionStorage (resets on close)

const ADMIN_HASH_KEY = "cs499_admin_pin_hash_v1";
const UNLOCKED_KEY = "cs499_admin_unlocked_v1";

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export class PermissionManager {
  hasAdminConfigured() {
    return Boolean(localStorage.getItem(ADMIN_HASH_KEY));
  }

  isUnlocked() {
    return sessionStorage.getItem(UNLOCKED_KEY) === "true";
  }

  // In this project, "canWrite" is the permission boundary
  canWrite() {
    return this.isUnlocked();
  }

  lock() {
    sessionStorage.removeItem(UNLOCKED_KEY);
  }

  // First-time setup: store only a hash of the PIN
  async setAdminPin(pin) {
    const clean = String(pin || "").trim();

    if (clean.length < 4) {
      return { ok: false, message: "PIN must be at least 4 characters." };
    }

    const hash = await sha256(clean);
    localStorage.setItem(ADMIN_HASH_KEY, hash);

    // Remain locked until the user explicitly unlocks
    this.lock();

    return {
      ok: true,
      message: "Admin PIN set. Use Unlock to enable write actions.",
    };
  }

  // Attempt to unlock for this browser session
  async unlock(pin) {
    const stored = localStorage.getItem(ADMIN_HASH_KEY);
    if (!stored) {
      return { ok: false, message: "No admin PIN is configured yet." };
    }

    const clean = String(pin || "").trim();
    const hash = await sha256(clean);

    if (hash !== stored) {
      this.lock();
      return { ok: false, message: "Incorrect PIN." };
    }

    sessionStorage.setItem(UNLOCKED_KEY, "true");
    return { ok: true, message: "Admin mode unlocked for this session." };
  }

  // Change the PIN by verifying the current PIN first.
  // This keeps it closer to how real systems handle credential changes.
  async changePin(currentPin, newPin) {
    const stored = localStorage.getItem(ADMIN_HASH_KEY);
    if (!stored) {
      return { ok: false, message: "No admin PIN is configured yet." };
    }

    const currentClean = String(currentPin || "").trim();
    const newClean = String(newPin || "").trim();

    if (newClean.length < 4) {
      return { ok: false, message: "New PIN must be at least 4 characters." };
    }

    const currentHash = await sha256(currentClean);
    if (currentHash !== stored) {
      // If the current PIN is wrong, do not change anything
      return { ok: false, message: "Current PIN is incorrect." };
    }

    const newHash = await sha256(newClean);
    localStorage.setItem(ADMIN_HASH_KEY, newHash);

    return { ok: true, message: "Admin PIN updated." };
  }
}
