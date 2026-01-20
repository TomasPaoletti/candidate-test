import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
   * - Integración con OpenAI para obtener respuesta real
   * - Implementar streaming de la respuesta
   * - Manejo de errores de la API de OpenAI
   */
  async sendMessage(dto: SendMessageDto) {
    const { studentId, message, conversationId } = dto;

    // Obtener o crear conversación
    let conversation = conversationId
      ? await this.conversationModel.findById(conversationId)
      : await this.createConversation(studentId);

    if (!conversation) {
      conversation = await this.createConversation(studentId);
    }

    // Guardar mensaje del usuario
    const userMessage = await this.chatMessageModel.create({
      conversationId: conversation._id,
      role: 'user',
      content: message,
    });

    // Obtener historial para contexto
    const history = await this.getConversationHistory(
      conversation._id.toString(),
    );

    try {
      const searchResults = await this.knowledgeService.searchSimilar(message, {
        limit: 5,
        minScore: 0.5,
      });

      let aiResponse;

      if (searchResults.length > 0) {
        // Relevant context
        const relevantContext = searchResults.map((result) => result.content);

        this.logger.log(`Find ${searchResults.length} chunks relevants. `);

        aiResponse = await this.aiService.generateResponseWithRAG(
          message,
          history,
          relevantContext,
        );
      } else {
        this.logger.log('No relevant context found. Using normal response.');

        aiResponse = await this.aiService.generateResponse(message, history);
      }

      const assistantMessage = await this.chatMessageModel.create({
        conversationId: conversation._id,
        role: 'assistant',
        content: aiResponse.content,
        metadata: {
          tokensUsed: aiResponse.tokensUsed,
          model: aiResponse.model,
          usedRAG: searchResults.length > 0,
          relevantChunks: searchResults.length,
        },
      });

      await this.conversationModel.findByIdAndUpdate(conversation._id, {
        lastMessageAt: new Date(),
        $inc: { messageCount: 2 },
      });

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

    // Obtener conversaciones anteriores para reutilizar estructura
    const previousConversations = await this.conversationModel
      .find({ studentId: new Types.ObjectId(studentId), isActive: false })
      .sort({ createdAt: -1 })
      .limit(1);

    let history: MessageHistory[];

    if (previousConversations.length > 0) {
      const prevId = previousConversations[0]._id.toString();
      const cachedHistory = this.conversationCache.get(prevId);
      history = cachedHistory || [];
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
   * - Paginación del historial (limit/offset)
   * - Ordenar mensajes por fecha (más antiguos primero)
   * - Incluir metadata de cada mensaje
   */
  async getHistory(studentId: string, conversationId?: string) {
    // TODO: Implementar
    throw new Error(
      'Not implemented - El candidato debe implementar este método',
    );
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
   * 📝 TODO: Implementar streaming de respuestas
   *
   * El candidato debe elegir e implementar SSE o WebSocket.
   */
  async streamResponse(dto: SendMessageDto) {
    // TODO: Implementar
    throw new Error('Not implemented');
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
}
