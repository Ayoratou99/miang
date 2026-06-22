import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string;
  code?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erreur interne du serveur';
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else {
        const r = res as { message?: string | string[]; code?: string; error?: string };
        message = Array.isArray(r.message) ? r.message.join(', ') : (r.message ?? message);
        code = r.code ?? r.error;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      code = exception.code;
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'Valeur déjà utilisée';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Ressource introuvable';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = 'Requête invalide';
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
    }

    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} → ${message}`, (exception as Error)?.stack);
    }

    const body: ErrorBody = { statusCode: status, message, ...(code ? { code } : {}) };
    response.status(status).json(body);
  }
}
