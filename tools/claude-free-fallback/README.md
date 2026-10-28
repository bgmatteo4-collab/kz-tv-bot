# Claude Code → modèles gratuits quand la limite est atteinte

`proxy.mjs` est un petit proxy local, sans dépendance. Claude Code lui parle
comme s'il parlait à Anthropic. Les requêtes partent d'abord vers Anthropic ;
si Anthropic répond `429` (limite atteinte), la requête est rejouée sur
[FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi) qui route vers des
modèles gratuits. Pendant `FALLBACK_COOLDOWN_MIN` minutes (30 par défaut), les
requêtes vont directement à FreeLLMAPI, puis Anthropic est retesté.

## 1. Installer FreeLLMAPI

Le plus simple (Docker requis) :

```bash
curl -fsSL https://freellmapi.co/install.sh | bash
```

Ou, depuis le dépôt cloné :

```bash
git clone https://github.com/tashfeenahmed/freellmapi.git
cd freellmapi
docker compose up -d
```

Ouvre http://localhost:3001 :

1. Page **Keys** : ajoute au moins une clé de fournisseur gratuit (Groq, Google, Cerebras…).
2. Page **Keys**, en haut : copie ta **clé unifiée** (`freellmapi-…`).
3. Onglet **Keys → Anthropic** : vérifie que les familles `sonnet` / `haiku` / `opus` pointent vers `auto`.

## 2. Lancer le proxy

Nécessite Node 18+.

```bash
export FREELLM_KEY=freellmapi-ta-cle-unifiee
node tools/claude-free-fallback/proxy.mjs
```

Options (variables d'environnement, facultatives) :

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `PORT` | `8787` | port local du proxy |
| `FREELLM_URL` | `http://localhost:3001` | adresse de FreeLLMAPI |
| `FREELLM_KEY` | — (obligatoire) | clé unifiée FreeLLMAPI |
| `ANTHROPIC_UPSTREAM` | `https://api.anthropic.com` | destination normale |
| `FALLBACK_COOLDOWN_MIN` | `30` | durée de bascule après un 429 |

## 3. Lancer Claude Code à travers le proxy

Dans un autre terminal :

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:8787
claude
```

Ne mets pas `ANTHROPIC_API_KEY` : le proxy transmet tel quel ton authentification
Claude habituelle à Anthropic, et utilise `FREELLM_KEY` uniquement en secours.

## Limites connues

- La bascule ne se déclenche que sur un `429`. Les erreurs `529` (surcharge) ne basculent pas.
- Une fois basculé, Claude Code utilise les modèles gratuits (qualité et contexte variables).
- Le proxy n'écrit aucun secret sur disque ; ne le lance pas hors de ta machine.
