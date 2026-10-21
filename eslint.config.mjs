// Contrôle du code : noms non définis (erreur) et variables ou imports inutiles (avertissement). npm run lint
import globals from "globals";
export default [
  { ignores: ["index.html", "sw.js", "app.js.map", "node_modules/", "outils/", "tests/"] },
  { files: ["src/**/*.js"], ignores: ["src/sw.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.browser } },
    rules: { "no-undef": "error", "no-unused-vars": ["warn", { vars: "all", args: "none", caughtErrors: "none" }] } },
];
