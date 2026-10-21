#!/usr/bin/env python3
"""Extrait les bêtes (Forme sauvage) du texte OCR d'un export AideDD « Monstres » et produit data/beasts.json.

    python3 outils/ocr_pdf.py Monstres-druide.pdf /tmp/betes.txt
    python3 outils/betes_aidedd.py /tmp/betes.txt                # écrit data/beasts.json
    python3 outils/betes_aidedd.py /tmp/betes.txt --sortie /tmp/b.json

Étapes : découpe en blocs (« Bête de taille … »), lecture des caractéristiques (CA, PV, vitesses, FOR/DEX/CON,
compétences, sens, FP), traits et actions (y compris « Nom (Recharge …). »), bonus et dégâts des attaques,
nettoyage des erreurs d'OCR courantes, noms français exacts (les titres en majuscules perdent leurs accents).
Le texte d'ambiance qui suit la dernière action est écarté et listé dans <sortie>.ecarte.txt pour relecture.
Corrections manuelles (Rat, Rat géant, Lézard géant, pieuvres) : voir la fin du script.
"""
import argparse, os
_ap = argparse.ArgumentParser(); _ap.add_argument("texte")
_ap.add_argument("--sortie", default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "beasts.json"))
_A = _ap.parse_args()
import re, json, unicodedata
L=[l.rstrip() for l in open(_A.texte, encoding="utf-8").read().split("\n")]
def clean(s):
    s=s.replace("’","'"); s=re.sub(r"dégat\b","dégât",s); s=re.sub(r"\bIa\b","la",s); s=re.sub(r"\bI'(?=[a-zéèêàâ])","l'",s); s=s.replace("ouie","ouïe").replace("téte","tête").replace("méme","même")
    s=s.replace("dég&ts","dégâts").replace("dégat ","dégât ").replace("dégat.","dégât.").replace("corps & corps","corps à corps").replace("corps a corps","corps à corps").replace("a distance","à distance")
    s=s.replace("dégats","dégâts").replace("Dégats","Dégâts").replace("Béte","Bête").replace("béte","bête").replace("|'","l'").replace("I'","l'").replace("’","'")
    s=re.sub(r"(?<=\s)4(?= (?:[a-zéèêàù]|l'|d'))","à",s)        # « 4 terre » → « à terre »
    s=re.sub(r"\b1,50 m\b","1,5 m",s); s=s.replace("1,50 métre","1,5 m").replace("métres","m").replace("métre","m").replace("mètres","m")
    s=s.replace("é","é").replace("  "," ")
    s=re.sub(r"^implacable \(","Implacable (",s); s=s.replace("Recharges aprés","Recharge après").replace("Recharge aprés","Recharge après").replace("Repos court","repos court")
    return s.strip()
