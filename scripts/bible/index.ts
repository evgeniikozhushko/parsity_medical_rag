import "dotenv/config"; // loads OPENAI_API_KEY from .env (must be the first import)
import * as fs from "fs";
import { createEmbeddings } from "../../lib/openai";
import { qdrant, COLLECTION, VECTOR_SIZE } from "../../lib/qdrant";

// What one entry in data/bible/chunks.json looks like.
type Chunk = {
  id: number;
  reference: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  text: string;
  embedText: string;
};

const BATCH_SIZE = 100; // how many chunks to embed and upload at a time
// const LIMIT = 100; // TEST: only index the first 100 chunks. Set to Infinity for the full run.
const LIMIT = Infinity;

async function ensureCollection() {
  const { collections } = await qdrant.getCollections();
  const exists = collections.some((c) => c.name === COLLECTION);
  if (exists) {
    console.log(`Collection "${COLLECTION}" already exists`);
    return;
  }
  await qdrant.createCollection(COLLECTION, {
    vectors: { size: VECTOR_SIZE, distance: "Cosine" },
  });
  console.log(`Created collection "${COLLECTION}"`);
}

async function main() {
  await ensureCollection();

  // Read the chunks we saved earlier.
  const all: Chunk[] = JSON.parse(fs.readFileSync("data/bible/chunks.json", "utf-8"));
  const chunks = all.slice(0, LIMIT);
  console.log(`Indexing ${chunks.length} of ${all.length} chunks`);

  // Go through the chunks one batch at a time.
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    // 1. Turn the batch's embedText into vectors (one OpenAI call per batch).
    const vectors = await createEmbeddings(batch.map((c) => c.embedText));

    // 2. Upload them to Qdrant. A "point" = id + vector + payload (the info we want back).
    await qdrant.upsert(COLLECTION, {
      wait: true, // wait until the data is stored before continuing
      points: batch.map((c, j) => ({
        id: c.id,
        vector: vectors[j], // vectors[j] belongs to batch[j]
        payload: {
          reference: c.reference,
          book: c.book,
          chapter: c.chapter,
          verseStart: c.verseStart,
          verseEnd: c.verseEnd,
          text: c.text,
        },
      })),
    });

    console.log(`Indexed ${Math.min(i + BATCH_SIZE, chunks.length)} / ${chunks.length}`);
  }

  // Ask Qdrant how many points it holds now.
  const info = await qdrant.getCollection(COLLECTION);
  console.log("Points in collection:", info.points_count);
}

main();