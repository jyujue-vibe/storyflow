# StoryFlow

Turn one short Burmese idea into a complete cartoon episode package —
Title & Details, Story Summary, Character Bible, Character Sheet Prompts,
Scene Continuity Plan, Scene Prompts (IMAGE + VIDEO), Continuity Note &
Hook, and Story Record. Copy the prompts into Google Flow to make the
stills and clips (16:9).

Solo-use app. The Gemini API key is entered in the app's Settings and lives
only in the user's browser local storage — it is never committed to this
repo.

## Develop

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

## Deploy

Pushing to `main` builds the site and deploys it to GitHub Pages via
`.github/workflows/deploy.yml`. The production build sets `GITHUB_PAGES`
so the Vite base path is `/storyflow/`.

Stack: Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui.
