/**
 * 例外に頼らないエラー表現。Provider層とService層の境界で使う。
 */
export type Ok<T> = { ok: true; data: T }
export type Err<E> = { ok: false; error: E }
export type Result<T, E> = Ok<T> | Err<E>

export function ok<T>(data: T): Ok<T> {
  return { ok: true, data }
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error }
}
