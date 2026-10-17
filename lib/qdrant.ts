import { QdrantClient } from "@qdrant/js-client-rest";

// The name of our "table" in Qdrant
export const COLLECTION = "bible";

// Must match the embedding model: text-embedding-3-small makes vectors with 1536 numbers
export const VECTOR_SIZE = 1536;

// The connection. Qdrant runs in Docker on port 6333 (from docker-compose.yml).
export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL ?? "http://localhost:6333", // use the env var if set, otherwise localhost
});