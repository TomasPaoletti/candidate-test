import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  OpenAIApiException,
  OpenAINotConfiguredException,
} from './exceptions/ai.exceptions';
import { handleOpenAIError } from './helpers/openai-error.helper';

interface MessageHistory {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AiResponse {
  content: string;
  tokensUsed?: number;
  model?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  /**
   * System prompt base para el asistente de estudiantes
   * El candidato puede modificar o extender este prompt
   */
  private readonly baseSystemPrompt = `Eres un asistente educativo amigable y servicial para estudiantes de una plataforma de cursos online.

Tu objetivo es:
- Ayudar a los estudiantes con dudas sobre el contenido de sus cursos
- Motivar y dar apoyo emocional cuando sea necesario
- Sugerir recursos y técnicas de estudio
- Responder de forma clara, concisa y amigable

Reglas:
- No des respuestas a exámenes directamente, guía al estudiante para que llegue a la respuesta
- Si no sabes algo, admítelo y sugiere buscar ayuda adicional
- Mantén un tono positivo y motivador
- Usa ejemplos prácticos cuando sea posible`;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new OpenAINotConfiguredException();
    }

    this.openai = new OpenAI({ apiKey });
    this.logger.log('OpenAI client initialized successfully');
  }

  /**
   * ✅ ESTRUCTURA BASE - Genera respuesta del asistente
   *
   * Actualmente retorna una respuesta placeholder.
   * El candidato debe:
   * 1. Implementar la llamada real a OpenAI ✅
   * 2. Manejar errores de la API ✅
   * 3. Implementar retry logic si es necesario ✅
   * 4. Considerar rate limiting ✅
   */
  async generateResponse(
    userMessage: string,
    history: MessageHistory[] = [],
  ): Promise<AiResponse> {
    if (!userMessage?.trim()) {
      throw new Error('User message cannot be empty');
    }

    const MAX_HISTORY_MESSAGES = 10;
    const limitedHistory = history.slice(-MAX_HISTORY_MESSAGES);

    const messages = [
      { role: 'system' as const, content: this.baseSystemPrompt },
      ...limitedHistory,
      { role: 'user' as const, content: userMessage.trim() },
    ];

    const completion = await this.callOpenAiWithRetry(messages);

    if (!completion.choices || completion.choices.length === 0) {
      throw new OpenAIApiException(
        500,
        'No response choices returned from OpenAI',
      );
    }

    const choice = completion.choices[0];

    if (!choice.message || !choice.message.content) {
      throw new OpenAIApiException(500, 'Empty response content');
    }

    const response: AiResponse = {
      content: choice.message.content.trim(),
      tokensUsed: completion.usage?.total_tokens || 0,
      model: completion.model,
    };

    return response;
  }

  /**
   * 📝 TODO: Implementar streaming de respuestas
   *
   * El candidato debe implementar streaming real con OpenAI.
   * Consultar la documentación oficial de OpenAI para la implementación.
   */
  async *generateStreamResponse(
    userMessage: string,
    history: MessageHistory[] = [],
  ): AsyncGenerator<string> {
    // TODO: Implementar streaming real con OpenAI
    // Placeholder actual - simula streaming
    const placeholder = await this.generatePlaceholderResponse(userMessage);
    const words = placeholder.content.split(' ');

    for (const word of words) {
      yield word + ' ';
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  /**
   * 📝 TODO: Implementar manejo de contexto personalizado
   *
   * El candidato debe implementar un método que:
   * - Acepte información del estudiante (nombre, cursos, progreso)
   * - Genere un system prompt personalizado
   * - Incluya el contexto en las llamadas a OpenAI
   */
  buildContextualSystemPrompt(studentContext: {
    name: string;
    currentCourse?: string;
    progress?: number;
  }): string {
    // TODO: Implementar personalizacion del prompt
    return this.baseSystemPrompt;
  }

  /**
   * 📝 TODO: Implementar generacion de respuesta con RAG
   *
   * El candidato debe:
   * 1. Usar KnowledgeService para buscar contexto relevante ✅
   * 2. Incluir el contexto en el prompt ✅
   * 3. Llamar a OpenAI con el contexto enriquecido ✅
   */
  async generateResponseWithRAG(
    userMessage: string,
    history: MessageHistory[] = [],
    relevantContext?: string[],
  ): Promise<AiResponse> {
    if (!userMessage?.trim()) {
      throw new HttpException(
        'UserMessage cannot be empty',
        HttpStatus.BAD_REQUEST,
      );
    }

    const MAX_HISTORY_MESSAGES = 10;
    const limitedHistory = history.slice(-MAX_HISTORY_MESSAGES);

    let systemPrompt = this.baseSystemPrompt;

    if (relevantContext && relevantContext.length > 0) {
      const contextText = relevantContext
        .map((chunk, index) => `[${index + 1}] ${chunk}`)
        .join('\n\n');

      systemPrompt = `${this.baseSystemPrompt}
        
          CONTEXTO RELEVANTE DE LOS CURSOS:
          Utiliza la siguiente información de los cursos para responder la pregunta del estudiante. Si la pregunta no está relacionada con este contexto, responde de forma general pero amigable.
          
          ${contextText}
          
          Instrucciones adicionales:
            - Basa tu respuesta principalmente en el contexto proporcionado
            - Si el contexto no es suficiente, indícalo y ofrece una respuesta general
            - Cita ejemplos específicos del contexto cuando sea apropiado
            - Mantén un tono educativo y motivador`;
    }

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...limitedHistory,
      { role: 'user' as const, content: userMessage.trim() },
    ];

    const completion = await this.callOpenAiWithRetry(messages);

    if (!completion.choices || completion.choices.length === 0) {
      throw new OpenAIApiException(
        500,
        'No response choices returned from OpenAI',
      );
    }

    const choice = completion.choices[0];

    if (!choice.message || !choice.message.content) {
      throw new OpenAIApiException(500, 'Empty response content');
    }

    const response: AiResponse = {
      content: choice.message.content.trim(),
      tokensUsed: completion.usage?.total_tokens || 0,
      model: completion.model,
    };

    return response;
  }

  /**
   * Genera una respuesta placeholder para desarrollo
   */
  private generatePlaceholderResponse(userMessage: string): AiResponse {
    const responses = [
      '¡Hola! Soy tu asistente de estudios. Veo que tienes una pregunta interesante. Para ayudarte mejor, ¿podrías darme más detalles sobre el tema específico del curso en el que necesitas ayuda?',
      'Entiendo tu duda. Este es un tema importante que muchos estudiantes encuentran desafiante. Te sugiero que revisemos los conceptos paso a paso. ¿Por dónde te gustaría empezar?',
      '¡Excelente pregunta! Esto demuestra que estás pensando críticamente sobre el material. Déjame darte una explicación que te ayude a entender mejor el concepto.',
      'Gracias por compartir tu pregunta. Para darte la mejor ayuda posible, necesito que OpenAI esté configurado. Por ahora, te recomiendo revisar el material del curso y volver con preguntas específicas.',
    ];

    const randomResponse =
      responses[Math.floor(Math.random() * responses.length)];

    return {
      content: `[RESPUESTA PLACEHOLDER - Implementar OpenAI]\n\n${randomResponse}`,
      tokensUsed: 0,
      model: 'placeholder',
    };
  }

  private async callOpenAiWithRetry(
    messages: Array<MessageHistory>,
    maxRetries: number = 3,
  ) {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages,
          temperature: 0.7,
          max_tokens: 2000,
        });
      } catch (error) {
        lastError = error;

        const status = error.response?.status;

        // If rate limit
        if (status === 429 && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          this.logger.warn(`Rate limit. Try again in ${waitTime}ms`);
          await this.timer(waitTime);
          continue;
        }

        // If server error, retry
        if (status >= 500 && attempt < maxRetries) {
          const waitTime = 2000 * attempt;
          this.logger.warn(`Rate limit. Try again in ${waitTime}ms`);
          await this.timer(waitTime);
          continue;
        }

        break;
      }
    }

    handleOpenAIError(lastError, this.logger);
  }

  /**
   * Verifica si OpenAI está configurado
   */
  isConfigured(): boolean {
    return !!this.configService.get<string>('OPENAI_API_KEY');
  }

  private timer(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