def trim0(t): return re.sub(r"[^\w\s.,;:'()+\-–—éèêëàâçùûôîïÉÈÀ/«»]{2,}.*$","",t).strip()
DROP=[]
FRAC={"0":0,"1/8":0.125,"1/4":0.25,"1/2":0.5}
def num(cr): return FRAC.get(cr, None) if cr in FRAC else float(cr)
import unicodedata as _u
L=[_u.normalize("NFC",l) for l in L if not re.fullmatch(r"[\W_]*|[A-Za-z]{1,3}|[EeS—\-_ ]+|\(a|ee|EEE.*|—+.*", l.strip())]
idx=[i for i,l in enumerate(L) if re.match(r"^B\S{1,2}te de taille",l)]
out=[]
for n,i in enumerate(idx):
    end=(idx[n+1]-1) if n+1<len(idx) else len(L)
    blk=L[i:end]; name=L[i-1].strip()
    if not any(x.startswith("Points de vie") for x in blk): continue   # bloc coupé par la mise en page (rat), saisi à la main
    pk=next(k for k,x in enumerate(blk) if x.startswith("Puissance")); cut=next((k for k,x in enumerate(blk) if k>pk and x.startswith("Classe d")),None)
    if cut: blk=blk[:cut]
    nm=" ".join(w if w in ("de","des","du","à","a") else w for w in name.lower().split())
    nm=nm[0].upper()+nm[1:]
    size=re.search(r"taille (\w+)",blk[0]).group(1)
    g=lambda pat: next((re.search(pat,x).group(1) for x in blk if re.search(pat,x)),"")
    ca=g(r"^Classe d\S*armure (\d+)"); caN=g(r"^Classe d\S*armure \d+ \((.*)\)")
    pvl=next(x for x in blk if x.startswith("Points de vie")); m=re.match(r"Points de vie (\d+) \((.+)\)",pvl); pv=int(m.group(1)); pvd=m.group(2).replace("104","1d4").replace("—","-")
    sp=next(x for x in blk if x.startswith("Vitesse"))[8:]
    sp=re.sub(r"(\d)m\b",r"\1 m",sp); sp=re.sub(r"vol(\d)",r"vol \1",sp)
    spd={}
    for part in [p.strip() for p in sp.split(",") if p.strip()]:
        mm=re.match(r"(?:(nage|escalade|vol|creusement) )?([\d,]+) m",part)
        if mm: spd[mm.group(1) or "marche"]=mm.group(2)
    si=next(k for k,x in enumerate(blk) if x.startswith("FOR DEX"))
    sl=next(x for x in blk[si+1:si+4] if re.search(r"\d+ ?\(",x))
    nums=re.findall(r"(\d+) ?\(",sl.replace("=",""))
    st=[int(x) for x in nums[:6]]
    sens=g(r"^Sens (.+)"); cr=g(r"^Puissance ([0-9/]+)")
    comp=clean(g(r"^Comp[ée]tences (.+)"))
    pi=next(k for k,x in enumerate(blk) if x.startswith("Puissance"))
    ai=next((k for k,x in enumerate(blk) if x.strip()=="ACTIONS"),len(blk))
    def paras(lines):
        txt=" ".join(clean(x) for x in lines if x.strip() and not re.fullmatch(r"[a-z\W]{1,4}",x.strip()))
        parts=re.split(r"(?:(?<=\.)|(?<=^))\s*(?=(?:[A-ZÉÈÀ][\wéèêàçûô'’\- ]{1,40})(?: \(Recharge[^)]{1,40}\))?\. )",txt)
        res=[]
        for p_ in parts:
            mm=re.match(r"([A-ZÉÈÀ][\wéèêàçûô'’\- ]{1,40})(?: \((Recharge[^)]{1,40})\))?\. (.*)",p_.strip())
            if mm: res.append([mm.group(1).strip(),mm.group(3).strip()]+([mm.group(2)] if mm.group(2) else []))
            elif res and p_.strip(): res[-1][1]+=" "+p_.strip()
        return res
    traits=[[x[0],trim0(x[1])]+x[2:] for x in paras(blk[pi+1:ai])]; acts=paras(blk[ai+1:])
    # fin du texte d'ambiance : couper après la dernière phrase « Touché » ou la fin de la 1re phrase complète d'une action
    A=[]
    KEY=("cible","sauvegarde","DD ","agripp","entrav","empoison","terre","dégât","avantage","réaction","tour","PV","points de vie","aveugl","engloutie","avale","paralys","effray","charm","ne peut","jusqu","fin de","attaque","Touché")
    def trim(t):
        t=re.sub(r"[^\w\s.,;:'()+\-–—éèêëàâçùûôîïÉÈÀ/«»]{2,}.*$","",t).strip()       # déchets d'OCR en fin de texte
        sents=re.split(r"(?<=\.)\s+",t); keep=[]
        for k,x in enumerate(sents):
            if k==0 or any(w in x for w in KEY): keep.append(x)
            else: break
        return " ".join(keep).strip()
    for ix,x in enumerate(acts):
        last=ix==len(acts)-1; an,at=x[0],(trim(x[1]) if last else trim0(x[1])); a={"n":an,"t":at}
        if last and at!=trim0(x[1]): DROP.append((nm,trim0(x[1])[len(at):].strip()))
        if len(x)>2: a["r"]=x[2]
        mm=re.search(r"\+(\d+) au toucher",at)
        if mm: a["b"]=int(mm.group(1))
        mm=re.search(r"Touché ?: ?\d+ \(([^)]+)\) dégâts (\w+)",at)
        if mm: a["d"]=mm.group(1).replace(" ","").replace("+"," + ").replace("-"," − ")+" "+mm.group(2).rstrip("s")
        else:
            mm=re.search(r"Touché ?: ?(\d+) dégâts? (\w+)",at)
            if mm: a["d"]=mm.group(1)+" "+mm.group(2).rstrip("s")
        A.append(a)
    out.append({"id":unicodedata.normalize("NFD",nm).encode("ascii","ignore").decode().lower().replace(" ","-").replace("'","-"),
      "n":nm,"sz":size,"fp":cr,"fpn":num(cr),"ca":int(ca),"can":caN,"pv":pv,"pvd":pvd,"v":spd,"st":st[:3],"sens":clean(sens),"cp":comp,
      "tr":traits,"ac":A})
