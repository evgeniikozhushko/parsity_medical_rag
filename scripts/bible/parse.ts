import * as fs from "fs"; // "fs" = file system: Node's built-in tool for reading and writing files


// ─────────────────────────────────────────────────────────────
// BOOK NAMES IN BIBLE ORDER
// ─────────────────────────────────────────────────────────────
// The file only has long titles ("The First Book of Moses: Called Genesis"),
// so we keep our own short names. The ORDER matters: the loop below counts
// books in order and uses the count as a position in this list.
// It must be defined before the loop uses it.
const BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
  "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
  "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon",
  "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah",
  "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians",
  "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians",
  "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
  "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
];

// ─────────────────────────────────────────────────────────────
// THE SHAPE OF ONE VERSE
// ─────────────────────────────────────────────────────────────
// A `type` describes what a verse object must contain. TypeScript warns us
// if we forget a field or use the wrong kind of value.
export type Verse = {
  book: string; // "Genesis"
  chapter: number; // 1
  verse: number; // 1
  text: string; // "In the beginning God created the heaven and the earth."
};

export function loadVerses(): Verse[] {

// ─────────────────────────────────────────────────────────────
// READ THE FILE AND KEEP ONLY THE BIBLE TEXT
// ─────────────────────────────────────────────────────────────
const raw = fs.readFileSync("data/bible/kjv.txt", "utf-8"); // whole file as one big string
const start = raw.indexOf("*** START OF"); // position (character number) of the START marker
const end = raw.indexOf("*** END OF"); // position of the END marker
// slice(start, end) keeps the characters from position `start` up to (not including) `end`.
// This drops the license header above and the license footer below.
const body = raw.slice(start, end);

// ─────────────────────────────────────────────────────────────
// FIND EVERY VERSE MARKER LIKE "1:1" OR "23:4"
// ─────────────────────────────────────────────────────────────
// Regex pieces: \d+ = one or more digits, : = a literal colon, \s = any whitespace
// (space, tab or line break), ( ) = "remember this part", g = find ALL matches, not just the first.
// matchAll returns every match; [...] turns the results into a normal list.
// Each item in `markers` has:
//   m[0] = the whole match, e.g. "1:1 "
//   m[1] = the first remembered part (chapter), e.g. "1"
//   m[2] = the second remembered part (verse), e.g. "1"
//   m.index = where the match starts inside `body`
const markers = [...body.matchAll(/(\d+):(\d+)\s/g)];

const verses: Verse[] = []; // an empty list that only accepts Verse items; the loop below fills it

// Counts which book we are in. Starts at -1 so the first 1:1 (Genesis) moves it
// to 0, which is the first item of BOOKS.
let bookIndex = -1;

// ─────────────────────────────────────────────────────────────
// COLLECT THE HEADINGS SO WE CAN CLEAN UP STUCK-ON TITLES
// ─────────────────────────────────────────────────────────────
// Everything before the very first verse marker is the table of contents and headings.
// The chain does: take that part of the text -> split into lines -> trim spaces
// from each line -> drop empty lines. What's left is a list of heading lines,
// such as "The Second Book of Moses: Called Exodus".
const headings = body
  .slice(0, markers[0].index)
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0);

// The next book's title sits in the file right after a book's last verse, so
// it gets glued onto that verse's text. This function removes such headings
// (and stray ***) from the END of a text.
// It repeats because more than one can be stuck on (e.g. a testament
// heading AND a book title after Malachi).
function stripTrailingHeadings(text: string): string {
  let t = text; // working copy
  let changed = true; // did we remove something on the last pass?
  while (changed) {
    changed = false;
    for (const h of headings) {
      if (t.endsWith(h)) {
        t = t.slice(0, t.length - h.length).trim(); // cut the heading off the end
        changed = true; // something changed, so go around again
      }
    }
    // Also remove trailing asterisks like "***". \s* = any spaces, \*+ = one or more stars, $ = at the end.
    const noStars = t.replace(/\s*\*+$/, "");
    if (noStars !== t) {
      t = noStars;
      changed = true;
    }
  }
  return t;
}

// ─────────────────────────────────────────────────────────────
// THE LOOP: CUT THE TEXT BETWEEN MARKERS INTO VERSES
// ─────────────────────────────────────────────────────────────
// Runs once per marker (31,102 times). `i` is the position in the list.
for (let i = 0; i < markers.length; i++) {
  const m = markers[i]; // the current marker
  const chapter = Number(m[1]); // "1" (text) -> 1 (number)
  const verse = Number(m[2]);

  // Chapter 1, verse 1 only happens at the start of a book: move to the next book name.
  if (chapter === 1 && verse === 1) {
    bookIndex++;
  }

  // Text starts right after this marker (marker start + marker length)...
  const textStart = m.index + m[0].length;
  // ...and ends where the next marker begins (or at the end of the text for the last verse).
  // `a ? b : c` means "if a then b, otherwise c".
  const textEnd = i + 1 < markers.length ? markers[i + 1].index : body.length;

  // Cut out the verse, collapse line breaks/extra spaces into single spaces, trim the ends.
  let text = body.slice(textStart, textEnd).replace(/\s+/g, " ").trim();

  // Is this the last verse of its book? It is if the NEXT marker is chapter 1, verse 1.
  // Only those verses can have a next book's title stuck on, so only they get cleaned.
  const next = markers[i + 1]; // undefined for the very last marker
  const isLastOfBook = next && Number(next[1]) === 1 && Number(next[2]) === 1;
  if (isLastOfBook) text = stripTrailingHeadings(text);

  // Add the finished verse to the list.
  verses.push({
    book: BOOKS[bookIndex], // the short name for the current book
    chapter,
    verse,
    text,
  });
}

// Assertions go here, after the loop and before the return
if (verses.length !== 31102) throw new Error(`Expected 31102 verses, got ${verses.length}`);
if (bookIndex + 1 !== 66) throw new Error(`Expected 66 books, got ${bookIndex + 1}`);

return verses;
}