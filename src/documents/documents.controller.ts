import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { extractTextFromPdf } from './extract-pdf-text';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  async ingest(@Body('title') title: string, @Body('text') text: string) {
    const id = await this.documentsService.insertDocument(title);
    await this.documentsService.insertChunks(id, text);
    return { id };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
  ) {
    const text = await extractTextFromPdf(file.buffer);
    const id = await this.documentsService.insertDocument(title);
    await this.documentsService.insertChunks(id, text);

    return { id };
  }

  @Get()
  async list() {
    return this.documentsService.listDocuments();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.documentsService.getDocumentById(Number(id));
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.documentsService.deleteDocument(Number(id));
    return { success: true };
  }
}
