'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { actionFailure, type ActionResult } from '@/lib/errors'
import { researchInputSchema } from '@/lib/validation/research'
import { toOptionalString, toStringList } from '@/lib/validation/common'
import { createResearchRun, deleteResearchRun, findRecentSimilar, runResearch, type ResearchRunResult } from './service'

function parse(form: FormData) {
  return researchInputSchema.parse({
    brandId: form.get('brandId'),
    title: form.get('title'),
    channel: form.get('channel'),
    region: form.get('region'),
    objective: form.get('objective'),
    depth: form.get('depth'),
    keywords: toStringList(form.get('keywords')),
    competitorUrls: toStringList(form.get('competitorUrls'), 10),
    freeText: toOptionalString(form.get('freeText')) ?? '',
  })
}

/** 直近7日以内に同条件の調査がある場合に返す情報(要件69)。 */
export type CacheHit = { id: string; title: string; createdAt: string }

/**
 * 調査を作成する。
 * 直近に同条件の調査があれば作成せず、ユーザーへ選択肢(過去結果を見る / 再調査)を返す。
 * force=1 が指定された場合はそのまま作成する。
 */
export async function createResearchAction(
  _prev: ActionResult<{ cacheHit: CacheHit } | null> | null,
  form: FormData,
): Promise<ActionResult<{ cacheHit: CacheHit } | null>> {
  let researchId: string
  try {
    const input = parse(form)

    if (form.get('force') !== '1') {
      const existing = await findRecentSimilar(input)
      if (existing) {
        return {
          ok: true,
          data: {
            cacheHit: { id: existing.id, title: existing.title, createdAt: existing.createdAt.toISOString() },
          },
        }
      }
    }

    researchId = await createResearchRun(input)
  } catch (error) {
    return actionFailure(error)
  }
  revalidatePath('/research')
  redirect(`/research/${researchId}?autostart=1`)
}

export async function runResearchAction(researchId: string): Promise<ActionResult<ResearchRunResult>> {
  try {
    const result = await runResearch(researchId)
    revalidatePath(`/research/${researchId}`)
    revalidatePath('/research')
    return { ok: true, data: result }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function deleteResearchAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    await deleteResearchRun(String(form.get('researchId') ?? ''))
  } catch (error) {
    return actionFailure(error)
  }
  revalidatePath('/research')
  redirect('/research')
}
