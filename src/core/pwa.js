// Version installée : astuce iPhone, cache hors connexion (service worker), stockage persistant.
import { onClick } from "./actions.js";
import { render } from "./ui.js";

onClick("hide-ios", () => { try { localStorage.setItem("grimoire.iosTip", "0"); } catch (e) {} render(); });
function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
function installed() { return navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches); }
function showIosTip() {
  if (!isIOS() || installed() || location.protocol === "file:") return false;
  try { return localStorage.getItem("grimoire.iosTip") !== "0"; } catch (e) { return true; }
}
if (location.protocol !== "file:") {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then(p => p || navigator.storage.persist()).catch(() => {});
}

export { isIOS, installed, showIosTip };
