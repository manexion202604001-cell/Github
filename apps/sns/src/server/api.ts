import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { ZodError, type z } from 'zod'
import { AppError, toAppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/server/rate-limit'

export function jsonOk<T>(data: T, init?: { status?: number }): NextResponse {
  return NextResponse.json({ data }, { status: init?.status ?? 200 })
}

export function jsonError(error: AppError): NextResponse {
  return NextResponse.json(
    { error: { code: error.code, message: error.message, hint: error.hint, details: error.details ?? null } },
    { status: error.status },
  )
}

type Handler<T> = (request: NextRequest, context: T) => Promise<Response> | Response

/**
 * API Route の共通ラッパ。
 * AppError → 適切なHTTPステータス / ZodError → 422 / 想定外 → 500(内部情報は漏らさない)。
 */
export function apiHandler<T>(
  handler: Handler<T>,
  options: { rateLimit?: { limit: number; windowMs: number; key?: string } } = {},
): Handler<T> {
  return async (request, context) => {
    try {
      if (options.rateLimit) {
        // 左端の X-Forwarded-For はクライアントが偽装できる。プロキシが付与する
        // x-real-ip を優先し、無ければ XFF の末尾(直近ホップ)を使う。
        const forwarded = request.headers.get('x-forwarded-for') ?? ''
        const ip = request.headers.get('x-real-ip')?.trim() || forwarded.split(',').at(-1)?.trim() || 'local'
        const key = `${options.rateLimit.key ?? new URL(request.url).pathname}:${ip}`
        if (!rateLimit(key, options.rateLimit.limit, options.rateLimit.windowMs).allowed) {
          return jsonError(
            new AppError('RATE_LIMITED', 'リクエストが多すぎます。', {
              hint: '少し時間をおいてから再実行してください。',
            }),
          )
        }
      }
      return await handler(request, context)
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonError(new AppError('VALIDATION_ERROR', '入力内容に誤りがあります', { details: error.issues.slice(0, 10) }))
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
