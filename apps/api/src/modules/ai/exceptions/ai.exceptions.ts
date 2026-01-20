import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception when OpenAI not config
 */
export class OpenAINotConfiguredException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'OpenAI API is not configured. Please check your API key.',
        error: 'OpenAI Not Configured',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

/**
 * Exception when exceed rate limit
 */
export class OpenAIRateLimitException extends HttpException {
  constructor(retryAfter?: number) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: retryAfter
          ? `Rate limit exceeded. Please try again in ${retryAfter} seconds.`
          : 'Rate limit exceeded. Please try again in a few moments.',
        error: 'Rate Limit Exceeded',
        retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/**
 * Exception when OpenAI service is unavailable
 */
export class OpenAIServiceUnavailableException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message:
          'OpenAI service is temporarily unavailable. Please try again later.',
        error: 'Service Unavailable',
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

/**
 * Exception when API Key is invalid
 */
export class OpenAIInvalidApiKeyException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid OpenAI API key. Please check your configuration.',
        error: 'Invalid API Key',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * Exception generic for errors OpenAI
 */
export class OpenAIApiException extends HttpException {
  constructor(statusCode: number, message: string) {
    super(
      {
        statusCode,
        message: `OpenAI API error: ${message}`,
        error: 'OpenAI API Error',
      },
      statusCode,
    );
  }
}
