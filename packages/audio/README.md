# @markitdownjs/audio

[![npm](https://img.shields.io/npm/v/@markitdownjs/audio)](https://www.npmjs.com/package/@markitdownjs/audio)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Audio file converter for [MarkItDownJS](https://github.com/markitdownjs/markitdownjs). Extracts metadata (title, artist, duration, codec) from audio files and produces structured document nodes.

**Supported formats:** MP3, WAV, OGG, FLAC, M4A

## Install

```bash
npm install @markitdownjs/audio @markitdownjs/core
```

## Usage

```ts
import { MarkItDown } from "@markitdownjs/core";
import { AudioConverter } from "@markitdownjs/audio";

const parser = new MarkItDown();
parser.registerConverter(new AudioConverter());

const result = await parser.convert({ source: audioBuffer, mimeType: "audio/mpeg" });
```

## API

### `AudioConverter`

Implements the `IConverter` interface from `@markitdownjs/core`.

| Method | Description |
|--------|-------------|
| `convert(input)` | Reads audio metadata and returns a document node |
| `canHandle(mimeType)` | Returns `true` for `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/flac`, `audio/mp4` |

Extracted fields: `title`, `artist`, `album`, `duration`, `bitrate`, `codec`, `sampleRate`.

## Part of the MarkItDownJS Monorepo

[https://github.com/markitdownjs/markitdownjs](https://github.com/markitdownjs/markitdownjs)
