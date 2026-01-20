import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import OpenAI from 'openai';
import {
  OpenAIApiException,
  OpenAINotConfiguredException,
} from '../ai/exceptions/ai.exceptions';
import { handleOpenAIError } from '../ai/helpers/openai-error.helper';
import { SearchResult } from './interfaces/search-result.interface';
import {
  KnowledgeChunk,
  KnowledgeChunkDocument,
} from './schemas/knowledge-chunk.schema';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  private readonly openai: OpenAI;

  constructor(
    @InjectModel(KnowledgeChunk.name)
    private knowledgeChunkModel: Model<KnowledgeChunkDocument>,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new OpenAINotConfiguredException();
    }

    this.openai = new OpenAI({ apiKey });
    this.logger.log('OpenAI client initialized successfully');
  }

  /**
   * 📝 TODO: Implementar creacion de embeddings
   *
   * El candidato debe:
   * 1. Usar OpenAI Embeddings API (text-embedding-3-small o text-embedding-3-large) ✅
   * 2. Recibir un texto y retornar el vector de embedding (array de números) ✅
   */
  async createEmbedding(text: string): Promise<number[]> {
    if (!text?.trim()) {
      throw new HttpException('Text cannot be empty', HttpStatus.BAD_REQUEST);
    }

    const response = await this.callOpenAiEmbedding(text.trim());

    if (!response.data?.length) {
      throw new OpenAIApiException(500, 'Empty embedding response');
    }

    const embedding = response.data[0].embedding;

    return embedding;
  }

  /**
   * 📝 TODO: Implementar indexacion de contenido
   *
   * El candidato debe:
   * 1. Recibir el contenido de un curso (texto extraido del PDF) ✅
   * 2. Dividir en chunks usando this.splitIntoChunks() (ya implementado) ✅
   * 3. Crear embedding para cada chunk usando this.createEmbedding() ✅
   * 4. Guardar cada chunk en MongoDB con su embedding ✅
   */
  async indexCourseContent(
    courseId: string,
    content: string,
    sourceFile: string,
  ): Promise<{ chunksCreated: number }> {
    if (!courseId || !Types.ObjectId.isValid(courseId)) {
      throw new HttpException('Invalid courseId', HttpStatus.BAD_REQUEST);
    }

    if (!content || !content.trim()) {
      throw new HttpException(
        'Content cannot be empty',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!sourceFile) {
      throw new HttpException(
        'Source file is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(
      `Starting indexing for course ${courseId}, file: ${sourceFile}`,
    );

    try {
      // Remove existing chunks from the same file to avoid duplicates
      const deleteResult = await this.knowledgeChunkModel.deleteMany({
        courseId: new Types.ObjectId(courseId),
        sourceFile,
      });

      if (deleteResult.deletedCount > 0) {
        this.logger.log(
          `Deleted ${deleteResult.deletedCount} existing chunks for re-indexing`,
        );
      }

      const chunks = this.splitIntoChunks(content, 1000);

      if (chunks.length === 0) {
        throw new HttpException(
          'No chunks created from content',
          HttpStatus.BAD_REQUEST,
        );
      }

      let successfulChunks = 0;

      for (const [index, chunkText] of chunks.entries()) {
        try {
          this.logger.debug(`Processing chunk ${index + 1}/${chunks.length}`);

          const embedding = await this.createEmbedding(chunkText);

          await this.knowledgeChunkModel.create({
            courseId: new Types.ObjectId(courseId),
            content: chunkText,
            embedding,
            sourceFile,
            chunkIndex: index,
            metadata: {
              tokenCount: Math.ceil(chunkText.length / 4), // Approximate according to openAI documentation
            },
          });

          successfulChunks++;
        } catch (error) {
          this.logger.error(
            `Failed to process chunk ${index}: ${error.message}`,
          );
          // Continue to the next chunk instead of failing completely
        }
      }

      if (successfulChunks === 0) {
        throw new HttpException(
          'Failed to index any chunks',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.log(
        `Indexing completed: ${successfulChunks}/${chunks.length} chunks created successfully`,
      );

      return { chunksCreated: successfulChunks };
    } catch (error) {
      this.logger.error(`Error indexing course content: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to index course content: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 📝 TODO: Implementar busqueda semantica EN MEMORIA
   *
   * IMPORTANTE: La búsqueda se hace en memoria, NO con MongoDB Atlas Vector Search.
   *
   * El candidato debe:
   * 1. Crear embedding de la query usando this.createEmbedding() ✅
   * 2. Cargar chunks de MongoDB (filtrar por courseId si se especifica) ✅
   * 3. Calcular similitud coseno entre query y cada chunk usando this.cosineSimilarity() ✅
   * 4. Ordenar por score descendente y retornar top K resultados ✅
   */
  async searchSimilar(
    query: string,
    options?: {
      courseId?: string;
      limit?: number;
      minScore?: number;
    },
  ): Promise<SearchResult[]> {
    if (!query || !query.trim()) {
      throw new HttpException('Query cannot be empty', HttpStatus.BAD_REQUEST);
    }

    const { courseId, limit = 5, minScore = 0.7 } = options || {};

    try {
      const queryEmbedding = await this.createEmbedding(query);

      const filter: any = {};

      if (courseId) {
        if (!Types.ObjectId.isValid(courseId)) {
          throw new HttpException('Invalid courseId', HttpStatus.BAD_REQUEST);
        }
        filter.courseId = new Types.ObjectId(courseId);
      }

      const chunks = await this.knowledgeChunkModel.find(filter).lean();

      if (chunks.length === 0) {
        this.logger.warn('No chunks found in db');
        return [];
      }

      const scored = chunks.map((chunk) => {
        const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);

        return {
          content: chunk.content,
          courseId: chunk.courseId.toString(),
          score,
          metadata: chunk.metadata,
        };
      });

      const results = scored
        .filter((result) => result.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return results;
    } catch (error) {
      this.logger.error(`Error searching similar content: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to search similar content: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Helper: Calcular similitud coseno entre dos vectores
   * Este metodo ya esta implementado para ayudar al candidato
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Helper: Dividir texto en chunks
   * El candidato puede usar este metodo o implementar su propia logica
   */
  splitIntoChunks(text: string, maxChunkSize: number = 1000): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Obtener estadisticas de la base de conocimiento
   */
  async getStats(): Promise<{
    totalChunks: number;
    coursesCovered: number;
  }> {
    const totalChunks = await this.knowledgeChunkModel.countDocuments();
    const coursesCovered = await this.knowledgeChunkModel.distinct('courseId');

    return {
      totalChunks,
      coursesCovered: coursesCovered.length,
    };
  }

  /**
   * Eliminar chunks de un curso
   */
  async deleteCourseChunks(
    courseId: string,
  ): Promise<{ deletedCount: number }> {
    const result = await this.knowledgeChunkModel.deleteMany({
      courseId: new Types.ObjectId(courseId),
    });
    return { deletedCount: result.deletedCount };
  }

  private async callOpenAiEmbedding(text: string, maxRetries = 3) {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text,
        });
      } catch (error: any) {
        lastError = error;
        const status = error.response?.status;

        if ((status === 429 || status >= 500) && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          this.logger.warn(
            `OpenAI embedding error ${status}. Retry ${attempt}/${maxRetries} in ${waitTime}ms`,
          );
          await this.timer(waitTime);
          continue;
        }

        break;
      }
    }

    handleOpenAIError(lastError, this.logger);
  }

  private timer(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
