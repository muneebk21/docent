import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

// TODO: once ingestion is implemented, this module will also import a
// PostgresModule/PgPoolProvider so DocumentsService can persist chunks + embeddings.
@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
