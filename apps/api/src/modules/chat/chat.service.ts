import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Observable } from 'rxjs';
import { AiService } from '../ai/ai.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { SendMessageDto } from './dto/send-message.dto';
import {
  ChatMessage,
  ChatMessageDocument,
} from './schemas/chat-message.schema';
import {
  Conversation,
  ConversationDocument,
} from './schemas/conversation.schema';

interface MessageHistory {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  // Cache de historial de conversaciones en memoria para optimizar
  private conversationCache: Map<string, MessageHistory[]> = new Map();

  constructor(
    @InjectModel(ChatMessage.name)
    private chatMessageModel: Model<ChatMessageDocument>,
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    private readonly aiService: AiService,
    private readonly knowledgeService: KnowledgeService,
  ) {}

  /**
   * ✅ PARCIALMENTE IMPLEMENTADO - Enviar mensaje y obtener respuesta
   *
   * El candidato debe completar:
   * - Integración con OpenAI para obtener respuesta real ✅
   * - Implementar streaming de la respuesta ✅
   * - Manejo de errores de la API de OpenAI ✅
   */
  async sendMessage(dto: SendMessageDto) {
    const { studentId, message, conversationId } = dto;

    try {
      const conversation = await this.getOrCreateConversation(
        studentId,
        conversationId,
      );

      const userMessage = await this.chatMessageModel.create({
        conversationId: conversation._id,
        role: 'user',
        content: message,
      });

      const history = await this.getConversationHistory(
        conversation._id.toString(),
      );

      const ragContext = await this.getRAGContext(message);

      const aiResponse = ragContext.hasContext
        ? await this.aiService.generateResponseWithRAG(
            message,
            history,
            ragContext.context,
          )
        : await this.aiService.generateResponse(message, history);

      const assistantMessage = await this.chatMessageModel.create({
        conversationId: conversation._id,
        role: 'assistant',
        content: aiResponse.content,
        metadata: {
          tokensUsed: aiResponse.tokensUsed,
          model: aiResponse.model,
          usedRAG: ragContext.hasContext,
          relevantChunks: ragContext.resultsCount,
        },
      });

      await this.updateConversationAndCache(
        conversation._id,
        message,
        aiResponse.content,
      );

      return {
        conversationId: conversation._id,
        userMessage,
        assistantMessage,
      };
    } catch (error) {
      this.logger.error(`Error en sendMessage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Inicia una nueva conversación para el estudiante
   */
  async startNewConversation(studentId: string, initialContext?: string) {
    const conversation = await this.createConversation(studentId);
    const conversationIdStr = conversation._id.toString();

    const previousConversations = await this.conversationModel
      .find({ studentId: new Types.ObjectId(studentId), isActive: false })
      .sort({ createdAt: -1 })
      .limit(1);

    let history: MessageHistory[];

    if (previousConversations.length > 0) {
      const prevId = previousConversations[0]._id.toString();
      const cachedHistory = this.conversationCache.get(prevId);
      history = cachedHistory ? [...cachedHistory] : [];
      // history = cachedHistory || []; BUG ENCONTRADO
      history.length = 0;
    } else {
      history = [];
    }

    if (initialContext) {
      history.push({
        role: 'system',
        content: initialContext,
      });
    }

    this.conversationCache.set(conversationIdStr, history);

    // Marcar conversaciones anteriores como inactivas
    await this.conversationModel.updateMany(
      {
        studentId: new Types.ObjectId(studentId),
        _id: { $ne: conversation._id },
      },
      { isActive: false },
    );

    this.logger.log(`Nueva conversación iniciada: ${conversationIdStr}`);

    return conversation;
  }

  /**
   * 📝 TODO: Implementar obtención del historial de chat
   *
   * El candidato debe implementar:
   * - Paginación del historial (limit/offset) ✅
   * - Ordenar mensajes por fecha (más antiguos primero) ✅
   * - Incluir metadata de cada mensaje ✅
   */
  async getHistory(
    studentId: string,
    conversationId?: string,
    page: number = 1,
    limit: number = 50,
  ) {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new NotFoundException('Student not found');
    }

    const filter: any = {};

    if (conversationId) {
      if (!Types.ObjectId.isValid(conversationId)) {
        throw new NotFoundException('Conversation not found');
      }
      filter.conversationId = new Types.ObjectId(conversationId);
    } else {
      const conversations = await this.conversationModel
        .find({ studentId: new Types.ObjectId(studentId) })
        .select('_id')
        .lean();

      const conversationIds = conversations.map((c) => c._id);
      filter.conversationId = { $in: conversationIds };
    }

    const skip = (page - 1) * limit;

    const [messages, totalCount] = await Promise.all([
      this.chatMessageModel
        .find(filter)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('conversationId', 'title studentId')
        .lean() as any,
      this.chatMessageModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    let conversation: Conversation | null = null;
    if (conversationId) {
      conversation = await this.conversationModel
        .findById(conversationId)
        .lean();
    }

    return {
      messages: messages.map((msg) => ({
        _id: msg._id,
        conversationId: msg.conversationId,
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata,
        createdAt: msg.createdAt,
      })),
      conversation,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore,
      },
    };
  }

  /**
   * 📝 TODO: Implementar eliminación del historial
   *
   * El candidato debe implementar:
   * - Eliminar todos los mensajes de una conversación
   * - Opcionalmente eliminar la conversación completa
   * - Limpiar el cache en memoria
   */
  async deleteHistory(studentId: string, conversationId: string) {
    // TODO: Implementar
    throw new Error(
      'Not implemented - El candidato debe implementar este método',
    );
  }

  /**
   * 📝 TODO: Implementar streaming de respuestas ✅
   *
   * El candidato debe elegir e implementar SSE o WebSocket.
   */
  streamResponse(dto: SendMessageDto): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const { studentId, message, conversationId } = dto;

          const conversation = await this.getOrCreateConversation(
            studentId,
            conversationId,
          );

          const userMessage = await this.chatMessageModel.create({
            conversationId: conversation._id,
            role: 'user',
            content: message,
          });

          subscriber.next({
            data: JSON.stringify({
              type: 'start',
              conversationId: conversation._id.toString(),
              userMessageId: userMessage._id.toString(),
            }),
          } as MessageEvent);

          const history = await this.getConversationHistory(
            conversation._id.toString(),
          );

          const ragContext = await this.getRAGContext(message);

          const streamGenerator = ragContext.hasContext
            ? await this.aiService.generateStreamResponseWithRAG(
                message,
                history,
                ragContext.context,
              )
            : await this.aiService.generateStreamResponse(message, history);

          let fullContent = '';
          let tokensUsed = 0;

          for await (const chunk of streamGenerator) {
            const token = chunk.choices[0]?.delta?.content || '';

            if (token) {
              fullContent += token;

              subscriber.next({
                data: JSON.stringify({
                  type: 'token',
                  content: token,
                }),
              } as MessageEvent);
            }

            if (chunk.usage) {
              tokensUsed = chunk.usage.total_tokens;
            }
          }

          const assistantMessage = await this.chatMessageModel.create({
            conversationId: conversation._id,
            role: 'assistant',
            content: fullContent,
            metadata: {
              tokensUsed,
              model: 'gpt-4',
              usedRAG: ragContext.hasContext,
              relevantChunks: ragContext.resultsCount,
            },
          });

          await this.updateConversationAndCache(
            conversation._id,
            message,
            fullContent,
          );

          subscriber.next({
            data: JSON.stringify({
              type: 'done',
              assistantMessageId: assistantMessage._id.toString(),
              metadata: {
                tokensUsed,
                model: 'gpt-4',
                usedRAG: ragContext.hasContext,
                relevantChunks: ragContext.resultsCount,
              },
            }),
          } as MessageEvent);

          subscriber.complete();
        } catch (error) {
          this.logger.error('Error en streaming:', error);

          subscriber.next({
            data: JSON.stringify({
              type: 'error',
              message: error.message || 'Error to create resposne',
            }),
          } as MessageEvent);

          subscriber.error(error);
        }
      })();
    });
  }

  /**
   * Helper para crear una nueva conversación
   */
  private async createConversation(studentId: string) {
    return this.conversationModel.create({
      studentId: new Types.ObjectId(studentId),
      title: 'Nueva conversación',
      isActive: true,
      lastMessageAt: new Date(),
    });
  }

  /**
   * Helper para obtener historial de conversación (para contexto de IA)
   */
  private async getConversationHistory(
    conversationId: string,
  ): Promise<MessageHistory[]> {
    // Primero verificar cache
    if (this.conversationCache.has(conversationId)) {
      return this.conversationCache.get(conversationId)!;
    }

    // Si no está en cache, obtener de la base de datos
    const messages = await this.chatMessageModel
      .find({ conversationId: new Types.ObjectId(conversationId) })
      .sort({ createdAt: 1 })
      .limit(20) // Últimos 20 mensajes para contexto
      .lean();

    const history: MessageHistory[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Guardar en cache
    this.conversationCache.set(conversationId, history);

    return history;
  }

  /**
   * Helper obtener o crear conversación
   */
  private async getOrCreateConversation(
    studentId: string,
    conversationId?: string,
  ): Promise<ConversationDocument> {
    if (conversationId) {
      const conversation =
        await this.conversationModel.findById(conversationId);
      if (conversation) {
        return conversation;
      }
    }
    return this.createConversation(studentId);
  }

  /**
   * Helper buscar contexto RAG
   */
  private async getRAGContext(message: string): Promise<{
    hasContext: boolean;
    context: string[];
    resultsCount: number;
  }> {
    const searchResults = await this.knowledgeService.searchSimilar(message, {
      limit: 5,
      minScore: 0.5,
    });

    if (searchResults.length > 0) {
      this.logger.log(`Found ${searchResults.length} relevant chunks.`);
      return {
        hasContext: true,
        context: searchResults.map((r) => r.content),
        resultsCount: searchResults.length,
      };
    } else {
      this.logger.log('No relevant context found. Using normal response.');
      return {
        hasContext: false,
        context: [],
        resultsCount: 0,
      };
    }
  }

  /**
   * Helper actualizar conversación y cache
   */
  private async updateConversationAndCache(
    conversationId: Types.ObjectId,
    userMessage: string,
    assistantMessage: string,
  ): Promise<void> {
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      lastMessageAt: new Date(),
      $inc: { messageCount: 2 },
    });

    const currentHistory =
      this.conversationCache.get(conversationId.toString()) || [];
    const updatedHistory = [
      ...currentHistory,
      { role: 'user' as const, content: userMessage },
      { role: 'assistant' as const, content: assistantMessage },
    ];
    this.conversationCache.set(conversationId.toString(), updatedHistory);
  }
}
