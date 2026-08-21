export type AppErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PROVIDER_ERROR'
  | 'INTERNAL_ERROR'

const STATUS: Record<AppErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PROVIDER_ERROR: 502,
  INTERNAL_ERROR: 500,
}

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly status: number
  readonly details: unknown

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = STATUS[code]
    this.details = details
  }

  static unauthorized(message = 'ログインが必要です'): AppError {
    return new AppError('UNAUTHORIZED', message)
  }
  static forbidden(message = 'この操作の権限がありません'): AppError {
    return new AppError('FORBIDDEN', message)
  }
  static notFound(message = '対象が見つかりません'): AppError {
    return new AppError('NOT_FOUND', message)
  }
  static validation(message: string, details?: unknown): AppError {
    return new AppError('VALIDATION_ERROR', message, details)
  }
  static conflict(message: string): AppError {
    return new AppError('CONFLICT', message)
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (error instanceof Error) return new AppError('INTERNAL_ERROR', error.message)
  return new AppError('INTERNAL_ERROR', '予期しないエラーが発生しました')
}
