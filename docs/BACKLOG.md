# Backlog

Tout ce qu'on voudrait ajouter ou modifier, **non affecté à une version**.

Rien d'inscrit ici n'est développé tant que le porteur du projet n'a pas dit
« on démarre la vX.Y ». À ce moment-là, les entrées retenues sortent d'ici,
entrent dans la version, et se retrouvent dans `PATCH-NOTES.md` une fois livrées.

**Cible** = la version où l'entrée a sa place (feuille de route : CDC §10.3).
**État** = `à décider` · `retenu` · `en cours` · `écarté`.

---

## Décisions en attente

| # | Sujet | Cible | État |
|---|---|---|---|
| D8 | Ambiance sonore : fond du local, musique, jingles | v0.5 | à décider |
| D9 | Capacité du public sur le plateau, dans le budget de 25 PNJ | v0.6 | à décider |
| D10 | Mode répétition sans enjeu, pour apprendre face à l'exigence élevée | v0.5 | à décider |
| D11 | Prise en charge de la manette | v1.0 | à décider |
| D12 | Monétisation, s'il doit y en avoir une | après v1.0 | à décider |

## Fonctionnalités souhaitées

| # | Sujet | Cible | État |
|---|---|---|---|
| S1 | Éclairage pilotable par ambiances préenregistrées | v0.4 | retenu |
| S2 | Valeurs de plan et cadrage manuel à la caméra | v0.5 | retenu |
| S3 | Chaîne son : perches, micros cravate, retours | v0.5 | retenu |
| S4 | Loge et préparation des invités | v0.6 | retenu |
| S5 | Plusieurs identités d'émission enregistrables | v1.0 | retenu |
| S6 | Personnalisation de l'avatar | v1.0 | retenu |
| S7 | Cycle jour/nuit et lumière naturelle par les baies | v0.2 | retenu |
| S8 | Mode photo | après v1.0 | à décider |
| S9 | Rediffusion d'une émission produite | après v1.0 | à décider |
| S10 | Multijoueur coopératif | après v1.0 | écarté au lancement |
| S11 | Marques sponsors fictives : identités et archétypes | v1.0 | retenu |

## À vérifier dans le moteur

Points dont la valeur a été posée par le calcul et qui doivent être confrontés
au rendu réel avant d'être figés. **L'instrument existe** : le panneau de
diagnostic de la v0.1, touche `F3`. Il reste à faire la mesure dans Studio.

| # | Sujet | Pourquoi |
|---|---|---|
| V1 | Hauteur exacte de l'avatar par défaut | Toute la table d'échelle en dépend (CDC §9.1) |
| V2 | Largeur de porte praticable | 6,3 studs est juste au réel, mais l'avatar Roblox est large |
| V3 | Plafond de bureau à 9 studs | Peut paraître écrasant en vue première personne |
| V4 | Budget de 12 lumières à ombre | Valeur posée par prudence, à mesurer réellement |
| V5 | Coût réel des matériaux PBR sur un plateau entier | Détermine si le plafond de 12 matériaux tient |

## Dette technique et éléments temporaires

| # | Sujet | Pourquoi c'est là | Ce qu'il faudra |
|---|---|---|---|
| T1 | Selene absent de la CI | La génération de sa bibliothèque standard Roblox échoue depuis l'environnement de développement. La syntaxe, le format et la construction sont vérifiés ; le linting ne l'est pas. | Fiabiliser `selene generate-roblox-std`, ou committer une bibliothèque standard générée, puis ajouter l'étape à `controles.yml`. |
| T2 | `Palette.AccentProvisoire` | La couleur d'accent du lavage de fond attend l'identité Kay Prod (CDC §9.6). Nommée « provisoire » pour qu'elle ne s'installe pas par oubli. | La remplacer par la couleur d'accent de la charte de marque. |
| T3 | Aucun mobilier de plateau | Les canapés, la table basse et les caméras de la configuration talk-show demandent de vrais modèles 3D, qui ne peuvent pas être produits par code. Aucun cube n'a été posé à leur place (CDC §17.1). | Produire ou acquérir les modèles, puis les intégrer aux cotes réelles. |

## Problèmes connus

*Vide. La v0.1 n'a pas encore tourné dans Studio — cette section se remplira au
premier test.*
