// Choix d'un don du Manuel : recherche, dons accessibles (condition remplie) ou tous, texte complet, choix du don
// (caractéristique, compétences, langues) et effet chiffré. Partagé par Personnage › Dons et traits (ctx "tr")
// et l'assistant de passage de niveau (ctx "lu"). État : S.fp (traits) ou S.lu.fp (assistant).
import { onClick, onInput } from "../core/actions.js";
import { esc, signed } from "../core/format.js";
import { S } from "../core/state.js";
import { render } from "../core/ui.js";
import { R } from "../rules/common.js";
import { saveBonus, saveFromClass, skillLevel } from "../rules/character.js";
import { armorProf } from "../rules/equipment.js";
import { ABN, FEATS, SPELL_CLASSES, featAbil, featBlock, featSpellPool, featTaken } from "../rules/feats.js";
import { BY_ID } from "../data.js";
import { ABILITIES, SKILLS } from "../rules/tables.js";

const state = ctx => { const o = ctx === "lu" ? S.lu : ctx === "cr" ? S.cr : S; if (!o.fp) o.fp = { q: "", all: false, sel: null, ch: {} }; return o.fp; };
const canArmor = g => cat => armorProf(g, { cat });
const simple = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tag = f => f.calc ? `<span class="fptag calc">calculé</span>` : `<span class="fptag">rappel</span>`;

/** Effet chiffré du don pour ce personnage (lignes affichées sous le choix). */
function featPreview(g, id, ch, level = g.level) {
  const f = FEATS[id], out = [], k = featAbil(id, ch);
  if (k) out.push(g.abil[k] >= 20 ? `${ABN[k]} déjà à 20 : pas de +1` : `${ABN[k]} ${g.abil[k]} → ${g.abil[k] + 1}`);
  if (f.save && k) out.push(saveFromClass(g, k) ? `JdS ${ABN[k]} déjà maîtrisé par la classe` : `JdS ${ABN[k]} ${signed(saveBonus(g, k))} → ${signed(R.mod(Math.min(20, g.abil[k] + 1)) + R.prof(level))} (maîtrisé)`);
  if (f.hpLv) out.push(`+${f.hpLv * level} PV max, puis +${f.hpLv} à chaque niveau`);
  if (f.speed) out.push(`vitesse +${String(f.speed).replace(".", ",")} m`);
  if (f.init) out.push(`initiative +${f.init}`);
  if (f.passive) out.push(`Perception passive +${f.passive}`);
  if (f.armor) out.push(`maîtrise : ${f.armor.map(a => ({ light: "armures légères", medium: "armures intermédiaires", heavy: "armures lourdes", shield: "boucliers" })[a]).join(", ")}`);
  return out;
}

/** Choix demandés par le don : caractéristique, compétences, langues. */
function choiceHTML(g, id, st) {
  const f = FEATS[id], ch = st.ch; let h = "";
  if (f.abil && (f.abil === "any" || f.abil.length > 1)) {
    const opts = f.abil === "any" ? ABILITIES.map(a => a[0]) : f.abil;
    h += `<span class="lusub">Caractéristique</span><div class="chips">${opts.map(k => `<button class="chip" data-a="fp-abil" data-v="${k}" aria-pressed="${ch.abil === k}"${g.abil[k] >= 20 ? " disabled" : ""}>${ABN[k]}${f.save && saveFromClass(g, k) ? " ★" : ""}</button>`).join("")}</div>`;
    if (f.save) h += `<small class="muted">★ JdS déjà maîtrisé par la classe : sans intérêt pour la sauvegarde.</small>`;
  }
  if (f.skills) {
    const sel = ch.skills || [];
    h += `<span class="lusub">Compétences · ${sel.length}/${f.skills}</span><div class="chips">${SKILLS.filter(([k]) => !skillLevel(g, k)).map(([k, n]) => `<button class="chip" data-a="fp-skill" data-v="${k}" aria-pressed="${sel.includes(k)}"${!sel.includes(k) && sel.length >= f.skills ? " disabled" : ""}>${n}</button>`).join("")}</div>
      <small class="muted">Un outil à la place ? Ajoute-le ensuite dans Outils et langues.</small>`;
  }
  if (f.spells) { // Initié à la magie, Mage offensif, Magie rituelle
    h += `<span class="lusub">Classe (caractéristique d'incantation)</span><div class="chips">${Object.entries(SPELL_CLASSES).map(([k, [n, ab]]) => `<button class="chip" data-a="fp-cls" data-v="${k}" aria-pressed="${ch.cls === k}">${n} · ${ABN[ab]}</button>`).join("")}</div>`;
    if (ch.cls) {
      if (!["magicien", "druide", "clerc", "ensorceleur"].includes(ch.cls)) h += `<small class="muted">La liste complète de cette classe n'est pas dans l'appli : tous les sorts du niveau sont proposés, vérifie qu'il fait partie de la liste.</small>`;
      const sel = ch.spells || [], blk = (lv, n, lbl) => { const pool = featSpellPool(id, ch.cls, lv), cnt = sel.filter(x => BY_ID[x] && BY_ID[x].l === lv).length;
        return `<span class="lusub">${lbl} · ${cnt}/${n}</span><div class="chips">${pool.map(s => { const on = sel.includes(s.id); return `<button class="chip" data-a="fp-spell" data-v="${s.id}" data-n="${n}" aria-pressed="${on}"${!on && cnt >= n ? " disabled" : ""}>${esc(s.n)}</button>`; }).join("")}</div>`; };
      if (f.spells.cantrips) h += blk(0, f.spells.cantrips, f.spells.atk ? "Sort mineur avec jet d'attaque" : "Sorts mineurs");
      if (f.spells.l1) h += blk(1, f.spells.l1, "Sort de niveau 1 (une fois par repos long)");
      if (f.spells.ritual) h += blk(1, f.spells.ritual, "Rituels de niveau 1 (livre de rituels)");
    }
  }
  if (f.langs) h += `<span class="lusub">Langues</span><div class="fplangs">${Array.from({ length: f.langs }, (_, i) => `<input id="fp-l${i}" type="text" value="${esc((ch.langs || [])[i] || "")}" placeholder="Langue ${i + 1}" aria-label="Langue ${i + 1}">`).join("")}</div>`;
  return h;
}

