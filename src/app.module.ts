import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DocumentsModule } from './documents/documents.module';
import { QueryModule } from './query/query.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [DocumentsModule, QueryModule, DatabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
