import { Body, Controller, Post } from '@nestjs/common';
import { QueryService } from './query.service';

@Controller('query')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Post()
  async ask(@Body('question') question: string) {
    const chunks = await this.queryService.findRelevantChunks(question);
    const answer = await this.queryService.generateAnswer(question, chunks);
    return { answer, sources: chunks };
  }
}