/**
 * Liste des dons. ctx : "tr" (ajout depuis la fiche, avec les boutons Ajouter / Annuler) ou "lu" (assistant).
 * b : le personnage tel qu'il sera (assistant : niveau visé).
 */
function featPickerHTML(g, ctx, b = g) {
  const st = state(ctx), q = simple(st.q.trim());
  const rows = Object.values(FEATS).filter(f => !featTaken(g, f.id)).sort((x, y) => x.n.localeCompare(y.n, "fr"))
    .map(f => ({ f, why: featBlock(g, f.id, canArmor(g)) }));
  const ok = rows.filter(r => !r.why), shown = (st.all ? rows : ok).filter(({ f }) => !q || simple(f.n + " " + f.pill + " " + f.d.join(" ")).includes(q));
  let h = `<div class="fpick"><input id="fp-q" type="search" value="${esc(st.q)}" placeholder="Chercher un don (nom ou effet)" aria-label="Chercher un don" autocomplete="off">
    <div class="chips"><button class="chip" data-a="fp-all" data-v="0" aria-pressed="${!st.all}">Accessibles · ${ok.length}</button><button class="chip" data-a="fp-all" data-v="1" aria-pressed="${st.all}">Tous · ${rows.length}</button></div><div class="fplist">`;
  h += shown.map(({ f, why }) => {
    const on = st.sel === f.id;
    let r = `<button class="fprow${on ? " on" : ""}${why ? " off" : ""}" data-a="fp-sel" data-v="${f.id}" aria-pressed="${on}"><span class="rd" aria-hidden="true">${on ? "✓" : ""}</span><span class="bd"><span class="hd"><b>${esc(f.n)}</b>${f.pill ? `<span class="kp f">${esc(f.pill)}</span>` : ""}${tag(f)}</span>${why ? `<small>${esc(why)}</small>` : ""}</span></button>`;
    if (on) {
      const pv = featPreview(b, f.id, st.ch, b.level);
      r += `<div class="fpdet">${f.pre ? `<p class="pre">Prérequis : ${esc(f.pre)}${why ? ` · <b>non rempli</b> (${esc(why)}) : ce don ne peut pas être pris` : ""}</p>` : ""}
        <div class="fptxt">${f.d.map(p => p.startsWith("•") ? `<p class="bul">${esc(p.slice(1).trim())}</p>` : `<p>${esc(p)}</p>`).join("")}</div>
        ${why ? "" : choiceHTML(b, f.id, st) + (pv.length ? `<div class="fpprev">${pv.map(esc).join(" · ")}</div>` : "")}
        ${ctx === "tr" ? `<div class="cast">${why ? "" : `<button class="btn primary" data-a="fp-add">Ajouter le don</button>`}<button class="btn ghost" data-a="trait-cancel">${why ? "Fermer" : "Annuler"}</button></div>` : ""}</div>`;
    }
    return r;
  }).join("") || `<div class="empty">Aucun don ne correspond${st.all ? "" : " parmi les dons accessibles (essaie « Tous »)"}.</div>`;
  return h + `</div></div>`;
}

/** Contexte du sélecteur ouvert : l'assistant s'il est affiché, sinon la fiche. */
const cur = () => S.cr ? state("cr") : S.lu ? state("lu") : state("tr");
onInput("#fp-q", t => { cur().q = t.value; render(); });
onClick("fp-all", (b) => { cur().all = b.dataset.v === "1"; render(); });
onClick("fp-sel", (b) => { const st = cur(), id = b.dataset.v; st.sel = st.sel === id ? null : id; st.ch = {}; if (S.lu || S.cr) S.luKeep = true; render(); });
onClick("fp-abil", (b) => { const st = cur(); st.ch = { ...st.ch, abil: b.dataset.v }; if (S.lu || S.cr) S.luKeep = true; render(); });
onClick("fp-cls", (b) => { const st = cur(); st.ch = { ...st.ch, cls: b.dataset.v, spells: [] }; if (S.lu || S.cr) S.luKeep = true; render(); });
onClick("fp-spell", (b) => { const st = cur(), id = b.dataset.v, s = st.ch.spells || [], n = +b.dataset.n, lv = BY_ID[id].l;
  st.ch = { ...st.ch, spells: s.includes(id) ? s.filter(x => x !== id) : s.filter(x => BY_ID[x] && BY_ID[x].l === lv).length < n ? [...s, id] : s }; if (S.lu || S.cr) S.luKeep = true; render(); });
onClick("fp-skill", (b) => { const st = cur(), k = b.dataset.v, s = st.ch.skills || []; st.ch = { ...st.ch, skills: s.includes(k) ? s.filter(x => x !== k) : [...s, k] }; if (S.lu || S.cr) S.luKeep = true; render(); });
onInput(t => /^fp-l\d$/.test(t.id), (t) => { const st = cur(), l = [...(st.ch.langs || [])]; l[+t.id.slice(4)] = t.value; st.ch = { ...st.ch, langs: l }; });

/** Le personnage remplit-il la condition du don ? (prise refusée sinon, dans la fiche comme dans l'assistant) */
const featAllowed = (g, id) => !featBlock(g, id, canArmor(g));
export { featPickerHTML, featPreview, featAllowed, state as pickState };
