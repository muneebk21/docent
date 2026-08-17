# Docent

Docent is a small Retrieval-Augmented Generation (RAG) system: you ingest text
documents, they get chunked and embedded locally, and you can then ask
questions that are answered using the most relevant chunks as context.

This was built as a learning project to understand the core mechanics of RAG
from the ground up — chunking strategy, generating and storing vector
embeddings, similarity search with pgvector, and prompting an LLM with
retrieved context — rather than to ship a production product. See
[Portfolio / learning project](#portfolio--learning-project) below.

## How it works

**Ingestion (`POST /documents`)**

1. The document text is split into overlapping chunks ([chunk-text.ts](src/documents/chunk-text.ts)).
2. Each chunk is embedded locally using [@xenova/transformers](https://github.com/xenova/transformers.js) ([get-embedding.ts](src/documents/get-embedding.ts)), running the `Xenova/all-MiniLM-L6-v2` model entirely on-device — no external API calls or costs for embedding.
3. The document and its chunks (with embeddings) are stored in Postgres via [documents.service.ts](src/documents/documents.service.ts).

**Query (`POST /query`)**

1. The question is embedded with the same local model.
2. A cosine-similarity nearest-neighbor search against stored chunk embeddings (pgvector's `<=>` operator) finds the most relevant chunks ([query.service.ts](src/query/query.service.ts)).
3. The retrieved chunks are injected into a prompt sent to [Groq](https://groq.com/)'s chat completion API (Llama 3.3 70B), which generates an answer grounded in that context.
4. The answer is returned along with the source chunks used, so answers are traceable back to the ingested text.

## Architecture

- **[NestJS](https://nestjs.com/)** — application framework (controllers/services/modules)
- **PostgreSQL + [pgvector](https://github.com/pgvector/pgvector)** — stores documents, chunks, and their embeddings; powers similarity search
- **[@xenova/transformers](https://github.com/xenova/transformers.js)** — local embedding generation (`Xenova/all-MiniLM-L6-v2`, 384 dimensions), no API key or network call required
- **[Groq](https://groq.com/)** — LLM inference (OpenAI-compatible chat completions endpoint) for answer generation

```
POST /documents  ─▶ chunkText ─▶ getEmbedding ─▶ Postgres (documents, chunks + vector)
POST /query       ─▶ getEmbedding ─▶ pgvector similarity search ─▶ Groq chat completion ─▶ { answer, sources }
```

## Setup

### Prerequisites

- Node.js and npm
- Docker (for the Postgres/pgvector container)
- A [Groq API key](https://console.groq.com/keys) (free tier available)

### Steps

1. **Start Postgres (with pgvector):**

   ```bash
   docker compose up -d
   ```

2. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and fill in your `GROQ_API_KEY`. The default `DATABASE_URL`
   matches the `docker-compose.yml` defaults, so it works as-is if you didn't
   change those.

3. **Create the schema:**

   ```bash
   docker exec -i docent-postgres psql -U docent -d docent < schema.sql
   ```

4. **Install dependencies:**

   ```bash
   npm install
   ```

5. **Run the app:**

   ```bash
   npm run start:dev
   ```

   The API listens on `http://localhost:3000` by default (override with `PORT` in `.env`).

## API usage

### Ingest a document — `POST /documents`

**curl**

```bash
curl -X POST http://localhost:3000/documents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Photosynthesis Basics",
    "text": "Photosynthesis is the process by which plants convert light energy into chemical energy..."
  }'
```

**PowerShell**

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/documents `
  -ContentType "application/json" `
  -Body (@{
    title = "Photosynthesis Basics"
    text  = "Photosynthesis is the process by which plants convert light energy into chemical energy..."
  } | ConvertTo-Json)
```

**Response**

```json
{ "id": 1 }
```

### Ask a question — `POST /query`

**curl**

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{ "question": "How do plants convert light into energy?" }'
```

**PowerShell**

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/query `
  -ContentType "application/json" `
  -Body (@{ question = "How do plants convert light into energy?" } | ConvertTo-Json)
```

**Response**

```json
{
  "answer": "Plants convert light into energy through photosynthesis...",
  "sources": [
    { "id": 1, "content": "Photosynthesis is the process by which...", "document_id": 1 }
  ]
}
```

## Hybrid Search

Docent also supports **hybrid search**, which combines Postgres full-text
search (keyword/BM25-style matching) with the existing pgvector semantic
search, merging the two result sets with **Reciprocal Rank Fusion (RRF)**.

### Why

Pure vector search can under-rank exact terms, codes, or acronyms that don't
have strong semantic neighbors in the embedding space — a query for a
specific product code or proper noun may not surface the chunk that contains
it verbatim. Pure keyword search has the opposite problem: it fails
completely on paraphrased or semantically-related queries that share no
literal words with the source text. Combining both makes retrieval more
robust to both failure modes than either search on its own.

### Example

Query: `"cloud file storage for 3D models"`, against a chunk whose text
mentions `"Amazon S3"` and `"3D Product Configurator"`.

- **Keyword search** returns zero results — there's no literal word overlap
  between the query and the source text.
- **Vector search** correctly finds the relevant chunk via semantic
  similarity, even though no words match.
- **Hybrid search** gracefully falls back to the vector ranking when keyword
  search contributes nothing, demonstrating graceful degradation rather than
  outright failure.

### Endpoints

- `POST /query/test-keyword` — keyword-only search (Postgres full-text search)
- `POST /query/test-hybrid` — hybrid search (RRF-merged vector + keyword)
- `POST /query/compare` — runs vector-only, keyword-only, and hybrid search
  on the same question and returns all three side by side, for comparison

**curl**

```bash
curl -X POST http://localhost:3000/query/compare \
  -H "Content-Type: application/json" \
  -d '{ "question": "cloud file storage for 3D models" }'
```

**PowerShell**

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/query/compare `
  -ContentType "application/json" `
  -Body (@{ question = "cloud file storage for 3D models" } | ConvertTo-Json)
```

**Response**

```json
{
  "vectorOnly": [ { "id": 1, "content": "...", "document_id": 1 } ],
  "keywordOnly": [],
  "hybrid": [ { "id": 1, "content": "...", "document_id": 1, "score": 0.0161 } ]
}
```

### Implementation

- The `chunks` table has a `content_tsv` generated column
  (`GENERATED ALWAYS AS (to_tsvector('english', content)) STORED`), indexed
  with a GIN index, alongside the existing `embedding` pgvector column.
- RRF is implemented in application code
  ([query.service.ts](src/query/query.service.ts)) rather than as a single
  SQL query: the vector search and keyword search each run as separate
  queries, and their ranked results are merged by reciprocal rank
  (`1 / (k + rank)`, with `k = 60`) rather than by raw score, since cosine
  distance and text-search rank aren't on comparable scales.

## Portfolio / learning project

This repo exists primarily so I could understand how the pieces of a RAG
pipeline fit together end to end — chunking, local embeddings, vector
similarity search, and LLM generation. It is **not** production-hardened:
there's no auth, input validation is minimal, error handling is basic, and
the ingestion/query flow is intentionally simple rather than optimized for
scale or robustness. Treat it as a working reference implementation, not a
deployable service.
