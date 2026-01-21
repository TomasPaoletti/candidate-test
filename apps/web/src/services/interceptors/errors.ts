export class ApiError extends Error {
  status?: number;
  code?: string;
  data?: any;

  constructor(message: string, status?: number, code?: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}
