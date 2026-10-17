import "dotenv/config"; // first!
import { createEmbedding } from "../../lib/openai";
import { qdrant, COLLECTION } from "../../lib/qdrant";

async function main() {
  const query = process.argv[2] ?? "love is patient"; // take the query from the command line, or use a default
  const k = 5; // how many results we want

  // 1. Turn the query into a vector, using the SAME model as the chunks.
  const vector = await createEmbedding(query);

  // 2. Ask Qdrant for the k closest points.
  const response = await qdrant.query(COLLECTION, {
    query: vector,
    limit: k,
    with_payload: true, // also return the stored info (reference, text...)
  });

  // 3. Print them.
  for (const point of response.points) {
    const p = point.payload as { reference: string; text: string };
    console.log(`${point.score.toFixed(3)}  ${p.reference}`);
    console.log(`   ${p.text.slice(0, 120)}...`);
  }
}

main();