import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IndexContentDto } from './dto/index-content.dto';
import { SearchContentDto } from './dto/search-content.dto';
import { SearchResult } from './interfaces/search-result.interface';
import { KnowledgeService } from './knowledge.service';

@ApiTags('Knowledge')
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  /**
   * 📝 TODO: Implementar endpoint para indexar contenido
   *
   * El candidato debe:
   * 1. Recibir courseId y content (texto del PDF) ✅
   * 2. Llamar al servicio para indexar ✅
   * 3. Retornar estadisticas de chunks creados ✅
   */
  @Post('index')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Indexar contenido de un curso' })
  @ApiResponse({ status: 201, description: 'Contenido indexado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  @ApiResponse({ status: 401, description: 'API key de OpenAI inválida' })
  @ApiResponse({ status: 429, description: 'Rate limit de OpenAI excedido' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  @ApiResponse({ status: 503, description: 'Servicio de OpenAI no disponible' })
  async indexContent(@Body() dto: IndexContentDto) {
    return this.knowledgeService.indexCourseContent(
      dto.courseId,
      dto.content,
      dto.sourceFile
    );
  }

  /**
   * 📝 TODO: Implementar endpoint de busqueda semantica
   *
   * El candidato debe:
   * 1. Recibir query de busqueda ✅
   * 2. Opcionalmente filtrar por courseId ✅
   * 3. Retornar resultados relevantes ✅
   */
  @Get('search')
  @ApiOperation({ summary: 'Buscar contenido similar' })
  @ApiResponse({ status: 200, description: 'Resultados de busqueda' })
  @ApiResponse({ status: 400, description: 'Query inválida' })
  @ApiResponse({ status: 401, description: 'API key de OpenAI inválida' })
  @ApiResponse({ status: 429, description: 'Rate limit de OpenAI excedido' })
  @ApiResponse({ status: 503, description: 'Servicio de OpenAI no disponible' })
  async search(@Query() dto: SearchContentDto): Promise<SearchResult[]> {
    return this.knowledgeService.searchSimilar(dto.q, {
      courseId: dto.courseId,
      limit: dto.limit,
      minScore: dto.minScore,
    });
  }

  /**
   * Obtener estadisticas de la base de conocimiento
   */
  @Get('stats')
  @ApiOperation({ summary: 'Estadisticas de la base de conocimiento' })
  async getStats() {
    return this.knowledgeService.getStats();
  }

  /**
   * Eliminar chunks de un curso
   */
  @Delete('course/:courseId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar conocimiento de un curso' })
  async deleteCourseKnowledge(@Param('courseId') courseId: string) {
    return this.knowledgeService.deleteCourseChunks(courseId);
  }
}
