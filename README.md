# LoclAI — Chat IA local via Ollama

**LoclAI** est une interface de chat pour discuter avec des modèles d'IA exécutés localement via [Ollama](https://ollama.com). Vos conversations, vos paramètres et vos modèles restent sur votre machine — rien n'est envoyé vers un service cloud.

Le navigateur affiche l'interface et sert de pont vers Ollama (`http://127.0.0.1:11434`). L'historique est conservé dans **IndexedDB**, directement dans le navigateur.

- Chat en streaming, multi-conversations, export/import JSON
- Gestion des modèles : recherche, téléchargement, désactivation, suppression
- System prompt configurables par conversation

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

Dans **Paramètres**, vous pouvez :

- configurer l'URL Ollama et le modèle par défaut
- **rechercher** des modèles sur la bibliothèque Ollama et les **télécharger** (`pull`)
- **désactiver** un modèle (masqué du chat, mais toujours installé)
- **supprimer** un modèle de la machine

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
4. Vérifier le statut Ollama dans l'en-tête du chat

### Variables d'environnement (optionnelles)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_OLLAMA_URL` | URL Ollama par défaut |
| `NEXT_PUBLIC_DEFAULT_OLLAMA_MODEL` | Modèle par défaut (ex. `qwen3.5:4b`) |

## Fonctionnalités

- Chat streaming avec annulation
- Conversations : créer, renommer, dupliquer, supprimer, rechercher
- Sélecteur de modèle (modèles installés et actifs)
- Modification et copie des messages
- Blocs de code avec coloration syntaxique
- System prompt par conversation
- Copier / régénérer les réponses assistant
- Gestion des modèles Ollama (recherche, pull, désactivation, suppression)
- Export / import JSON des conversations

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

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind 4 · Dexie · Zustand · react-markdown

## Roadmap (v2+)

- Assistants / personas
- Métriques tokens/s
- PWA offline complète
- RAG documents locaux
- Mode comparaison multi-modèles
