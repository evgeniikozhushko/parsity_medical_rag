/**
 * Parse data/bible/kjv.txt (Project Gutenberg KJV) into verses.
 *
 *   loadVerses(): Verse[]   // { book, chapter, verse, text }
 *
 * Book starts are the 66 "1:1 " lines in the body, in canonical (TOC) order.
 * Verses are found by walking the expected next marker (C:V+1 or C+1:1), so
 * stray "3:4"-like text can't split a verse, and verses sharing a line
 * (e.g. 1 Chronicles 1) are handled.
 */

import * as fs from 'fs';
import * as path from 'path';

export type Verse = { book: string; chapter: number; verse: number; text: string };

const SRC = path.join('data', 'bible', 'kjv.txt');

const BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah',
  'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians',
  '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians',
  '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];

const EXPECTED_COUNTS: Record<string, number> = {
  Genesis: 1533, Psalms: 2461, Revelation: 404,
};

function fail(msg: string): never {
  throw new Error(`parse.ts: ${msg}`);
}

export function loadVerses(): Verse[] {
  const raw = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');
  const start = raw.indexOf('*** START OF');
  const end = raw.indexOf('*** END OF');
  if (start < 0 || end < 0) fail('START/END markers not found');
  const lines = raw.slice(raw.indexOf('\n', start) + 1, end).split('\n');

  const starts: number[] = [];
  lines.forEach((l, i) => {
    if (/^1:1 /.test(l)) starts.push(i);
  });
  if (starts.length !== BOOKS.length) fail(`found ${starts.length} book starts, expected ${BOOKS.length}`);

  const verses: Verse[] = [];
  BOOKS.forEach((book, b) => {
    const body = lines
      .slice(starts[b], b + 1 < BOOKS.length ? starts[b + 1] : lines.length)
      .join(' ')
      // drop the next book's heading text trailing this one is impossible: slice ends at next "1:1" line,
      // but headings sit before it; strip them below by only keeping text up to the last verse.
      .replace(/\s+/g, ' ')
      .trim();

    let chapter = 1;
    let verse = 1;
    let pos = body.indexOf('1:1 ') + 4;
    const bookVerses: Verse[] = [];
    while (true) {
      const nextV = `${chapter}:${verse + 1} `;
      const nextC = `${chapter + 1}:1 `;
      const iv = body.indexOf(` ${nextV}`, pos);
      const ic = body.indexOf(` ${nextC}`, pos);
      const cands = [
        iv >= 0 ? { i: iv, len: nextV.length + 1, c: chapter, v: verse + 1 } : null,
        ic >= 0 ? { i: ic, len: nextC.length + 1, c: chapter + 1, v: 1 } : null,
      ].filter((x): x is NonNullable<typeof x> => x !== null);
      const text = (to: number) => body.slice(pos, to).trim();
      if (cands.length === 0) {
        bookVerses.push({ book, chapter, verse, text: text(body.length) });
        break;
      }
      const n = cands.reduce((a, c) => (c.i < a.i ? c : a));
      bookVerses.push({ book, chapter, verse, text: text(n.i) });
      chapter = n.c;
      verse = n.v;
      pos = n.i + n.len;
    }
    // The last verse of each book may carry the next book's heading lines; those sit
    // before the next "1:1" line only if they follow the final verse, so trim known titles.
    const last = bookVerses[bookVerses.length - 1];
    last.text = last.text.replace(/\s*\*\*\*.*$/, "").replace(
      /\s+(The (First|Second|Third|Fourth|Fifth|Book|Gospel|Acts|Epistle|General|Proverbs|Song|Lamentations|Revelation)\b.*|Ezra|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Ecclesiastes)$/,
      '',
    );
    verses.push(...bookVerses);
  });

  // Sanity checks — fail loudly.
  if (verses.length !== 31102) fail(`verse count ${verses.length}, expected 31102`);
  for (const [book, n] of Object.entries(EXPECTED_COUNTS)) {
    const got = verses.filter((v) => v.book === book).length;
    if (got !== n) fail(`${book} has ${got} verses, expected ${n}`);
  }
  if (verses.some((v) => !v.text)) fail('empty verse text found');
  return verses;
}
