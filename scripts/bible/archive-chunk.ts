/**
 * Chunk the KJV: sliding window of 5 verses, stride 4 (1-verse overlap),
 * never crossing a chapter boundary.
 *
 *   npm run bible:chunk   -> data/bible/chunks.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadVerses, type Verse } from './parse';

export type Chunk = {
  id: string;
  reference: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  text: string;
  embedText: string;
};

type Options = { size: number; stride: number };

function makeChunk(win: Verse[]): Chunk {
  const first = win[0];
  const last = win[win.length - 1];
  const range =
    first.verse === last.verse ? `${first.verse}` : `${first.verse}-${last.verse}`;
  const reference = `${first.book} ${first.chapter}:${range}`;
  const text = win.map((v) => v.text).join(' ');
  return {
    id: reference,
    reference,
    book: first.book,
    chapter: first.chapter,
    verseStart: first.verse,
    verseEnd: last.verse,
    text,
    embedText: `${reference} — ${text}`,
  };
}

export function chunkVerses(verses: Verse[], { size, stride }: Options): Chunk[] {
  const chapters = new Map<string, Verse[]>();
  for (const v of verses) {
    const key = `${v.book}|${v.chapter}`;
    const list = chapters.get(key);
    if (list) list.push(v);
    else chapters.set(key, [v]);
  }

  const chunks: Chunk[] = [];
  for (const chapter of chapters.values()) {
    for (let i = 0; i < chapter.length; i += stride) {
      const end = Math.min(i + size, chapter.length);
      chunks.push(makeChunk(chapter.slice(i, end)));
      if (end === chapter.length) break;
    }
  }
  return chunks;
}

function main() {
  const verses = loadVerses();
  const chunks = chunkVerses(verses, { size: 5, stride: 4 });

  const out = path.join('data', 'bible', 'chunks.json');
  fs.writeFileSync(out, JSON.stringify(chunks, null, 2));

  const lens = chunks.map((c) => c.text.length);
  const avg = Math.round(lens.reduce((a, b) => a + b, 0) / lens.length);
  console.log(`Verses: ${verses.length.toLocaleString()}`);
  console.log(`Chunks: ${chunks.length.toLocaleString()}`);
  console.log(`Chars per chunk: avg ${avg}, max ${Math.max(...lens)}`);
  console.log(`Books: ${new Set(chunks.map((c) => c.book)).size}`);
  console.log(`Wrote ${out}`);
}

main();
