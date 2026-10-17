import * as fs from "fs";
import { loadVerses, type Verse } from "./parse";

const verses = loadVerses(); // the 31,102 verses from parser

// Group verses by chapter, so a chunk can never cross a chapter boundary.
// A Map is a list of key -> value pairs. Here:
//   key   = "Genesis|1"           (book and chapter)
//   value = [all verses of Genesis 1]
const chapters = new Map<string, Verse[]>();
for (const v of verses) {
  const key = `${v.book}|${v.chapter}`;
  if (!chapters.has(key)) chapters.set(key, []); // first time we see this chapter: start an empty list
  chapters.get(key)!.push(v); // add the verse to its chapter's list (the ! tells TypeScript it exists)
}

const SIZE = 5; // verses per window
const STRIDE = 4; // how far the window moves; SIZE - STRIDE = 1 verse of overlap

// Takes ALL verses of one chapter and returns a list of windows.
// Each window is itself a list of up to 5 verses.
function windowsOf(chapterVerses: Verse[]): Verse[][] {
  const windows: Verse[][] = [];
  for (let i = 0; i < chapterVerses.length; i += STRIDE) {
    // The window covers positions i up to (not including) i + SIZE,
    // but never past the end of the chapter.
    const end = Math.min(i + SIZE, chapterVerses.length);
    windows.push(chapterVerses.slice(i, end));
    // If this window already reaches the chapter's last verse, stop.
    if (end === chapterVerses.length) break;
  }
  return windows;
}

// Turn each window into a chunk object
// What one chunk looks like.
type Chunk = {
  id: number; // 0, 1, 2... (Qdrant needs a number or UUID, not "Genesis 1:1-5")
  reference: string; // "Genesis 1:1-5", shown to the user
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  text: string; // the verses joined together, returned in search results
  embedText: string; // reference + text: this is what gets turned into a vector
};

// Turn one window (a list of verses) into one chunk.
function buildChunk(id: number, window: Verse[]): Chunk {
  const first = window[0];
  const last = window[window.length - 1];
  // "Genesis 1:1-5", or "John 11:35" if the window is a single verse
  const range =
    first.verse === last.verse ? `${first.verse}` : `${first.verse}-${last.verse}`;
  const reference = `${first.book} ${first.chapter}:${range}`;
  const text = window.map((v) => v.text).join(" "); // join the verse texts with spaces
  return {
    id,
    reference,
    book: first.book,
    chapter: first.chapter,
    verseStart: first.verse,
    verseEnd: last.verse,
    text,
    embedText: `${reference} — ${text}`,
  };
}

// Build ALL chunks: go through every chapter, every window.
const chunks: Chunk[] = [];
for (const chapterVerses of chapters.values()) {
  for (const window of windowsOf(chapterVerses)) {
    chunks.push(buildChunk(chunks.length, window)); // chunks.length = next free id
  }
}

// Save them to a file for the next step (embedding + Qdrant).
fs.writeFileSync("data/bible/chunks.json", JSON.stringify(chunks, null, 2));

// CHECKS
const lengths = chunks.map((c) => c.text.length);
console.log("chunks:", chunks.length, "(expect 7924)");
console.log("avg chars:", Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length));
console.log("max chars:", Math.max(...lengths));
console.log("unique references:", new Set(chunks.map((c) => c.reference)).size, "(expect 7924)");
console.log("first:", chunks[0].reference, "| last:", chunks[chunks.length - 1].reference);
console.log(chunks.find((c) => c.reference === "1 Corinthians 13:1-5")?.text);