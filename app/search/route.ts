import { NextResponse } from "next/server";
import { z } from "zod";
import { createEmbedding } from "../../lib/openai";
import { qdrant, COLLECTION } from "../../lib/qdrant";

// What the request body must look like: {"query": "...", "k": 5}
// k is optional (defaults to 5) and must be a whole number from 1 to 50.
const BodySchema = z.object({
  query: z.string().trim().min(1),
  k: z.number().int().min(1).max(50).default(5),
});

export async function POST(request: Request) {
  // 1. Read the JSON body. If it isn't valid JSON, answer 400 (bad request).
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  // 2. Check it against the schema.
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body. Expected {\"query\": string, \"k\"?: number}" },
      { status: 400 },
    );
  }
  const { query, k } = parsed.data;

  try {
    // 3. Turn the query into a vector (same model as the chunks).
    const vector = await createEmbedding(query);

    // 4. Ask Qdrant for the k closest chunks.
    const response = await qdrant.query(COLLECTION, {
      query: vector,
      limit: k,
      with_payload: true,
    });

    // 5. Return only what the assignment asks for: reference, text, score.
    const results = response.points.map((point) => {
      const p = point.payload as { reference: string; text: string };
      return { reference: p.reference, text: p.text, score: point.score };
    });
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}