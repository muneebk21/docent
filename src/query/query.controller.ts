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

  @Post('test-keyword')
  async testKeyword(@Body('question') question: string) {
    return this.queryService.keywordSearch(question);
  }

  @Post('test-hybrid')
  async testHybrid(@Body('question') question: string) {
    return this.queryService.hybridSearch(question);
  }

  @Post('compare')
  async compare(@Body('question') question: string) {
    const vectorOnly = await this.queryService.findRelevantChunks(question, 5);
    const keywordOnly = await this.queryService.keywordSearch(question, 5);
    const hybrid = await this.queryService.hybridSearch(question, 5);
    return { vectorOnly, keywordOnly, hybrid };
  }
}
