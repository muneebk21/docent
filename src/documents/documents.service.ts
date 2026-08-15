import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { chunkText } from './chunk-text';
import { getEmbedding } from './get-embedding';

@Injectable()
export class DocumentsService {
  constructor(@Inject('PG_POOL') private pool: Pool) {}

  async insertDocument(title: string): Promise<number> {
    const result = await this.pool.query<{ id: number }>(
      'INSERT INTO documents (title) VALUES ($1) RETURNING id;',
      [title],
    );

    const newId = result.rows[0].id;
    return newId;
  }

  async insertChunks(documentId: number, text: string): Promise<void> {
    const chunks = chunkText(text, 500, 100);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await getEmbedding(chunk);
      const embeddingString = `[${embedding.join(',')}]`;

      await this.pool.query(
        'INSERT INTO chunks (document_id, chunk_index, content, embedding) VALUES ($1, $2, $3, $4)',
        [documentId, i, chunk, embeddingString],
      );
    }
  }

  async listDocuments() {
    const result = await this.pool.query(
      'SELECT id, title, uploaded_at FROM documents  ORDER BY uploaded_at DESC',
    );

    return result.rows;
  }

  async getDocumentById(id: number) {
    const docResult = await this.pool.query(
      'SELECT id, title, uploaded_at FROM documents WHERE id = $1',
      [id],
    );

    const chunkCountResult = await this.pool.query(
      'SELECT COUNT(*) FROM chunks WHERE document_id = $1',
      [id],
    );
    const doc = docResult.rows[0];

    return {
      id: doc.id,
      title: doc.title,
      uploaded_at: doc.uploaded_at,
      chunkCount: parseInt(chunkCountResult.rows[0].count),
    };
  }

  async deleteDocument(id: number): Promise<void> {
    await this.pool.query('DELETE FROM documents WHERE id = $1', [id]);
  }
}
