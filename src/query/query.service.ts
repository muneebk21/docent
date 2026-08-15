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
