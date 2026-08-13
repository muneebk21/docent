// TODO: further document ingestion API endpoints to add, e.g.
//   GET  /documents        - list ingested documents
//   GET  /documents/:id    - fetch a single document + its chunk count
//   DELETE /documents/:id  - remove a document and its chunks/embeddings
import { Body, Controller, Post } from '@nestjs/common';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  async ingest(@Body('title') title: string, @Body('text') text: string) {
    const id = await this.documentsService.insertDocument(title);
    await this.documentsService.insertChunks(id, text);
    return { id };
  }
}
