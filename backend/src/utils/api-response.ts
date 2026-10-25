// src/utils/api-response.ts
// [Reto 2] Response Wrapper Pattern: TODA respuesta (éxito o error) tiene la misma forma.
import type { Response } from 'express';
import type { ErrorDetail } from '../errors/app-error.js';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  errors: ErrorDetail[] | null;
  meta?: PaginationMeta;
  timestamp: string;
}

export class ResponseWrapper {
  static success<T>(res: Response, data: T, message = 'OK', statusCode = 200, meta?: PaginationMeta): Response {
    const body: ApiResponse<T> = {
      success: true,
      statusCode,
      message,
      data,
      errors: null,
      ...(meta ? { meta } : {}),
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(body);
  }

  static error(res: Response, statusCode: number, message: string, errors: ErrorDetail[] | null = null): Response {
    const body: ApiResponse<null> = {
      success: false,
      statusCode,
      message,
      data: null,
      errors,
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(body);
  }
}
