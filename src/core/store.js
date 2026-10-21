// Enregistrement des personnages sur l'appareil (localStorage) et choix du personnage affiché.
import { norm } from "./schema.js";
import { G, S } from "./state.js";
import { render, setStatus } from "./ui.js";

function cacheLocal() { try { localStorage.setItem("grimoire.cache", JSON.stringify(S.list)); } catch (e) {} }
function loadLocal() { try { const c = JSON.parse(localStorage.getItem("grimoire.cache") || "{}"); for (const k in c) S.list[k] = norm(c[k]); } catch (e) {} }
function save(id) {
  const g = S.list[id]; if (!g) return; g.updatedAt = Date.now(); cacheLocal(); setStatus("Enregistré sur cet appareil");
}
function removeDoc(id) { delete S.list[id]; cacheLocal(); }

function pickCurrent() {
  let want = S.cur; if (!want) { try { want = localStorage.getItem("grimoire.cur"); } catch (e) {} }
  const ids = Object.keys(S.list);
  S.cur = want && S.list[want] ? want : (ids.sort((a, b) => S.list[b].updatedAt - S.list[a].updatedAt)[0] || null);
}
function setCur(id) { S.cur = id; S.editX = null; S.xdraft = null; S.open.clear(); try { localStorage.setItem("grimoire.cur", id); } catch (e) {} render(); }
function newId(name) { return (name || "mage").normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 30) + "-" + Math.random().toString(36).slice(2, 7); }
function mutate(fn, rerender = true) { const g = G(); if (!g) return; fn(g); save(S.cur); if (rerender) render(); }

export { cacheLocal, loadLocal, save, removeDoc, pickCurrent, setCur, newId, mutate };
