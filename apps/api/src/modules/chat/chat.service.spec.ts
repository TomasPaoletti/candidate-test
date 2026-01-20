import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AiService } from '../ai/ai.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { ChatService } from './chat.service';
import { ChatMessage } from './schemas/chat-message.schema';
import { Conversation } from './schemas/conversation.schema';

describe('ChatService', () => {
  let service: ChatService;

  const mockChatMessageModel = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockConversationModel = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    updateMany: jest.fn(),
  };

  const mockAiService = {
    generateResponse: jest.fn(),
    generateResponseWithRAG: jest.fn(),
    generateStreamResponse: jest.fn(),
    generateStreamResponseWithRAG: jest.fn(),
  };

  const mockKnowledgeService = {
    searchSimilar: jest.fn(),
    indexContent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getModelToken(ChatMessage.name),
          useValue: mockChatMessageModel,
        },
        {
          provide: getModelToken(Conversation.name),
          useValue: mockConversationModel,
        },
        {
          provide: AiService,
          useValue: mockAiService,
        },
        {
          provide: KnowledgeService,
          useValue: mockKnowledgeService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 📝 TODO: El candidato debe implementar estos tests
   *
   * Nota: Hay un BUG intencional en el método startNewConversation
   * que el candidato debería descubrir al escribir estos tests.
   * El historial de mensajes se pasa por referencia en vez de copiarse,
   * lo que causa que el historial de conversaciones anteriores se borre.
   */
  describe('sendMessage', () => {
    const studentId = '507f1f77bcf86cd799439011';
    const conversationId = '507f1f77bcf86cd799439012';
    const message = '¿Qué es React?';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create user message and get AI response', async () => {
      const mockConversation = {
        _id: new Types.ObjectId(conversationId),
        studentId: new Types.ObjectId(studentId),
        title: 'Test conversation',
        isActive: true,
      };

      const mockUserMessage = {
        _id: 'user-msg-1',
        conversationId: mockConversation._id,
        role: 'user',
        content: message,
        createdAt: new Date(),
      };

      const mockAssistantMessage = {
        _id: 'asst-msg-1',
        conversationId: mockConversation._id,
        role: 'assistant',
        content: 'React es una biblioteca de JavaScript...',
        metadata: {
          tokensUsed: 150,
          model: 'gpt-4',
          usedRAG: false,
          relevantChunks: 0,
        },
        createdAt: new Date(),
      };

      const mockAiResponse = {
        content: 'React es una biblioteca de JavaScript...',
        tokensUsed: 150,
        model: 'gpt-4',
      };

      mockConversationModel.findById.mockResolvedValue(mockConversation);

      mockChatMessageModel.create
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce(mockAssistantMessage);

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockChatMessageModel.find.mockReturnValue(mockQuery);

      mockKnowledgeService.searchSimilar.mockResolvedValue([]);

      mockAiService.generateResponse.mockResolvedValue(mockAiResponse);

      mockConversationModel.findByIdAndUpdate.mockResolvedValue(
        mockConversation,
      );

      const result = await service.sendMessage({
        studentId,
        message,
        conversationId,
      });

      expect(mockConversationModel.findById).toHaveBeenCalledWith(
        conversationId,
      );

      expect(mockChatMessageModel.create).toHaveBeenCalledTimes(2);
      expect(mockChatMessageModel.create).toHaveBeenNthCalledWith(1, {
        conversationId: mockConversation._id,
        role: 'user',
        content: message,
      });
      expect(mockChatMessageModel.create).toHaveBeenNthCalledWith(2, {
        conversationId: mockConversation._id,
        role: 'assistant',
        content: mockAiResponse.content,
        metadata: {
          tokensUsed: 150,
          model: 'gpt-4',
          usedRAG: false,
          relevantChunks: 0,
        },
      });

      expect(mockKnowledgeService.searchSimilar).toHaveBeenCalledWith(message, {
        limit: 5,
        minScore: 0.5,
      });

      expect(mockAiService.generateResponse).toHaveBeenCalledWith(message, []);

      expect(mockConversationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockConversation._id,
        {
          lastMessageAt: expect.any(Date),
          $inc: { messageCount: 2 },
        },
      );

      expect(result).toEqual({
        conversationId: mockConversation._id,
        userMessage: mockUserMessage,
        assistantMessage: mockAssistantMessage,
      });
    });

    it('should create new conversation if none exists', async () => {
      const newConversationId = new Types.ObjectId();
      const mockNewConversation = {
        _id: newConversationId,
        studentId: new Types.ObjectId(studentId),
        title: 'Nueva conversación',
        isActive: true,
      };

      const mockUserMessage = {
        _id: 'user-msg-1',
        conversationId: newConversationId,
        role: 'user',
        content: message,
      };

      const mockAssistantMessage = {
        _id: 'asst-msg-1',
        conversationId: newConversationId,
        role: 'assistant',
        content: 'Respuesta del asistente',
        metadata: {
          tokensUsed: 100,
          model: 'gpt-4',
          usedRAG: false,
          relevantChunks: 0,
        },
      };

      const mockAiResponse = {
        content: 'Respuesta del asistente',
        tokensUsed: 100,
        model: 'gpt-4',
      };

      mockConversationModel.create.mockResolvedValue(mockNewConversation);

      mockChatMessageModel.create
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce(mockAssistantMessage);

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockChatMessageModel.find.mockReturnValue(mockQuery);

      mockKnowledgeService.searchSimilar.mockResolvedValue([]);
      mockAiService.generateResponse.mockResolvedValue(mockAiResponse);
      mockConversationModel.findByIdAndUpdate.mockResolvedValue(
        mockNewConversation,
      );

      mockConversationModel.updateMany.mockResolvedValue({ modifiedCount: 0 });

      const result = await service.sendMessage({
        studentId,
        message,
      });

      expect(mockConversationModel.create).toHaveBeenCalledWith({
        studentId: expect.any(Types.ObjectId),
        title: 'Nueva conversación',
        isActive: true,
        lastMessageAt: expect.any(Date),
      });

      expect(result.conversationId).toEqual(newConversationId);
      expect(result.userMessage).toEqual(mockUserMessage);
      expect(result.assistantMessage).toEqual(mockAssistantMessage);
    });

    it('should use existing conversation if provided', async () => {
      const existingConversationId = '507f1f77bcf86cd799439013';
      const mockExistingConversation = {
        _id: new Types.ObjectId(existingConversationId),
        studentId: new Types.ObjectId(studentId),
        title: 'Existing conversation',
        isActive: true,
      };

      const mockUserMessage = {
        _id: 'user-msg-1',
        conversationId: mockExistingConversation._id,
        role: 'user',
        content: message,
      };

      const mockAssistantMessage = {
        _id: 'asst-msg-1',
        conversationId: mockExistingConversation._id,
        role: 'assistant',
        content: 'Response',
        metadata: {
          tokensUsed: 80,
          model: 'gpt-4',
          usedRAG: false,
          relevantChunks: 0,
        },
      };

      const mockAiResponse = {
        content: 'Response',
        tokensUsed: 80,
        model: 'gpt-4',
      };

      mockConversationModel.findById.mockResolvedValue(
        mockExistingConversation,
      );

      mockChatMessageModel.create
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce(mockAssistantMessage);

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockChatMessageModel.find.mockReturnValue(mockQuery);

      mockKnowledgeService.searchSimilar.mockResolvedValue([]);
      mockAiService.generateResponse.mockResolvedValue(mockAiResponse);
      mockConversationModel.findByIdAndUpdate.mockResolvedValue(
        mockExistingConversation,
      );

      const result = await service.sendMessage({
        studentId,
        message,
        conversationId: existingConversationId,
      });

      expect(mockConversationModel.findById).toHaveBeenCalledWith(
        existingConversationId,
      );
      expect(mockConversationModel.create).not.toHaveBeenCalled();

      expect(result.conversationId).toEqual(mockExistingConversation._id);
    });

    it('should handle AI service errors gracefully', async () => {
      const mockConversation = {
        _id: new Types.ObjectId(conversationId),
        studentId: new Types.ObjectId(studentId),
        title: 'Test conversation',
        isActive: true,
      };

      const mockUserMessage = {
        _id: 'user-msg-1',
        conversationId: mockConversation._id,
        role: 'user',
        content: message,
      };

      mockConversationModel.findById.mockResolvedValue(mockConversation);
      mockChatMessageModel.create.mockResolvedValueOnce(mockUserMessage);

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockChatMessageModel.find.mockReturnValue(mockQuery);

      mockKnowledgeService.searchSimilar.mockResolvedValue([]);

      const aiError = new Error('OpenAI API rate limit exceeded');
      mockAiService.generateResponse.mockRejectedValue(aiError);

      await expect(
        service.sendMessage({
          studentId,
          message,
          conversationId,
        }),
      ).rejects.toThrow('OpenAI API rate limit exceeded');

      expect(mockChatMessageModel.create).toHaveBeenCalledTimes(1);
      expect(mockChatMessageModel.create).toHaveBeenCalledWith({
        conversationId: mockConversation._id,
        role: 'user',
        content: message,
      });

      expect(mockConversationModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should use RAG when relevant context is found', async () => {
      const mockConversation = {
        _id: new Types.ObjectId(conversationId),
        studentId: new Types.ObjectId(studentId),
        title: 'Test conversation',
        isActive: true,
      };

      const mockUserMessage = {
        _id: 'user-msg-1',
        conversationId: mockConversation._id,
        role: 'user',
        content: message,
      };

      const mockAssistantMessage = {
        _id: 'asst-msg-1',
        conversationId: mockConversation._id,
        role: 'assistant',
        content: 'React es una biblioteca... (con contexto RAG)',
        metadata: {
          tokensUsed: 200,
          model: 'gpt-4',
          usedRAG: true,
          relevantChunks: 3,
        },
      };

      const mockAiResponse = {
        content: 'React es una biblioteca... (con contexto RAG)',
        tokensUsed: 200,
        model: 'gpt-4',
      };

      const mockRAGResults = [
        { content: 'React chunk 1', score: 0.9 },
        { content: 'React chunk 2', score: 0.85 },
        { content: 'React chunk 3', score: 0.8 },
      ];

      mockConversationModel.findById.mockResolvedValue(mockConversation);
      mockChatMessageModel.create
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce(mockAssistantMessage);

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockChatMessageModel.find.mockReturnValue(mockQuery);

      mockKnowledgeService.searchSimilar.mockResolvedValue(mockRAGResults);
      mockAiService.generateResponseWithRAG.mockResolvedValue(mockAiResponse);
      mockConversationModel.findByIdAndUpdate.mockResolvedValue(
        mockConversation,
      );

      const result = await service.sendMessage({
        studentId,
        message,
        conversationId,
      });

      expect(mockKnowledgeService.searchSimilar).toHaveBeenCalledWith(message, {
        limit: 5,
        minScore: 0.5,
      });

      expect(mockAiService.generateResponseWithRAG).toHaveBeenCalledWith(
        message,
        [],
        ['React chunk 1', 'React chunk 2', 'React chunk 3'],
      );

      expect(mockAiService.generateResponse).not.toHaveBeenCalled();

      expect(result.assistantMessage.metadata).toEqual({
        tokensUsed: 200,
        model: 'gpt-4',
        usedRAG: true,
        relevantChunks: 3,
      });
    });
  });

  describe('startNewConversation', () => {
    const studentId = '507f1f77bcf86cd799439011';

    it('should create a new conversation', async () => {
      const mockConversation = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
        studentId: new Types.ObjectId(studentId),
        title: 'Nueva conversación',
        isActive: true,
        lastMessageAt: new Date(),
      };

      mockConversationModel.create.mockResolvedValue(mockConversation);
      mockConversationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });
      mockConversationModel.updateMany.mockResolvedValue({ modifiedCount: 0 });

      const result = await service.startNewConversation(studentId);

      expect(mockConversationModel.create).toHaveBeenCalledWith({
        studentId: expect.any(Types.ObjectId),
        title: 'Nueva conversación',
        isActive: true,
        lastMessageAt: expect.any(Date),
      });
      expect(result).toEqual(mockConversation);
    });

    it('should mark previous conversations as inactive', async () => {
      const newConversationId = new Types.ObjectId('507f1f77bcf86cd799439013');
      const mockConversation = {
        _id: newConversationId,
        studentId: new Types.ObjectId(studentId),
        title: 'Nueva conversación',
        isActive: true,
      };

      mockConversationModel.create.mockResolvedValue(mockConversation);
      mockConversationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });
      mockConversationModel.updateMany.mockResolvedValue({ modifiedCount: 2 });

      await service.startNewConversation(studentId);

      expect(mockConversationModel.updateMany).toHaveBeenCalledWith(
        {
          studentId: expect.any(Types.ObjectId),
          _id: { $ne: newConversationId },
        },
        { isActive: false },
      );
    });

    it('should initialize empty history for new conversation', async () => {
      const conversationId = '507f1f77bcf86cd799439014';
      const mockConversation = {
        _id: new Types.ObjectId(conversationId),
        studentId: new Types.ObjectId(studentId),
        title: 'Nueva conversación',
        isActive: true,
      };

      mockConversationModel.create.mockResolvedValue(mockConversation);
      mockConversationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });
      mockConversationModel.updateMany.mockResolvedValue({ modifiedCount: 0 });

      await service.startNewConversation(studentId);

      const history = await service['getConversationHistory'](conversationId);

      expect(history).toEqual([]);
    });

    it('should not affect history of previous conversations (BUG TEST)', async () => {
      const prevConversationId = '507f1f77bcf86cd799439020';
      const newConversationId = '507f1f77bcf86cd799439019';

      const previousConversation = {
        _id: new Types.ObjectId(prevConversationId),
        studentId: new Types.ObjectId(studentId),
        title: 'Conversación anterior',
        isActive: false,
      };

      const previousHistory = [
        { role: 'user' as const, content: 'Hola' },
        { role: 'assistant' as const, content: 'Hola, ¿cómo estás?' },
        { role: 'user' as const, content: '¿Qué es React?' },
        { role: 'assistant' as const, content: 'React es una biblioteca...' },
      ];

      service['conversationCache'].set(prevConversationId, previousHistory);

      const newConversation = {
        _id: new Types.ObjectId(newConversationId),
        studentId: new Types.ObjectId(studentId),
        title: 'Nueva conversación',
        isActive: true,
      };

      mockConversationModel.create.mockResolvedValue(newConversation);

      mockConversationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([previousConversation]),
      });

      mockConversationModel.updateMany.mockResolvedValue({ modifiedCount: 1 });

      const originalHistoryCopy = [...previousHistory];

      await service.startNewConversation(studentId);

      const previousHistoryAfter =
        service['conversationCache'].get(prevConversationId);

      expect(previousHistoryAfter).toHaveLength(4);
      expect(previousHistoryAfter).toEqual(originalHistoryCopy);
      expect(previousHistoryAfter).toEqual([
        { role: 'user', content: 'Hola' },
        { role: 'assistant', content: 'Hola, ¿cómo estás?' },
        { role: 'user', content: '¿Qué es React?' },
        { role: 'assistant', content: 'React es una biblioteca...' },
      ]);

      const newHistory = service['conversationCache'].get(newConversationId);
      expect(newHistory).toEqual([]);
    });

    it('should add initial context to history when provided', async () => {
      const conversationId = '507f1f77bcf86cd799439017';
      const initialContext = 'You are a helpful coding assistant';

      const mockConversation = {
        _id: new Types.ObjectId(conversationId),
        studentId: new Types.ObjectId(studentId),
        title: 'Nueva conversación',
        isActive: true,
      };

      mockConversationModel.create.mockResolvedValue(mockConversation);
      mockConversationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });
      mockConversationModel.updateMany.mockResolvedValue({ modifiedCount: 0 });

      await service.startNewConversation(studentId, initialContext);

      const history = service['conversationCache'].get(conversationId);

      expect(history).toHaveLength(1);
      expect(history).toEqual([
        {
          role: 'system',
          content: initialContext,
        },
      ]);
    });
  });

  describe('getHistory', () => {
    const studentId = '507f1f77bcf86cd799439011';
    const conversationId = '507f1f77bcf86cd799439019';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return paginated chat history', async () => {
      const mockMessages = [
        {
          _id: 'msg1',
          conversationId: conversationId,
          role: 'user',
          content: 'Hola',
          metadata: {},
          createdAt: new Date('2024-01-20T10:00:00Z'),
        },
        {
          _id: 'msg2',
          conversationId: conversationId,
          role: 'assistant',
          content: 'Hola, ¿cómo puedo ayudarte?',
          metadata: { tokensUsed: 50, model: 'gpt-4' },
          createdAt: new Date('2024-01-20T10:00:05Z'),
        },
        {
          _id: 'msg3',
          conversationId: conversationId,
          role: 'user',
          content: '¿Qué es React?',
          metadata: {},
          createdAt: new Date('2024-01-20T10:01:00Z'),
        },
      ];

      const mockConversation = {
        _id: conversationId,
        studentId: studentId,
        title: 'Conversación de prueba',
        isActive: true,
      };

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockMessages),
      };

      mockChatMessageModel.find.mockReturnValue(mockQuery);
      mockChatMessageModel.countDocuments.mockResolvedValue(3);
      mockConversationModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockConversation),
      });

      const result = await service.getHistory(studentId, conversationId, 1, 10);

      expect(result).toBeDefined();
      expect(result.messages).toHaveLength(3);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 3,
        totalPages: 1,
        hasMore: false,
      });
      expect(result.conversation).toEqual(mockConversation);

      expect(mockChatMessageModel.find).toHaveBeenCalledWith({
        conversationId: expect.any(Object),
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: 1 });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should filter by conversationId when provided', async () => {
      const specificConversationId = '507f1f77bcf86cd799439012';
      const mockMessages = [
        {
          _id: 'msg1',
          conversationId: specificConversationId,
          role: 'user',
          content: 'Test message',
          metadata: {},
          createdAt: new Date(),
        },
      ];

      const mockConversation = {
        _id: specificConversationId,
        studentId: studentId,
        title: 'Specific conversation',
      };

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockMessages),
      };

      mockChatMessageModel.find.mockReturnValue(mockQuery);
      mockChatMessageModel.countDocuments.mockResolvedValue(1);
      mockConversationModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockConversation),
      });

      const result = await service.getHistory(
        studentId,
        specificConversationId,
        1,
        50,
      );

      expect(mockChatMessageModel.find).toHaveBeenCalledWith({
        conversationId: expect.objectContaining({
          _bsontype: 'ObjectId',
        }),
      });
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].conversationId).toBe(specificConversationId);
      expect(result.conversation).toBeDefined();
      expect(result.conversation).toMatchObject({
        _id: specificConversationId,
        studentId: studentId,
        title: 'Specific conversation',
      });
    });

    it('should return messages in chronological order', async () => {
      const mockMessages = [
        {
          _id: 'msg1',
          conversationId: conversationId,
          role: 'user',
          content: 'Primer mensaje',
          metadata: {},
          createdAt: new Date('2024-01-20T10:00:00Z'),
        },
        {
          _id: 'msg2',
          conversationId: conversationId,
          role: 'assistant',
          content: 'Segunda respuesta',
          metadata: {},
          createdAt: new Date('2024-01-20T10:00:05Z'),
        },
        {
          _id: 'msg3',
          conversationId: conversationId,
          role: 'user',
          content: 'Tercer mensaje',
          metadata: {},
          createdAt: new Date('2024-01-20T10:01:00Z'),
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockMessages),
      };

      mockChatMessageModel.find.mockReturnValue(mockQuery);
      mockChatMessageModel.countDocuments.mockResolvedValue(3);
      mockConversationModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({}),
      });

      const result = await service.getHistory(studentId, conversationId);

      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: 1 });

      expect(result.messages).toHaveLength(3);
      expect(result.messages[0].content).toBe('Primer mensaje');
      expect(result.messages[1].content).toBe('Segunda respuesta');
      expect(result.messages[2].content).toBe('Tercer mensaje');

      const timestamps = result.messages.map((m: any) => m.createdAt.getTime());

      const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
      expect(timestamps).toEqual(sortedTimestamps);
    });
  });

  describe('deleteHistory', () => {
    it.todo('should delete all messages from conversation');
    it.todo('should clear cache for deleted conversation');
    it.todo('should throw error if conversation not found');
  });

  describe('streamResponse', () => {
    const studentId = '507f1f77bcf86cd799439011';
    const conversationId = '507f1f77bcf86cd799439012';
    const message = '¿Qué es TypeScript?';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should stream AI response tokens', (done) => {
      const mockConversation = {
        _id: new Types.ObjectId(conversationId),
        studentId: new Types.ObjectId(studentId),
        title: 'Test conversation',
        isActive: true,
      };

      const mockUserMessage = {
        _id: 'user-msg-1',
        conversationId: mockConversation._id,
        role: 'user',
        content: message,
      };

      const mockAssistantMessage = {
        _id: 'asst-msg-1',
        conversationId: mockConversation._id,
        role: 'assistant',
        content: 'TypeScript es un superset de JavaScript',
        metadata: {
          tokensUsed: 120,
          model: 'gpt-4',
          usedRAG: false,
          relevantChunks: 0,
        },
      };

      mockConversationModel.findById.mockResolvedValue(mockConversation);
      mockChatMessageModel.create
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce(mockAssistantMessage);

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockChatMessageModel.find.mockReturnValue(mockQuery);

      mockKnowledgeService.searchSimilar.mockResolvedValue([]);

      async function* mockStreamGenerator() {
        yield {
          choices: [{ delta: { content: 'Type' } }],
        };
        yield {
          choices: [{ delta: { content: 'Script' } }],
        };
        yield {
          choices: [{ delta: { content: ' es' } }],
        };
        yield {
          choices: [{ delta: { content: ' un' } }],
        };
        yield {
          choices: [{ delta: { content: ' superset' } }],
        };
        yield {
          choices: [{ delta: { content: ' de' } }],
        };
        yield {
          choices: [{ delta: { content: ' JavaScript' } }],
        };
        yield {
          choices: [{ delta: { content: '' } }],
          usage: { total_tokens: 120 },
        };
      }

      mockAiService.generateStreamResponse.mockResolvedValue(
        mockStreamGenerator(),
      );
      mockConversationModel.findByIdAndUpdate.mockResolvedValue(
        mockConversation,
      );

      const observable = service.streamResponse({
        studentId,
        message,
        conversationId,
      });

      const events: any[] = [];

      observable.subscribe({
        next: (event) => {
          events.push(JSON.parse(event.data));
        },
        complete: () => {
          try {
            expect(events[0]).toEqual({
              type: 'start',
              conversationId: conversationId,
              userMessageId: 'user-msg-1',
            });

            expect(events[1]).toEqual({ type: 'token', content: 'Type' });
            expect(events[2]).toEqual({ type: 'token', content: 'Script' });
            expect(events[3]).toEqual({ type: 'token', content: ' es' });
            expect(events[4]).toEqual({ type: 'token', content: ' un' });
            expect(events[5]).toEqual({ type: 'token', content: ' superset' });
            expect(events[6]).toEqual({ type: 'token', content: ' de' });
            expect(events[7]).toEqual({
              type: 'token',
              content: ' JavaScript',
            });

            expect(events[8]).toEqual({
              type: 'done',
              assistantMessageId: 'asst-msg-1',
              metadata: {
                tokensUsed: 120,
                model: 'gpt-4',
                usedRAG: false,
                relevantChunks: 0,
              },
            });

            expect(mockAiService.generateStreamResponse).toHaveBeenCalledWith(
              message,
              [],
            );

            expect(mockChatMessageModel.create).toHaveBeenCalledTimes(2);
            expect(mockConversationModel.findByIdAndUpdate).toHaveBeenCalled();

            done();
          } catch (error) {
            done(error);
          }
        },
        error: (error) => {
          done(error);
        },
      });
    });

    it('should handle streaming errors', (done) => {
      const mockConversation = {
        _id: new Types.ObjectId(conversationId),
        studentId: new Types.ObjectId(studentId),
        title: 'Test conversation',
        isActive: true,
      };

      const mockUserMessage = {
        _id: 'user-msg-1',
        conversationId: mockConversation._id,
        role: 'user',
        content: message,
      };

      mockConversationModel.findById.mockResolvedValue(mockConversation);
      mockChatMessageModel.create.mockResolvedValueOnce(mockUserMessage);

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockChatMessageModel.find.mockReturnValue(mockQuery);

      mockKnowledgeService.searchSimilar.mockResolvedValue([]);

      async function* mockErrorGenerator() {
        yield {
          choices: [{ delta: { content: 'Type' } }],
        };
        throw new Error('OpenAI streaming failed');
      }

      mockAiService.generateStreamResponse.mockResolvedValue(
        mockErrorGenerator(),
      );

      const observable = service.streamResponse({
        studentId,
        message,
        conversationId,
      });

      const events: any[] = [];
      let errorReceived = false;

      observable.subscribe({
        next: (event) => {
          events.push(JSON.parse(event.data));
        },
        error: (error) => {
          errorReceived = true;

          try {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe('OpenAI streaming failed');

            const errorEvent = events.find((e) => e.type === 'error');
            expect(errorEvent).toBeDefined();
            expect(errorEvent.message).toBe('OpenAI streaming failed');

            expect(mockChatMessageModel.create).toHaveBeenCalledTimes(1);

            done();
          } catch (assertError) {
            done(assertError);
          }
        },
        complete: () => {
          if (!errorReceived) {
            done(new Error('Expected error but stream completed'));
          }
        },
      });
    });

    it('should complete stream correctly', (done) => {
      const mockConversation = {
        _id: new Types.ObjectId(conversationId),
        studentId: new Types.ObjectId(studentId),
        title: 'Test conversation',
        isActive: true,
      };

      const mockUserMessage = {
        _id: 'user-msg-1',
        conversationId: mockConversation._id,
        role: 'user',
        content: message,
      };

      const mockAssistantMessage = {
        _id: 'asst-msg-1',
        conversationId: mockConversation._id,
        role: 'assistant',
        content: 'Complete response',
        metadata: {
          tokensUsed: 50,
          model: 'gpt-4',
          usedRAG: false,
          relevantChunks: 0,
        },
      };

      mockConversationModel.findById.mockResolvedValue(mockConversation);
      mockChatMessageModel.create
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce(mockAssistantMessage);

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockChatMessageModel.find.mockReturnValue(mockQuery);

      mockKnowledgeService.searchSimilar.mockResolvedValue([]);

      async function* mockStreamGenerator() {
        yield {
          choices: [{ delta: { content: 'Complete' } }],
        };
        yield {
          choices: [{ delta: { content: ' response' } }],
        };
        yield {
          choices: [{ delta: { content: '' } }],
          usage: { total_tokens: 50 },
        };
      }

      mockAiService.generateStreamResponse.mockResolvedValue(
        mockStreamGenerator(),
      );
      mockConversationModel.findByIdAndUpdate.mockResolvedValue(
        mockConversation,
      );

      const observable = service.streamResponse({
        studentId,
        message,
        conversationId,
      });

      let completed = false;

      observable.subscribe({
        next: () => {},
        complete: () => {
          completed = true;

          try {
            expect(completed).toBe(true);

            expect(mockChatMessageModel.create).toHaveBeenNthCalledWith(2, {
              conversationId: mockConversation._id,
              role: 'assistant',
              content: 'Complete response',
              metadata: {
                tokensUsed: 50,
                model: 'gpt-4',
                usedRAG: false,
                relevantChunks: 0,
              },
            });

            expect(
              mockConversationModel.findByIdAndUpdate,
            ).toHaveBeenCalledWith(mockConversation._id, {
              lastMessageAt: expect.any(Date),
              $inc: { messageCount: 2 },
            });

            done();
          } catch (error) {
            done(error);
          }
        },
        error: (error) => {
          done(error);
        },
      });
    });

    it('should use RAG when context is available', (done) => {
      const mockConversation = {
        _id: new Types.ObjectId(conversationId),
        studentId: new Types.ObjectId(studentId),
        title: 'Test conversation',
        isActive: true,
      };

      const mockUserMessage = {
        _id: 'user-msg-1',
        conversationId: mockConversation._id,
        role: 'user',
        content: message,
      };

      const mockAssistantMessage = {
        _id: 'asst-msg-1',
        conversationId: mockConversation._id,
        role: 'assistant',
        content: 'Response with RAG context',
        metadata: {
          tokensUsed: 150,
          model: 'gpt-4',
          usedRAG: true,
          relevantChunks: 2,
        },
      };

      mockConversationModel.findById.mockResolvedValue(mockConversation);
      mockChatMessageModel.create
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce(mockAssistantMessage);

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockChatMessageModel.find.mockReturnValue(mockQuery);

      const mockRAGResults = [
        { content: 'TypeScript context 1', score: 0.9 },
        { content: 'TypeScript context 2', score: 0.85 },
      ];
      mockKnowledgeService.searchSimilar.mockResolvedValue(mockRAGResults);

      async function* mockStreamGenerator() {
        yield {
          choices: [{ delta: { content: 'Response' } }],
        };
        yield {
          choices: [{ delta: { content: ' with' } }],
        };
        yield {
          choices: [{ delta: { content: ' RAG' } }],
        };
        yield {
          choices: [{ delta: { content: ' context' } }],
        };
        yield {
          choices: [{ delta: { content: '' } }],
          usage: { total_tokens: 150 },
        };
      }

      mockAiService.generateStreamResponseWithRAG.mockResolvedValue(
        mockStreamGenerator(),
      );
      mockConversationModel.findByIdAndUpdate.mockResolvedValue(
        mockConversation,
      );

      const observable = service.streamResponse({
        studentId,
        message,
        conversationId,
      });

      const events: any[] = [];

      observable.subscribe({
        next: (event) => {
          events.push(JSON.parse(event.data));
        },
        complete: () => {
          try {
            expect(mockKnowledgeService.searchSimilar).toHaveBeenCalledWith(
              message,
              { limit: 5, minScore: 0.5 },
            );

            expect(
              mockAiService.generateStreamResponseWithRAG,
            ).toHaveBeenCalledWith(
              message,
              [],
              ['TypeScript context 1', 'TypeScript context 2'],
            );

            const doneEvent = events.find((e) => e.type === 'done');
            expect(doneEvent.metadata).toEqual({
              tokensUsed: 150,
              model: 'gpt-4',
              usedRAG: true,
              relevantChunks: 2,
            });

            done();
          } catch (error) {
            done(error);
          }
        },
        error: (error) => {
          done(error);
        },
      });
    });
  });
});