out.append({"id":"rat","n":"Rat","sz":"TP","fp":"0","fpn":0,"ca":10,"can":"","pv":1,"pvd":"1d4 - 1","v":{"marche":"6"},"st":[2,11,9],"sens":"vision dans le noir 9 m, Perception passive 10",
  "cp":"","tr":[["Odorat aiguisé","Le rat a un avantage aux jets de Sagesse (Perception) basés sur l'odorat."]],"ac":[{"n":"Morsure","t":"Attaque au corps à corps avec une arme : +0 au toucher, allonge 1,5 m, une cible. Touché : 1 dégât perforant.","b":0,"d":"1 perforant"}]})
# Noms français exacts (les titres en majuscules perdent les accents)
_N={unicodedata.normalize("NFD",x).encode("ascii","ignore").decode().lower():x for x in """Aigle;Aigle géant;Araignée;Araignée géante;Araignée-loup géante;Babouin;Belette;Bec de hache;Belette géante;Blaireau;Cerf;Blaireau géant;Chacal;Chameau;Chauve-souris;Chat;Chauve-souris géante;Cheval de guerre;Cheval de selle;Cheval de trait;Chèvre;Chèvre géante;Chouette;Chouette géante;Corbeau;Crabe géant;Crabe;Crapaud géant;Crocodile;Crocodile géant;Élan;Élan géant;Éléphant;Épaulard;Faucon;Faucon de sang;Grand singe;Grenouille;Grenouille géante;Guêpe géante;Hippocampe;Hippocampe géant;Hyène;Hyène géante;Lézard géant;Lézard;Lion;Loup;Loup sanguinaire;Mammouth;Mille-pattes géant;Molosse;Mule;Ours brun;Ours noir;Ours polaire;Panthère;Pieuvre;Pieuvre géante;Piranha;Poney;Rat;Rat géant;Requin-chasseur;Requin géant;Requin de récif;Rhinocéros;Sanglier;Sanglier géant;Scarabée de feu géant;Scorpion;Scorpion géant;Serpent constricteur géant;Serpent constricteur;Serpent venimeux;Serpent venimeux géant;Singe géant;Serpent volant;Tigre;Tigre à dents de sabre;Vautour géant;Vautour""".split(";")}
# Corrections manuelles après relecture
out=[b for b in out if b["id"]!="rat" or b["n"]=="Rat"]
for b in out:
    if not re.match(r"^[A-ZÉÈÀ][\w' \-éèêàçûôïâ]+$",b["n"]): b["n"]="Rat"; b["id"]="rat-x"
    if b["n"]=="Rat géant" or b["id"]=="rat-geant": b["ac"]=b["ac"][:1]
    if b["id"]=="araignee-loup-geante": b["ac"][0]["t"]=re.sub(r"\s*Les araignées-?\s*loups.*$","",b["ac"][0]["t"]).strip()
out=[b for b in out if b["id"]!="rat-x"]
for b in out:
    for x in b["ac"]: x["t"]=re.sub(r"\s+\S*[}|\]]\S*.*$","",re.sub(r"\s*VARIANTE.*$","",x["t"])).strip()
    if b["id"]=="lezard-geant":   # traits de variante rangés à tort dans les actions
        b["tr"]+=[[x["n"]+" (variante)",re.sub(r"\s*Les lézards géants sont.*$","",x["t"]).replace("6tre","être").replace("9 metres","9 m")] for x in b["ac"][1:]]; b["ac"]=b["ac"][:1]
    if b["id"].startswith("pieuvre"):  # le Nuage d'encre est la dernière action : texte complet
        for x in b["ac"]:
            if x["n"]=="Nuage d'encre": x["t"]+=" "+next(d for n_,d in DROP if n_.lower().startswith(b["n"].lower().replace("é","e")) and len(n_)==len(b["n"]))
for b in out:
    k=unicodedata.normalize("NFD",b["n"]).encode("ascii","ignore").decode().lower()
    assert k in _N, b["n"]; b["n"]=_N[k]; b["id"]=k.replace(" ","-")
open(_A.sortie+".ecarte.txt","w",encoding="utf-8").write("\n".join(f"{a}: {b}" for a,b in DROP))
JUNK=re.compile(r"\s+(?:\S*(?:[A-Z]\S*){3,}|\[ \d|_ ep)$")
for b in out:
    for x in b["ac"]: x["t"]=JUNK.sub("",x["t"]).replace("Aprés","Après").replace("relaché","relâché").strip()
    for x in b["tr"]: x[1]=JUNK.sub("",x[1]).replace("Aprés","Après").strip()
for b in out: b.setdefault("cp","")
out.sort(key=lambda b:(b["fpn"],b["n"]))
json.dump(out,open(_A.sortie,"w",encoding="utf-8"),ensure_ascii=False,indent=0)
print(len(out))
