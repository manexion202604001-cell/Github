import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { ZodError, type z } from 'zod'
import { AppError, toAppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/server/rate-limit'

/**
 * API Route の共通ラッパ。
 * - AppError → 適切なHTTPステータス + { error: { code, message, details } }
 * - ZodError → 422
 * - 予期しない例外 → 500(メッセージは漏らさない)
 * - レート制限(要件109)
 */
export function jsonOk<T>(data: T, init?: { status?: number }): NextResponse {
  return NextResponse.json({ data }, { status: init?.status ?? 200 })
}

export function jsonError(error: AppError): NextResponse {
  return NextResponse.json(
    { error: { code: error.code, message: error.message, details: error.details ?? null } },
    { status: error.status },
  )
}

type Handler<T> = (request: NextRequest, context: T) => Promise<NextResponse> | NextResponse

export function apiHandler<T = { params: Promise<Record<string, string>> }>(
  handler: Handler<T>,
  options: { rateLimit?: { limit: number; windowMs: number; key?: string } } = {},
): Handler<T> {
  return async (request, context) => {
    try {
      if (options.rateLimit) {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
        const key = `${options.rateLimit.key ?? new URL(request.url).pathname}:${ip}`
        const result = rateLimit(key, options.rateLimit.limit, options.rateLimit.windowMs)
        if (!result.allowed) {
          return jsonError(new AppError('RATE_LIMITED', 'リクエストが多すぎます。しばらく待ってから再試行してください。'))
        }
      }
      return await handler(request, context)
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonError(
          new AppError('VALIDATION_ERROR', '入力内容に誤りがあります', error.issues.slice(0, 10)),
        )
      }
      const appError = toAppError(error)
      if (appError.code === 'INTERNAL_ERROR') {
        logger.error('api.unhandled', {
          path: new URL(request.url).pathname,
          error: error instanceof Error ? error.message : String(error),
        })
        return jsonError(new AppError('INTERNAL_ERROR', 'サーバーエラーが発生しました'))
      }
      return jsonError(appError)
    }
  }
}

export async function parseBody<T>(request: NextRequest, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    throw AppError.validation('リクエストボディがJSONではありません')
  }
  return schema.parse(raw)
}

export function requestMeta(request: NextRequest): { userAgent: string | null; ip: string | null } {
  return {
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  }
}
