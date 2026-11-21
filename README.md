# CampusFlow OS

Your university life. One intelligent system.

CampusFlow helps a student decide what to do next. It ranks open work, builds a study plan around real availability and campus commitments, and can use a Notion workspace as the source of truth. Without a Notion token, the same screens run on fictional demo data stored in the browser.

## Problem

Students miss deadlines because tasks, classes, clubs, and career work live in different places. A list alone does not say which item should happen inside the hours they actually have.

## What it does

- Dashboard with live counts, charts, and a Smart Daily Brief computed from stored tasks, events, and study hours.
- Task, course, campus event, and career goal create, edit, and delete.
- Deterministic priority score from 0 to 100, with a written reason for each recommendation.
- Daily and weekly planner that respects study hours, breaks, existing events, and deadlines. Scheduling a block does not complete the task.
- Rules-based student assistant. It answers from the current workspace and says so. No language model is connected.
- Demo Mode with local persistence, and a separate Notion mode that pulls and writes through the official SDK on the server.

## Stack

Next.js App Router, TypeScript, Tailwind CSS, Radix UI, Lucide, Recharts, Zod, and `@notionhq/client` 5.x against Notion API version `2025-09-03`.

## Architecture

Browser state lives in `localStorage` under `campusflow.os.v2`. Business rules stay in `lib/`:

- `lib/priority-engine` scores tasks. The formula is `0.40 urgency + 0.30 importance + 0.15 academic relevance + 0.15 duration fit`. Each part is 0–100, then the result is rounded and clamped.
- `lib/planner` places ranked, unfinished tasks into the study window and skips time already taken by events.
- `lib/assistant` routes questions to those same functions.
- `lib/notion` maps CampusFlow records to Notion data sources. Client components call `/api/notion/*`. They never receive `NOTION_API_KEY`.

Demo and Notion data are not merged. The first successful pull stores the demo workspace in `demoBackup` and replaces the visible courses, tasks, events, and goals. “Use Demo Mode” restores that backup. A pull treats Notion as newer: it replaces the connected copy. It does not try to merge unsynced local edits.

## Folder structure

```text
app/                  routes and server API
components/           screens and shared UI
hooks/use-campus.tsx  workspace mutations
lib/priority-engine   scoring and daily brief
lib/planner           study schedule
lib/assistant         rules engine
lib/notion            server-only Notion access
lib/demo              fictional seed
lib/storage           local persistence
types/                domain types
tests/                node:test suites
```

## Run locally

```bash
cd campusflow-os
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

```bash
npm test
npm run lint
npm run build
```

## Environment variables

Copy `.env.example` to `.env.local`. All of these are server-only:

| Variable | Purpose |
| --- | --- |
| `NOTION_API_KEY` | Internal integration secret |
| `NOTION_PARENT_PAGE_ID` | Page shared with the integration |
| `NOTION_TASKS_DATA_SOURCE_ID` | Optional. Setup can fill this in the browser instead. |
| `NOTION_COURSES_DATA_SOURCE_ID` | Optional |
| `NOTION_EVENTS_DATA_SOURCE_ID` | Optional |
| `NOTION_CAREER_DATA_SOURCE_ID` | Optional |

If an environment variable is set, it wins over an ID typed in Settings. The secret is never rendered.

## Notion setup

1. Create an internal integration at [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations).
2. Copy the secret into `NOTION_API_KEY` and restart the server.
3. Create a parent page in Notion and share it with the integration. The integration needs content read and insert access.
4. Copy the page ID from the page URL.
5. In CampusFlow Settings, paste the page ID, choose Test connection, then Set up databases.
6. Setup looks for child databases titled CampusFlow Tasks, CampusFlow Courses, CampusFlow Events, and CampusFlow Career. If they exist, it reuses them. If not, it creates them with an initial data source.
7. Choose Pull from Notion. The app switches to connected mode only after that pull succeeds.

Manual alternative: create those four databases yourself with the property names in `lib/notion/properties.ts`, copy each data source ID into the environment, and pull.

CampusFlow uses data source IDs for queries and page creation, which is the model in Notion API `2025-09-03`. Database creation still goes through `databases.create` and returns the first data source.

## Demo Mode

Leave `NOTION_API_KEY` empty. The app seeds courses, tasks, events, and goals, and keeps them in the browser. Reset in Settings replaces that demo set and keeps the profile. Reset is refused while Notion mode is active, so a reset cannot overwrite a connected workspace with fiction.

## Deploy on Vercel

This repository has not been deployed from here.

1. Import the `campusflow-os` directory as the project root.
2. Set the same environment variables in the Vercel project. Do not prefix them with `NEXT_PUBLIC_`.
3. `npm run build` is the production build.
4. After changing a data source ID, pull again from Settings. IDs created during local setup are stored in the browser, not on Vercel, unless you also put them in the project environment.

## Known limitations

- No accounts. One browser profile.
- The assistant is rules-based. There is no LLM adapter wired up.
- Club responsibilities stay on the device. They are not part of the Notion databases.
- Planner blocks stay on the device. A pull clears them so old demo blocks are not shown on top of Notion tasks.
- Pull replaces the connected copy. If a write succeeds in Notion and a later pull fails, the screen keeps the previous connected copy and shows the error.
- Notion rate limits are retried once. A second failure is shown as a sync failure.
- Deadlines are calendar dates in the profile timezone, default `Asia/Dhaka`. Notion date properties are stored as dates, and the time of day stays `23:59` in CampusFlow.
