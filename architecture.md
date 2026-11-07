# Architecture

## Overview

Nuxt 4 application using the default `app/` source directory convention.

## Directory structure

```
app/
  app.vue                  # root, theme init
  layouts/default.vue      # shell: sidebar + header + content + mobile nav + search
  components/
    app/                   # AppSidebar, AppHeader, AppHeaderMobile
    gallery/               # GalleryGrid, GalleryImageCard, FilterBar, EmptyState
    viewer/                # ImageViewer
    anime/                 # AnimeCard
    collections/           # CollectionCard
    search/                # SearchCommand
    ui/                    # ThemeSwitcher, LoadingSkeleton, ConfirmationDialog
    MobileNav.vue
  composables/
    useTheme.ts, useSidebar.ts, useGallery.ts
  pages/                   # file-based routes
  services/api/
    types.ts               # TypeScript interfaces
    mockData.ts            # demo data
    client.ts              # API abstraction (mock implementation)
  assets/css/
    tokens.css, tailwind.css, base.css
public/
  logo.png, favicon.ico, robots.txt
```

## Key decisions

- **API boundary**: `services/api/client.ts` exposes an `ApiClient` interface implemented with in-memory mock data. A Go/Python backend replaces only this file.
- **State**: component-local refs + composables; no global store needed for two-user archive scale.
- **Theming**: CSS custom properties toggled via `data-theme` attribute.
- **Performance**: `experimental.watcher: 'builder'`, `buildCache: true`, ignore `.mimocode`/`dist`.
- **Icons**: single set `@lucide/vue` at 16px (nav) / 20px (mobile).

## Data model

See `services/api/types.ts`: User, Anime, Episode, Screenshot, Collection, Tag, StorageInfo, UploadItem, SearchResult.
