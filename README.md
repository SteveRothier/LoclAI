# LoclAI — Chat IA local via Ollama

Alternative à ChatGPT **100 % locale** : l'interface peut être déployée sur Vercel, mais **toutes les conversations et l'inférence restent sur votre machine**.

- Inférence via [Ollama](https://ollama.com) (`http://127.0.0.1:11434`)
- Historique stocké dans **IndexedDB** (navigateur) — zéro persistance cloud
- Streaming token par token, gestion multi-conversations, export/import JSON

## Démarrage rapide

### Prérequis

- Node.js 20+
- [Ollama](https://ollama.com/download) installé et lancé

```powershell
ollama pull llama3.2
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
4. Vérifier le badge **Ollama actif** dans la sidebar

### Variables d'environnement (optionnelles)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_OLLAMA_URL` | URL Ollama par défaut |
| `NEXT_PUBLIC_DEFAULT_OLLAMA_MODEL` | Modèle par défaut (ex. `llama3.2`) |

## Fonctionnalités MVP

- Chat streaming avec annulation
- Conversations : créer, renommer, supprimer, rechercher
- Sélecteur de modèle (liste `/api/tags`)
- System prompt et température par conversation
- Copier / régénérer les réponses assistant
- Export / import JSON des conversations
- Badge **Zero Cloud** — rappel que les données restent locales

## Architecture

```
Navigateur (UI Vercel ou localhost)
  ├── IndexedDB  → conversations, messages, paramètres
  └── fetch      → Ollama local :11434 (/api/chat, /api/tags)
```

## Scripts

```powershell
npm run dev      # développement
npm run build    # build production
npm run start    # serveur production
npm run lint     # ESLint
```

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind 4 · Dexie · Zustand · react-markdown

## Roadmap (v2+)

- Fork de conversation
- Assistants / personas
- Métriques tokens/s
- PWA offline complète
- RAG documents locaux
- Mode comparaison multi-modèles
