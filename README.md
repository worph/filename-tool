# Filename Tool

TypeScript library for extracting metadata from media filenames, designed for the MetaMesh ecosystem.

Package name: `@metazla/filename-tools` (plural — kept for backwards compatibility).

## Overview

`@metazla/filename-tools` parses media file paths to extract structured metadata: titles, seasons, episodes, movie years, plus file-type classification driven by extension and MIME-type mappings. It is a pure-TS library — no Docker, no service. Used inside meta-sort (`WatchedFileProcessor`) and inside the `metamesh-plugin-filename-parser` container plugin.

## Features

- **Video metadata extraction** — title, season, episode, increment, movie year, `videoType: "movie" | "tvshow"`
- **File-type classification** — by extension and MIME type, into a small set (`video`, `audio`, `subtitle`, `document`, `archive`, `torrent`, `other`, `undefined`)
- **Title heuristics** — combines filename, parent folder, grandparent folder; TV-show pattern detection picks the series name over the episode name
- **Folder helpers** — sibling-file lookup
- **Language helpers** — convert anything (ISO 639-1 / 2 / 3 / full name) to ISO 639-3
- **Configurable** — every pattern set (`episodePatterns`, `seasonAndEpisodePatterns`, `keywordsArray`, …) is exported and overridable

## Installation

In the monorepo:

```json
{
  "dependencies": {
    "@metazla/filename-tools": "workspace:*"
  }
}
```

Build from `packages/filename-tool/`:

```bash
pnpm build
pnpm test    # vitest
```

## Public API

The full export list is in `src/lib/index.ts`. The two extractor classes are the main entry points; the rest are tools/configs that the extractors consume but you can use directly.

### `FileNameMetaExtractor`

`extractMetadata(filePath)` is the high-level entry point. It returns a `FileMetadata` (extends `VideoFileMetadata`):

```typescript
import { FileNameMetaExtractor, FileMetadata } from '@metazla/filename-tools';

const watchFolders = ['/files/watch'];
const extractor = new FileNameMetaExtractor(watchFolders);

const metadata: FileMetadata = await extractor.extractMetadata(
  '/files/watch/Naruto/Season 01/Naruto.S01E01.1080p.mkv',
);

// metadata fields that may be populated:
//   fileName     : "Naruto.S01E01.1080p.mkv"
//   extension    : "mkv"
//   fileType     : "video"
//   tags         : string[]                  (extracted from brackets)
//   originalTitle: "Naruto"
//   season       : "1"
//   episode      : "1"
//   increment    : "10001"                   (season * 10000 + episode)
//   movieYear?   : string
//   videoType    : "tvshow"                  (or "movie")
//   extra?       : "true"                    (specials/extras)
```

The optional second constructor arg is a path to a JSON file that overrides any of the default pattern sets (`extensionMappings`, `mimeTypeMappings`, `episodePatterns`, `seasonAndEpisodePatterns`, `seasonPatterns`, `extraEpKeyWords`, `keywordsArray`, `substringArray`, `soloEp`).

### `FileNameVideoMetaExtractor`

Lower-level — only does the video bits (title, season/episode, year, videoType). Requires all pattern arrays as constructor args (see how `metamesh-plugin-filename-parser` constructs it):

```typescript
import {
  FileNameVideoMetaExtractor,
  episodePatterns,
  seasonAndEpisodePatterns,
  seasonPatterns,
  extraEpKeyWords,
  keywordsArray,
  substringArray,
  soloEp,
  VideoFileMetadata,
} from '@metazla/filename-tools';

const extractor = new FileNameVideoMetaExtractor(
  [],
  episodePatterns,
  seasonAndEpisodePatterns,
  seasonPatterns,
  extraEpKeyWords,
  keywordsArray,
  substringArray,
  soloEp,
);

const meta: VideoFileMetadata = extractor.extractVideoFileMetadata(
  'The.Matrix.1999.1080p.BluRay.x264-GROUP.mkv',
);
// { originalTitle: "The Matrix", movieYear: "1999", videoType: "movie" }
```

### `FileType`

Synchronous classifier wrapping `FileTypeConfigurable` with the default mappings:

```typescript
import { FileType, SimpleFileType } from '@metazla/filename-tools';

const ft = new FileType();
const t: SimpleFileType = await ft.getFileType('episode.mkv');  // "video"
```

`SimpleFileType` is the union of all classifications: `'audio' | 'video' | 'document' | 'archive' | 'subtitle' | 'torrent' | 'other' | 'undefined'`.

### Folder helper

```typescript
import { getSiblingFiles } from '@metazla/filename-tools';

// Returns siblings sharing the same basename (any extension).
const siblings = await getSiblingFiles('/media/show/episode.nfo');
```

### Language helper

```typescript
import { anyTo_iso_639_3 } from '@metazla/filename-tools';

anyTo_iso_639_3('en');         // "eng" (ISO 639-1 → 639-3)
anyTo_iso_639_3('english');    // "eng" (name → 639-3)
anyTo_iso_639_3('jpn');        // "jpn" (already 639-3; pass-through)
```

## What `videoType` actually contains

Note this differs from what some older docs claim — the library only emits `"tvshow"` or `"movie"`. There is no `"anime"`/`"documentary"`/`"unknown"` value. Anime-detection happens elsewhere (the `metamesh-plugin-anime-detector` plugin and `AnimeMeta` in `@metazla/meta-interface`).

## Build

Dual-format build via `tsup`:

- `dist/index.js` (ESM)
- `dist/index.cjs` (CommonJS)
- `dist/index.d.ts` (types)

```bash
pnpm build      # tsc + tsup
pnpm test       # vitest
```

## License

MIT — same as the MetaMesh monorepo.
