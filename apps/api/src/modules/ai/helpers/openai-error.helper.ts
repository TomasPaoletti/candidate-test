import { Logger } from '@nestjs/common';
import {
  OpenAIApiException,
  OpenAIInvalidApiKeyException,
  OpenAIRateLimitException,
  OpenAIServiceUnavailableException,
} from '../exceptions/ai.exceptions';

export function handleOpenAIError(error: any, logger?: Logger): never {
  logger?.error(`Error de OpenAI: ${error.message}`, error.stack);

  if (error.getStatus) {
    throw error;
  }

  if (error.response) {
    const status = error.response.status;
    const errorData = error.response.data;

    switch (status) {
      case 401:
        throw new OpenAIInvalidApiKeyException();
      case 429:
        throw new OpenAIRateLimitException();
      case 500:
      case 502:
      case 503:
        throw new OpenAIServiceUnavailableException();
      default:
        throw new OpenAIApiException(
          status,
          errorData?.error?.message || 'Unknown error',
        );
    }
  }

  throw new OpenAIApiException(500, error.message);
}
