// Mise en forme du texte affiché : nombres, échappement HTML, pluriels.

/** Nombre avec son signe : +3, −1 (vrai signe moins). */




export const signed = n => (n >= 0 ? "+" : "−") + Math.abs(n);
/** Nombre décimal à la française : 1,5. */
export const fmt = n => String(n).replace(".", ",");
/** Nombre avec séparateur de milliers : 25 000. */
export const fr = n => n.toLocaleString("fr-FR");
/** Échappe un texte pour l'insérer dans du HTML. */
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
/** Majuscule initiale. */
export const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
/** « 1 sort », « 3 sorts » ; pluriel irrégulier en 3e argument. */
export const plural = (n, w, ws) => `${n} ${n > 1 ? (ws || w + "s") : w}`;
/** Tri alphabétique français sur le nom (champ n). */
export const byName = (a, b) => a.n.localeCompare(b.n, "fr");
