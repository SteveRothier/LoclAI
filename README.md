# LoclAI — Chat IA local via Ollama

**LoclAI** est une interface de chat pour discuter avec des modèles d'IA exécutés localement via [Ollama](https://ollama.com). Vos conversations, vos paramètres et vos modèles restent sur votre machine — rien n'est envoyé vers un service cloud.

Le navigateur affiche l'interface et sert de pont vers Ollama (`http://127.0.0.1:11434`). L'historique est conservé dans **IndexedDB**, directement dans le navigateur.

- Chat en streaming, multi-conversations, export/import JSON
- Sidebar repliée style ChatGPT avec flyouts (historique, recherche, archives)
- Paramètres en modal overlay (6 sections)
- Gestion des modèles : recherche, téléchargement, désactivation, suppression
- Assistants / personas configurables
- Contexte limité, métriques tokens et estimation du contexte envoyé

## Démarrage rapide

### Prérequis

- Node.js 20+
- [Ollama](https://ollama.com/download) installé et lancé

```powershell
ollama pull qwen3.5:4b
ollama serve
```

### Installation

```powershell
cd loclai
npm install
npm run dev
```

→ [http://localhost:3000](http://localhost:3000)

En local, le navigateur contacte Ollama directement — aucune configuration CORS nécessaire.

## Paramètres

Ouvrez la modal **Paramètres** depuis la barre latérale ou avec **`Ctrl+,`** ( **`Cmd+,`** sur Mac).

Six sections :

| Section | Contenu |
|---------|---------|
| **Général** | Thème clair / sombre / système |
| **Ollama** | URL, modèle par défaut, test connexion, contexte |
| **Assistants** | Personas réutilisables |
| **Modèles** | Liste installée, téléchargement, désactivation, suppression |
| **Données** | Export / import JSON |
| **Avancé** | Déploiement Vercel + Ollama local |

Liens profonds (bookmarks) :

- `/settings` — ouvre la modal Paramètres
- `/settings?section=ollama` — ouvre directement la section Ollama
- `/archives` — ouvre le flyout Archives dans la sidebar

## Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Entrée` | Envoyer le message |
| `Shift+Entrée` | Nouvelle ligne dans le composer |
| `Ctrl+,` / `Cmd+,` | Ouvrir les Paramètres |
| `Échap` | Fermer modals et flyouts |

## Déploiement Vercel + Ollama local

Quand l'app est hébergée sur Vercel, le serveur Vercel **ne peut pas** joindre `127.0.0.1` sur votre PC. L'app appelle donc Ollama **depuis votre navigateur**.

### Checklist

1. Déployer sur Vercel (`vercel deploy` ou push Git)
2. Sur votre PC, autoriser l'origine Vercel dans Ollama :

```powershell
$env:OLLAMA_ORIGINS="https://votre-app.vercel.app"
ollama serve
```

3. Ouvrir l'URL Vercel **depuis le même PC** où Ollama tourne
4. Vérifier le statut Ollama dans le bandeau du chat ou dans Paramètres → Ollama

### Variables d'environnement (optionnelles)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_OLLAMA_URL` | URL Ollama par défaut |
| `NEXT_PUBLIC_DEFAULT_OLLAMA_MODEL` | Modèle par défaut (ex. `qwen3.5:4b`) |

## Fonctionnalités

- Chat streaming avec annulation
- Composer intégré : sélecteur de modèle, paramètres de conversation (panneau flottant)
- Sidebar repliée/étendue persistante avec flyouts au clic (historique, recherche, archives)
- Conversations : créer (avec choix d'assistant), renommer, dupliquer, épingler, archiver, supprimer, rechercher
- **Archives** via flyout sidebar (restaurer les conversations masquées)
- Assistants / personas : profils prédéfinis ou personnalisés, choix à la création ou dans le composer
- Contexte limité configurable (messages les plus anciens exclus automatiquement)
- Bandeau d'information : messages exclus + estimation tokens du contexte
- Métriques sous les réponses assistant (tokens prompt/complétion, vitesse tok/s)
- Modification et copie des messages ; copier / régénérer les réponses assistant
- Blocs de code avec coloration syntaxique
- System prompt par conversation
- Mode clair / sombre / système avec persistance locale
- Paramètres en modal overlay (sans quitter la conversation)
- Gestion des modèles Ollama (recherche, pull, désactivation, suppression)
- Export / import JSON des conversations
- Toasts de feedback et loaders personnalisés
- **PWA** : installable (bureau/mobile), cache du shell UI, page hors ligne

## Application installable (PWA)

En **production** (`npm run build` puis `npm run start`, ou déploiement Vercel) :

| Plateforme | Installation |
|------------|--------------|
| Chrome / Edge (desktop, Android) | Icône « Installer » dans la barre d'adresse, ou bannière en bas de l'écran |
| Safari (iOS) | Partager → **Sur l'écran d'accueil** |

**Hors ligne :** l'interface et l'historique IndexedDB restent accessibles. Le chat nécessite toujours **Ollama** en ligne sur votre machine.

Le service worker est désactivé en `npm run dev` pour éviter les conflits avec Turbopack.

## Architecture

```
Navigateur
  ├── IndexedDB  → conversations, messages, paramètres
  └── fetch      → Ollama local :11434 (/api/chat, /api/tags, /api/pull, /api/delete)
```

## Scripts

```powershell
npm run dev      # développement
npm run build    # build production
npm run start    # serveur production
npm run lint     # ESLint
npm test         # tests unitaires (Vitest)
```

Les tests couvrent la logique métier (`lib/chat`, `lib/ollama`) — pas les composants UI.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind 4 · Dexie · Zustand · react-markdown

## Roadmap

### Fait (v1.1)

- Contexte limité et bandeau d'exclusion
- Métriques tokens / tok/s sous les réponses
- Épinglage des conversations
- Assistants / personas
- Composer style Cursor, loaders personnalisés

### Fait (v1.2)

- Mode clair / sombre / système avec persistance
- Archivage des conversations + flyout sidebar
- Choix d'assistant à la création (`NewChatMenu`)
- Estimation tokens du contexte dans le bandeau
- Sidebar repliée style ChatGPT + flyouts historique/recherche
- Paramètres en modal overlay (6 sections, `Ctrl+,`)
- Polish UI paramètres (nav groupée, statut Ollama, thème segmented)

### Fait (v2.0)

- PWA installable : icônes, manifest complet, service worker (Serwist)
- Cache du shell UI + page hors ligne (`/~offline`)
- Bannière d'installation (Chrome/Edge)

### v2 — suite

Ordre de priorité suggéré :

1. **Comparaison multi-modèles** — 2 colonnes, 2 streams parallèles pour benchmark local
2. **RAG documents locaux** — upload, chunks, embeddings Ollama, injection contexte

Voir [`docs/ROADMAP-v2.md`](docs/ROADMAP-v2.md) pour le plan détaillé v2.
