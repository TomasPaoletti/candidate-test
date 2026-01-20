import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import {
  OpenAIRateLimitException,
  OpenAIServiceUnavailableException,
} from './exceptions/ai.exceptions';

describe('AiService', () => {
  let service: AiService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockOpenAI = {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
    embeddings: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    mockConfigService.get.mockReturnValue('sk-test-key');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    configService = module.get<ConfigService>(ConfigService);

    (service as any).openai = mockOpenAI;
    jest.spyOn(service as any, 'timer').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('isConfigured', () => {
    it('should return false when API key is not set', () => {
      mockConfigService.get.mockReturnValue(undefined);
      expect(service.isConfigured()).toBe(false);
    });

    it('should return true when API key is set', () => {
      mockConfigService.get.mockReturnValue('sk-test-key');
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('generateResponse', () => {
    const mockOpenAIResponse = {
      choices: [
        {
          message: {
            content: 'PLACEHOLDER',
            role: 'assistant',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        total_tokens: 150,
        prompt_tokens: 100,
        completion_tokens: 50,
      },
      model: 'placeholder',
    };

    beforeEach(() => {
      mockOpenAI.chat.completions.create.mockReset();
      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);
    });

    /**
     * ✅ TEST QUE PASA - Verifica respuesta placeholder
     */
    it('should return placeholder response when OpenAI not configured', async () => {
      const result = await service.generateResponse('Hello');

      expect(result).toHaveProperty('content');
      expect(result.content).toContain('PLACEHOLDER');
      expect(result.model).toBe('placeholder');
    });

    /**
     * 📝 TODO: El candidato debe implementar estos tests
     * después de configurar la integración con OpenAI
     */
    it('should call OpenAI API with correct parameters', async () => {
      const userMessage = 'que es JavaScript?';

      await service.generateResponse(userMessage);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
          }),
          expect.objectContaining({
            role: 'user',
            content: userMessage,
          }),
        ]),
        temperature: 0.7,
        max_tokens: 2000,
      });
    });

    it('should include system prompt in messages', async () => {
      const userMessage = 'ayudame con React';

      await service.generateResponse(userMessage);

      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0];
      const systemMessage = callArgs.messages.find(
        (m: any) => m.role === 'system',
      );

      expect(systemMessage).toBeDefined();
      expect(systemMessage.content).toContain('asistente');
    });

    it('should include conversation history', async () => {
      const userMessage = 'Cuéntame más';
      const history = [
        { role: 'user' as const, content: 'que es React?' },
        { role: 'assistant' as const, content: 'React es una libreria' },
      ];

      await service.generateResponse(userMessage, history);

      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0];

      expect(callArgs.messages).toHaveLength(4);
      expect(callArgs.messages[1]).toEqual(history[0]);
      expect(callArgs.messages[2]).toEqual(history[1]);
    });

    it('should handle OpenAI API errors', async () => {
      const userMessage = 'Test error';

      mockOpenAI.chat.completions.create.mockRejectedValue({
        response: {
          status: 500,
          data: { error: { message: 'Internal server error' } },
        },
      });

      await expect(service.generateResponse(userMessage)).rejects.toThrow(
        OpenAIServiceUnavailableException,
      );

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
    });

    it('should respect rate limits', async () => {
      const userMessage = 'Test rate limit';

      mockOpenAI.chat.completions.create.mockRejectedValue({
        response: {
          status: 429,
          data: { error: { message: 'Rate limit exceeded' } },
        },
      });

      await expect(service.generateResponse(userMessage)).rejects.toThrow(
        OpenAIRateLimitException,
      );

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
    });

    it('should return token usage information', async () => {
      const userMessage = 'que es TypeScript?';

      const result = await service.generateResponse(userMessage);

      expect(result).toHaveProperty('tokensUsed');
      expect(result.tokensUsed).toBe(150);
      expect(typeof result.tokensUsed).toBe('number');
    });
  });

  describe('generateStreamResponse', () => {
    it.todo('should yield tokens one by one');
    it.todo('should handle stream interruption');
    it.todo('should complete stream successfully');
  });

  describe('buildContextualSystemPrompt', () => {
    it.todo('should include student name in prompt');
    it.todo('should include current course if provided');
    it.todo('should include progress percentage');
    it.todo('should maintain base prompt content');
  });
});
