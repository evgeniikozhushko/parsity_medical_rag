## Bible search (chunking homework)

Semantic search over the King James Bible: parse → chunk → embed → store in Qdrant → `POST /search`.

### Run it

```bash
docker compose up -d      # start Qdrant (http://localhost:6333/dashboard)
npm run bible:fetch       # download the KJV text
npm run bible:chunk       # parse verses and chunk them -> data/bible/chunks.json
npm run bible:index       # embed the chunks and load them into Qdrant
npm run dev               # start the app
```

### Try it

```bash
curl -X POST http://localhost:3000/search \
  -H "Content-Type: application/json" \
  -d '{"query":"love is patient","k":5}'
```

Response:

```json
{
  "results": [
    { "reference": "1 John 4:17-21", "text": "Herein is our love made perfect, ...", "score": 0.402 }
  ]
}
```

### Chunking strategy

Chapter-bounded sliding window of 5 verses, moving forward 4 at a time, so each chunk
overlaps the previous one by one verse (7,924 chunks, about 635 characters on average).
A single verse is often too short to carry meaning, and a whole chapter (up to 176 verses)
dilutes the embedding; five verses is roughly one complete thought. The one-verse overlap
means an idea that crosses a chunk boundary still appears whole in at least one chunk.
Chunks never cross a chapter boundary, and each carries a reference like `Genesis 1:1-5`.