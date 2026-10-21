// Recalcule les imports nommés de tous les modules de src/ à partir des noms exportés par chacun.
// Utile après avoir déplacé des fonctions d'un module à un autre : node outils/imports.mjs, puis npm run lint.
import * as acorn from "acorn"; import * as walk from "acorn-walk"; import fs from "fs"; import path from "path";
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "src");
const files = []; (function scan(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) scan(p); else if (f.endsWith(".js") && f !== "sw.js") files.push(p); } })(ROOT);
const parse = s => acorn.parse(s, { ecmaVersion: 2022, sourceType: "module" });
const exported = {}; // nom -> fichier
const asts = {};
for (const f of files) {
  const src = fs.readFileSync(f, "utf8"); const ast = parse(src); asts[f] = { src, ast };
  for (const st of ast.body) {
    if (st.type === "ExportNamedDeclaration") {
      if (st.declaration) { const d = st.declaration; (d.declarations ? d.declarations.map(x => x.id.name) : [d.id.name]).forEach(n => { if (exported[n] && exported[n] !== f) throw "export double " + n; exported[n] = f; }); }
      else st.specifiers.forEach(s => { const n = s.exported.name; if (exported[n] && exported[n] !== f) throw "export double " + n + " " + f + " " + exported[n]; exported[n] = f; });
    }
  }
}
for (const f of files) {
  const { src, ast } = asts[f];
  const own = new Set(); const keepImports = [];
  for (const st of ast.body) {
    if (st.type === "FunctionDeclaration") own.add(st.id.name);
    if (st.type === "VariableDeclaration") st.declarations.forEach(d => own.add(d.id.name));
    if (st.type === "ExportNamedDeclaration" && st.declaration) { const d = st.declaration; (d.declarations ? d.declarations.map(x => x.id.name) : [d.id.name]).forEach(n => own.add(n)); }
    if (st.type === "ImportDeclaration" && st.specifiers.some(s => s.type !== "ImportSpecifier")) { keepImports.push(src.slice(st.start, st.end)); st.specifiers.forEach(s => own.add(s.local.name)); }
    if (st.type === "ImportDeclaration" && !st.specifiers.length) keepImports.push(src.slice(st.start, st.end));
  }
  const used = new Set();
  walk.fullAncestor(ast, (node, _s, anc) => {
    if (node.type !== "Identifier") return; const p = anc[anc.length - 2];
    if (p && p.type === "ImportSpecifier") return;
    if (p && (p.type === "ExportSpecifier")) return;
    if (p && p.type === "MemberExpression" && p.property === node && !p.computed) return;
    if (p && p.type === "Property" && p.key === node && !p.computed && !p.shorthand) return;
    used.add(node.name);
  });
  const need = {};
  for (const n of used) { const m = exported[n]; if (m && m !== f && !own.has(n)) (need[m] ||= new Set()).add(n); }
  const rel = to => { let r = path.relative(path.dirname(f), to).replace(/\\/g, "/"); return r.startsWith(".") ? r : "./" + r; };
  const named = Object.entries(need).sort((a, b) => rel(a[0]).localeCompare(rel(b[0]))).map(([m, s]) => `import { ${[...s].sort().join(", ")} } from "${rel(m)}";`);
  const imps = ast.body.filter(s => s.type === "ImportDeclaration");
  let body;
  if (imps.length) body = src.slice(0, imps[0].start) + "@@I@@" + src.slice(imps[imps.length - 1].end);
  else if (!named.length) continue;   // module sans import, et aucun à ajouter : inchangé
  else { const firstCode = ast.body[0].start; body = src.slice(0, firstCode) + "@@I@@\n\n" + src.slice(firstCode); }
  const all = [...keepImports.filter(x => !x.startsWith('import "')), ...named, ...keepImports.filter(x => x.startsWith('import "'))].join("\n");
  fs.writeFileSync(f, body.replace("@@I@@", all));
}
console.log(files.length, "modules");
