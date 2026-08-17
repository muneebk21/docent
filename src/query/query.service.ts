import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { getEmbedding } from 'src/documents/get-embedding';

export interface ChunkRow {
  id: number;
  content: string;
  document_id: number;
}

export interface ScoredChunkRow extends ChunkRow {
  score: number;
}

interface GroqChatResponse {
  choices: { message: { content: string } }[];
}

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
  async keywordSearch(
    question: string,
    limit: number = 5,
  ): Promise<ChunkRow[]> {
    const result = await this.pool.query<ChunkRow>(
      "SELECT id,content, document_id FROM chunks WHERE content_tsv @@ plainto_tsquery('english', $1) LIMIT $2",
      [question, limit],
    );

    return result.rows;
  }

  async hybridSearch(
    question: string,
    limit: number = 5,
  ): Promise<ScoredChunkRow[]> {
    const releChunk = await this.findRelevantChunks(question, 10);
    const keySearch = await this.keywordSearch(question, 10);

    const k = 60;
    const scores = new Map<number, number>();
    const chunkData = new Map<number, ChunkRow>();

    releChunk.forEach((chunk, index) => {
      const contribution = 1 / (k + index);
      const currentScore = scores.get(chunk.id) || 0;
      scores.set(chunk.id, currentScore + contribution);
      chunkData.set(chunk.id, chunk);
    });

    keySearch.forEach((key, index) => {
      const contribution = 1 / (k + index);
      const currentScore = scores.get(key.id) || 0;
      scores.set(key.id, currentScore + contribution);
      chunkData.set(key.id, key);
    });

    const scoresArray = Array.from(scores.entries());
    scoresArray.sort((a, b) => b[1] - a[1]);

    return scoresArray.slice(0, limit).map(([id, score]) => {
      const chunk = chunkData.get(id)!;
      return { ...chunk, score };
    });
  }
}
