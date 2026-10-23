"""Corrections des coquilles d'OCR dans data/beasts.json (relevées en octobre 2026, signalées par un joueur : « est 4 1,50 m » pour « est à 1,50 m »).

DÉJÀ APPLIQUÉ. Le relancer ne change rien. Seuls les textes affichés sont touchés (noms, traits, actions, sens, compétences), jamais les identifiants.
Vérification : pyspellchecker (français) sur tous les mots, puis relecture des « a » isolés suivis d'un nombre ou d'une locution.
"""
import json, os, re
P = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "beasts.json")
RULES = [
    (r"(?<![\w,])[4&] (?=\d)", "à "),            # « est 4 1,50 m », « est & 1,5 m »
    (r" & ", " à "),                                # « tomber & terre »
    (r"\bjusqu'a\b", "jusqu'à"),
    (r"(?<![\w'])a (?=\d)", "à "),                 # « a 1,5 m », « a 0 », « a 7,50 mètres »
    (r"(?<![\w'])a terre\b", "à terre"),
    (r"\bappel a l", "appel à l"),
    (r"\bcorps a corps\b", "corps à corps"),
    (r"\bmeétre\b|\bmetre\b", "mètre"), (r"\bmetres\b", "mètres"),
    (r"\bOuie\b", "Ouïe"), (r"\bouie\b", "ouïe"), (r"\blouïe\b", "l'ouïe"), (r"\blair\b", "l'air"),
    (r"\bautours de\b", "autour de"), (r"\bPied sar\b", "Pied sûr"), (r"\bEcholocalisation\b", "Écholocalisation"),
    (r"(?<![\w'])a la (vue|fois|place)\b", r"à la \1"), (r" _ ep ", " "), (r"\bprés de\b", "près de"), (r"Si 'hippocampe", "Si l'hippocampe"),
    (r"aveuglée est entravée", "aveuglée et entravée"),
    (r"(\d) ?— ?(\d)", r"\1 − \2"),             # « 1d4—1 » : tiret long lu à la place du signe moins
    (r"\bchévre", "chèvre"), (r"\bhyéne", "hyène"), (r"\blumiére", "lumière"), (r"\bmaniére", "manière"),
    (r"\bpanthére", "panthère"), (r"\bposséde\b", "possède"), (r"\brécupére\b", "récupère"), (r"\bétre\b", "être"),
]
def fix(s):
    for a, b in RULES: s = re.sub(a, b, s)
    return s
d = json.load(open(P, encoding="utf-8")); n = 0
def f(s):
    global n; t = fix(s); n += t != s; return t
for b in d:
    for k in ("n", "sens", "cp", "can"): b[k] = f(b.get(k, ""))
    b["tr"] = [[f(x[0]), f(x[1]), *x[2:]] for x in b["tr"]]
    for a in b["ac"]:
        a["n"] = f(a["n"]); a["t"] = f(a["t"])
        if a.get("d"): a["d"] = f(a["d"])
json.dump(d, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(n, "textes corrigés")
