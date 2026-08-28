'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { actionFailure, type ActionResult } from '@/lib/errors'
import { brandProductSchema, brandRuleSchema, brandSchema, competitorSchema, onboardingSchema } from '@/lib/validation/brand'
import { toMultiValue, toOptionalString, toStringList } from '@/lib/validation/common'
import {
  completeOnboarding,
  createBrand,
  deleteBrand,
  deleteCompetitor,
  deleteProduct,
  saveBrandRules,
  updateBrand,
  upsertCompetitor,
  upsertProduct,
} from './service'

function brandFromForm(form: FormData) {
  return {
    name: form.get('name'),
    industry: toOptionalString(form.get('industry')) ?? '',
    website: toOptionalString(form.get('website')) ?? '',
    region: toOptionalString(form.get('region')) ?? '',
    description: toOptionalString(form.get('description')) ?? '',
    targetCustomer: toOptionalString(form.get('targetCustomer')) ?? '',
    brandTone: toOptionalString(form.get('brandTone')) ?? '',
    snsChannels: toMultiValue(form, 'snsChannels'),
    snsGoals: toMultiValue(form, 'snsGoals'),
    brandKeywords: toStringList(form.get('brandKeywords')),
    additionalContext: toOptionalString(form.get('additionalContext')) ?? '',
  }
}

export async function createBrandAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let brandId: string
  try {
    brandId = await createBrand(brandSchema.parse(brandFromForm(form)))
  } catch (error) {
    return actionFailure(error)
  }
  revalidatePath('/brands')
  redirect(`/brands/${brandId}`)
}

export async function updateBrandAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const brandId = String(form.get('brandId') ?? '')
    await updateBrand(brandId, brandSchema.parse(brandFromForm(form)))
    revalidatePath(`/brands/${brandId}`)
    revalidatePath('/brands')
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function deleteBrandAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    await deleteBrand(String(form.get('brandId') ?? ''))
  } catch (error) {
    return actionFailure(error)
  }
  revalidatePath('/brands')
  redirect('/brands')
}

export async function saveProductAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const brandId = String(form.get('brandId') ?? '')
    const productId = toOptionalString(form.get('productId')) ?? null
    const parsed = brandProductSchema.parse({
      name: form.get('name'),
      description: toOptionalString(form.get('description')) ?? '',
      priceRange: toOptionalString(form.get('priceRange')) ?? '',
      strengths: toStringList(form.get('strengths')),
      weaknesses: toStringList(form.get('weaknesses')),
      differentiation: toOptionalString(form.get('differentiation')) ?? '',
      customerProblems: toStringList(form.get('customerProblems')),
      customerNeeds: toStringList(form.get('customerNeeds')),
      purchaseReasons: toStringList(form.get('purchaseReasons')),
    })
    await upsertProduct(brandId, productId, parsed)
    revalidatePath(`/brands/${brandId}`)
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function deleteProductAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const brandId = String(form.get('brandId') ?? '')
    await deleteProduct(brandId, String(form.get('productId') ?? ''))
    revalidatePath(`/brands/${brandId}`)
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function saveBrandRulesAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const brandId = String(form.get('brandId') ?? '')
    const parsed = brandRuleSchema.parse({
      prohibitedWords: toStringList(form.get('prohibitedWords')),
      preferredWords: toStringList(form.get('preferredWords')),
      tone: toOptionalString(form.get('tone')) ?? '',
      allowCompetitorNames: form.get('allowCompetitorNames') === 'on',
      avoidExpressions: toStringList(form.get('avoidExpressions')),
      legalNotes: toOptionalString(form.get('legalNotes')) ?? '',
      regulatoryNotes: toOptionalString(form.get('regulatoryNotes')) ?? '',
      internalRules: toOptionalString(form.get('internalRules')) ?? '',
      preferredCta: toOptionalString(form.get('preferredCta')) ?? '',
      visualPreferences: toOptionalString(form.get('visualPreferences')) ?? '',
    })
    await saveBrandRules(brandId, parsed)
    revalidatePath('/settings/brand')
    revalidatePath(`/brands/${brandId}`)
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function saveCompetitorAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const brandId = String(form.get('brandId') ?? '')
    const competitorId = toOptionalString(form.get('competitorId')) ?? null
    const parsed = competitorSchema.parse({
      name: form.get('name'),
      website: toOptionalString(form.get('website')) ?? '',
      instagramUrl: toOptionalString(form.get('instagramUrl')) ?? '',
      tiktokUrl: toOptionalString(form.get('tiktokUrl')) ?? '',
      youtubeUrl: toOptionalString(form.get('youtubeUrl')) ?? '',
      notes: toOptionalString(form.get('notes')) ?? '',
    })
    await upsertCompetitor(brandId, competitorId, parsed)
    revalidatePath('/competitors')
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function deleteCompetitorAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    await deleteCompetitor(String(form.get('brandId') ?? ''), String(form.get('competitorId') ?? ''))
    revalidatePath('/competitors')
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function completeOnboardingAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let brandId: string
  try {
    const parsed = onboardingSchema.parse({
      company: {
        name: form.get('companyName'),
        website: toOptionalString(form.get('companyWebsite')) ?? '',
        industry: toOptionalString(form.get('companyIndustry')) ?? '',
        region: toOptionalString(form.get('companyRegion')) ?? '',
        description: toOptionalString(form.get('companyDescription')) ?? '',
      },
      product: {
        name: toOptionalString(form.get('productName')) ?? '',
        description: toOptionalString(form.get('productDescription')) ?? '',
        priceRange: toOptionalString(form.get('productPriceRange')) ?? '',
        strengths: toStringList(form.get('productStrengths')),
        differentiation: toOptionalString(form.get('productDifferentiation')) ?? '',
        purchaseReasons: toStringList(form.get('productPurchaseReasons')),
      },
      target: {
        summary: toOptionalString(form.get('targetSummary')) ?? '',
        ageRange: toOptionalString(form.get('targetAgeRange')) ?? '',
        gender: toOptionalString(form.get('targetGender')) ?? '',
        region: toOptionalString(form.get('targetRegion')) ?? '',
        segment: toOptionalString(form.get('targetSegment')) ?? '',
        occupation: toOptionalString(form.get('targetOccupation')) ?? '',
        problems: toStringList(form.get('targetProblems')),
        needs: toStringList(form.get('targetNeeds')),
      },
      goals: toMultiValue(form, 'goals'),
      channels: toMultiValue(form, 'channels'),
    })
    brandId = await completeOnboarding(parsed)
  } catch (error) {
    return actionFailure(error)
  }
  revalidatePath('/dashboard')
  redirect(`/research/new?brandId=${brandId}`)
}
