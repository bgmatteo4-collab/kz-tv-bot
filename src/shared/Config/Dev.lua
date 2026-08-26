--!strict
--[[
	Dev — les drapeaux de développement.

	Cahier des charges §15 : aucun outil de développement actif en production.
	Ces drapeaux doivent tous être à `false` avant publication, et le serveur
	les vérifie lui-même — masquer une interface ne protégerait rien.
]]

return {
	--- Affiche le panneau de diagnostic client (images par seconde, mesures).
	DiagnosticActif = true,
}
