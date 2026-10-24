"""Marquage « ensorceleur » des 126 sorts de sa liste (export AideDD « Sorts - ensorceleur », règles 2014) et ajout d'Amis (sort mineur, aussi magicien).

DÉJÀ APPLIQUÉ (octobre 2026). Le relancer ne change rien.
La liste a été relevée par outils/ocr_pdf.py puis outils/sorts_aidedd.py sur l'export, et recoupée avec data/spells.json (niveaux identiques).
"""
import json, os
P = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "spells.json")
FRIENDS = {"en": "Friends", "l": 0, "s": "Enchantement", "t": "1 action", "r": "Personnelle", "d": "1 minute", "c": True, "ri": False, "v": "S,M", "g": 0, "x": False, "n": "Amis",
  "e": "Avantage à tous tes tests de Charisme contre une créature non hostile de ton choix. À la fin du sort, elle sait que tu l'as influencée et peut devenir hostile.", "id": "friends", "p": "f:Avantage aux tests de CHA", "j": "", "ok": "", "z": "", "up": "", "cl": ["magicien"]}
LIST = "acid-splash alter-self animate-objects arcane-gate banishment blight blindness-deafness blink blur burning-hands chain-lightning charm-person chill-touch chromatic-orb circle-of-death clairvoyance cloud-of-daggers color-spray comprehend-languages cone-of-cold confusion counterspell creation crown-of-madness dancing-lights darkness darkvision daylight delayed-blast-fireball detect-magic detect-thoughts dimension-door disguise-self disintegrate dispel-magic dominate-beast dominate-monster dominate-person earthquake enhance-ability enlarge-reduce etherealness expeditious-retreat eyebite false-life fear feather-fall finger-of-death fire-bolt fire-storm fireball fly fog-cloud friends gaseous-form gate globe-of-invulnerability greater-invisibility gust-of-wind haste hold-monster hold-person hypnotic-pattern ice-storm incendiary-cloud invisibility jump knock levitate light lightning-bolt mage-armor mage-hand magic-missile major-image mass-suggestion mending message meteor-swarm minor-illusion mirror-image misty-step move-earth phantasmal-force plane-shift poison-spray polymorph power-word-kill power-word-stun prestidigitation prismatic-spray protection-from-energy ray-of-frost ray-of-sickness reverse-gravity scorching-ray see-invisibility seeming shatter shield shocking-grasp silent-image sleep sleet-storm slow spider-climb stinking-cloud stoneskin suggestion sunbeam sunburst telekinesis teleport teleportation-circle thunderwave time-stop tongues true-seeing true-strike wall-of-fire wall-of-stone water-breathing water-walk web wish witch-bolt".split()
d = json.load(open(P, encoding="utf-8"))
if not any(s["id"] == "friends" for s in d): d.append(FRIENDS)
by = {s["id"]: s for s in d}
assert len(LIST) == 126 and all(i in by for i in LIST), [i for i in LIST if i not in by]
for i in LIST:
    if "ensorceleur" not in by[i]["cl"]: by[i]["cl"].append("ensorceleur")
open(P, "w", encoding="utf-8").write("[\n" + ",\n".join(json.dumps(s, ensure_ascii=False) for s in d) + "\n]\n")
print(len(d), "sorts ;", sum("ensorceleur" in s["cl"] for s in d), "d'ensorceleur")
