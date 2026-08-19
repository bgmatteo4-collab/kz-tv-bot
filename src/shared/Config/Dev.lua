--!strict
--[[
	Dev — les interrupteurs de développement.

	Un seul endroit à basculer avant une publication publique. Tant que
	`AdminEnabled` est vrai, n'importe quel joueur peut s'attribuer de
	l'argent : c'est un outil de test, pas une fonctionnalité.

	Le serveur vérifie ce drapeau à chaque route d'administration. Le client
	ne fait que masquer l'interface, ce qui ne protège rien — c'est le
	serveur qui refuse.
]]

local Dev = {}

--- Console d'administration (touche F4) et applications de prototypage.
--- À PASSER À FALSE AVANT TOUTE PUBLICATION.
Dev.AdminEnabled = true

--- Applications encore à l'état de maquette. Elles montrent à quoi
--- ressemblera le jeu fini sans que la mécanique existe derrière.
Dev.PrototypesEnabled = true

return Dev
