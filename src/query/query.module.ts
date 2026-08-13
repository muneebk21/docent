import { Module } from '@nestjs/common';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';

// TODO: once retrieval is implemented, this module will also import a
// PostgresModule/PgPoolProvider so QueryService can run similarity + full-text search.
@Module({
  controllers: [QueryController],
  providers: [QueryService],
  exports: [QueryService],
})
export class QueryModule {}
