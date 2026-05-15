export type ModelPricing = {
  baseTokenPricePerMTok: number
  inputTokenWeight: number
  outputTokenWeight: number
  cacheCreation5mTokenWeight: number
  cacheCreation1hTokenWeight: number
  cacheReadTokenWeight: number
}

export type Usage = {
  inputTokens: number
  outputTokens: number
  cacheCreation5mInputTokens: number
  cacheCreation1hInputTokens: number
  cacheReadInputTokens: number
}

export type PricingTable = {
  recordedDate: string
  modelPricingMap: Record<string, ModelPricing>
}

export const BASE_TOKEN_WEIGHTS = {
  inputTokenWeight: 1,
  cacheCreation5mTokenWeight: 1.25,
  cacheCreation1hTokenWeight: 2,
  cacheReadTokenWeight: 0.1,
  outputTokenWeight: 5,
} as const

function pricingFromInput(basePrice: number): ModelPricing {
  return {
    baseTokenPricePerMTok: basePrice,
    ...BASE_TOKEN_WEIGHTS,
  }
}

export const PRICING: PricingTable = {
  recordedDate: '2026-05-14',
  modelPricingMap: {
    'claude-opus-4-7': pricingFromInput(5),
    'claude-opus-4-6': pricingFromInput(5),
    'claude-opus-4-5': pricingFromInput(5),
    'claude-sonnet-4-6': pricingFromInput(3),
    'claude-sonnet-4-5': pricingFromInput(3),
    'claude-haiku-4-5': pricingFromInput(1),
  },
}

export function getModelPricing(model: string | null): ModelPricing | null {
  if (model == null) {
    return null
  }
  return PRICING.modelPricingMap[model] ?? null
}

export function calculateWeightedTokens(
  usage: Usage,
  model: string | null,
): number {
  const pricing = getModelPricing(model)
  const weights: {
    inputTokenWeight: number
    outputTokenWeight: number
    cacheCreation5mTokenWeight: number
    cacheCreation1hTokenWeight: number
    cacheReadTokenWeight: number
  } = pricing ?? BASE_TOKEN_WEIGHTS
  return (
    usage.inputTokens * weights.inputTokenWeight +
    usage.cacheCreation5mInputTokens * weights.cacheCreation5mTokenWeight +
    usage.cacheCreation1hInputTokens * weights.cacheCreation1hTokenWeight +
    usage.cacheReadInputTokens * weights.cacheReadTokenWeight +
    usage.outputTokens * weights.outputTokenWeight
  )
}

export function calculateCost(
  usage: Usage,
  model: string | null,
): number | null {
  const pricing = getModelPricing(model)
  if (pricing == null) {
    return null
  }
  return (
    (calculateWeightedTokens(usage, model) * pricing.baseTokenPricePerMTok) /
    1_000_000
  )
}
