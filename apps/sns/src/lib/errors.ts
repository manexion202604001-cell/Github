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

/**
 * 画面へそのまま出せる日本語メッセージを持つエラー(要件90)。
 * 「何が起きたか」に加え、必要なら hint に「次に何をすべきか」を持たせる。
 */
export class AppError extends Error {
  readonly code: AppErrorCode
  readonly status: number
  readonly hint: string | null
  readonly details: unknown

  constructor(code: AppErrorCode, message: string, options: { hint?: string; details?: unknown } = {}) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = STATUS[code]
    this.hint = options.hint ?? null
    this.details = options.details
  }

  static unauthorized(message = 'ログインが必要です'): AppError {
    return new AppError('UNAUTHORIZED', message, { hint: 'ログインページからサインインしてください。' })
  }
  static forbidden(message = 'この操作を行う権限がありません'): AppError {
    return new AppError('FORBIDDEN', message, { hint: '組織の管理者に権限の変更を依頼してください。' })
  }
  static notFound(message = '対象が見つかりません'): AppError {
    return new AppError('NOT_FOUND', message, { hint: '削除された可能性があります。一覧から選び直してください。' })
  }
  static validation(message: string, details?: unknown): AppError {
    return new AppError('VALIDATION_ERROR', message, { details })
  }
  static conflict(message: string, hint?: string): AppError {
    return new AppError('CONFLICT', message, hint ? { hint } : {})
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (error instanceof Error) return new AppError('INTERNAL_ERROR', error.message)
  return new AppError('INTERNAL_ERROR', '予期しないエラーが発生しました')
}

/** Server Action の戻り値。クライアントで例外を握る必要をなくす。 */
export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; message: string; hint: string | null; code: AppErrorCode }

export function actionFailure(error: unknown): Extract<ActionResult, { ok: false }> {
  const appError = toAppError(error)
  return {
    ok: false,
    code: appError.code,
    message: appError.code === 'INTERNAL_ERROR' ? 'サーバー側で問題が発生しました。' : appError.message,
    hint: appError.hint ?? (appError.code === 'INTERNAL_ERROR' ? '時間をおいて再実行してください。' : null),
  }
}
