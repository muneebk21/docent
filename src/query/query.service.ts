import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { getEmbedding } from 'src/documents/get-embedding';

export interface ChunkRow {
  id: number;
  content: string;
  document_id: number;
}

interface GroqChatResponse {
  choices: { message: { content: string } }[];
}

// TODO: this service will eventually own the retrieval + generation pipeline:
//   1. Embed the incoming user query (same local model used for ingestion)
//   2. Run a cosine-similarity nearest-neighbor search against stored chunks (pgvector)
//   3. Combine with Postgres full-text search (tsvector/tsquery) for hybrid retrieval
//   4. Inject top-k chunks into a prompt and call Groq's chat completion endpoint
//   5. Return the generated answer plus the source chunks used, as citations
@Injectable()
export class QueryService {
  constructor(@Inject('PG_POOL') private pool: Pool) {}

  async findRelevantChunks(question: string, limit: number = 5) {
    const questionEmbedding = await getEmbedding(question);
    const embeddingString = `[${questionEmbedding.join(',')}]`;

    const result = await this.pool.query<ChunkRow>(
      'SELECT id, content, document_id FROM chunks ORDER BY embedding <=> $1 LIMIT $2',
      [embeddingString, limit],
    );

    return result.rows;
  }

  async generateAnswer(
    question: string,
    chunks: { content: string }[],
  ): Promise<string> {
    const context = chunks.map((c) => c.content).join('\n\n');

    const prompt = `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer based only on the context above.`;

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
        }),
      },
    );

    const data = (await response.json()) as GroqChatResponse;
    return data.choices[0].message.content;
  }
}
