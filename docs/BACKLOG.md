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
| ~~V1~~ | ~~Hauteur exacte de l'avatar~~ | **Résolu le 26/08 : 6,12 studs mesurés. L'échelle passe de 3 à 3,5 studs par mètre.** |
| ~~V2~~ | ~~Largeur de porte praticable~~ | **Traité : portes intérieures portées de 0,90 m à 1,20 m.** À reconfirmer en jeu. |
| V3 | Plafond de bureau à 10,5 studs | Peut paraître écrasant en vue première personne |
| V4 | Budget de 12 lumières à ombre | Valeur posée par prudence, à mesurer réellement |
| V5 | Coût réel des matériaux PBR sur un plateau entier | Détermine si le plafond de 12 matériaux tient |

## Dette technique et éléments temporaires

| # | Sujet | Pourquoi c'est là | Ce qu'il faudra |
|---|---|---|---|
| T1 | Selene absent de la CI | La génération de sa bibliothèque standard Roblox échoue depuis l'environnement de développement. La syntaxe, le format et la construction sont vérifiés ; le linting ne l'est pas. | Fiabiliser `selene generate-roblox-std`, ou committer une bibliothèque standard générée, puis ajouter l'étape à `controles.yml`. |
| T2 | `Palette.AccentProvisoire` | La couleur d'accent du lavage de fond attend l'identité Kay Prod (CDC §9.6). Nommée « provisoire » pour qu'elle ne s'installe pas par oubli. | La remplacer par la couleur d'accent de la charte de marque. |
| T4 | `StreamingEnabled` désactivé | Le chargement par flux n'apporte rien sur une pièce de soixante parts et a masqué un défaut au premier lancement : sans personnage, aucun décor ne se chargeait, donnant un ciel vide. Le CDC §14 le rend obligatoire. | Le réactiver en v0.2, quand le local entier existera et qu'il aura une raison d'être. |
| T3 | Aucun mobilier de plateau | Les canapés, la table basse et les caméras de la configuration talk-show demandent de vrais modèles 3D, qui ne peuvent pas être produits par code. Aucun cube n'a été posé à leur place (CDC §17.1). | Produire ou acquérir les modèles, puis les intégrer aux cotes réelles. |

## Problèmes connus

| # | Problème | État |
|---|---|---|
| P1 | Le sas d'entrée était totalement noir : aucune source de lumière dans une pièce fermée, avec une ambiance générale à zéro | **corrigé** |
| P2 | Le personnage n'apparaissait pas : la suspension d'apparition pendant la construction ne se relâchait pas | **corrigé** — point d'apparition désormais statique, présent dans le fichier de place |
| P3 | Aucun décor visible côté client : sans personnage, le chargement par flux ne chargeait rien | **corrigé** — flux désactivé en v0.1 (dette T4) |
| P4 | Le compte de parts du panneau était figé au démarrage du client, donc pris avant la fin de la construction | **corrigé** — recalculé à chaque rafraîchissement |
| P5 | Le panneau de diagnostic passait sous le menu Roblox en haut à gauche | **corrigé** — descendu de 116 pixels |
| P6 | La construction échouait entièrement : lire `Lighting.Technology` demande une capacité qu'un script serveur ordinaire n'a pas | **corrigé** — lecture protégée. Une vérification de confort ne doit jamais pouvoir empêcher la construction |
| P7 | L'échelle était fausse de 18 % : avatar supposé à 5,2 studs, mesuré à 6,12 | **corrigé** — 1 m = 3,5 studs |
