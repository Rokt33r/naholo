export type ModelPricing = {
  inputPerMTok: number
  outputPerMTok: number
  cacheCreation5mPerMTok: number
  cacheCreation1hPerMTok: number
  cacheReadPerMTok: number
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

function pricingFromInput(basePrice: number): ModelPricing {
  return {
    inputPerMTok: basePrice,
    outputPerMTok: basePrice * 5,
    cacheCreation5mPerMTok: basePrice * 1.25,
    cacheCreation1hPerMTok: basePrice * 2,
    cacheReadPerMTok: basePrice * 0.1,
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

export function calculateCost(
  usage: Usage,
  model: string | null,
): number | null {
  const pricing = getModelPricing(model)
  if (pricing == null) {
    return null
  }
  return (
    (usage.inputTokens * pricing.inputPerMTok +
      usage.outputTokens * pricing.outputPerMTok +
      usage.cacheCreation5mInputTokens * pricing.cacheCreation5mPerMTok +
      usage.cacheCreation1hInputTokens * pricing.cacheCreation1hPerMTok +
      usage.cacheReadInputTokens * pricing.cacheReadPerMTok) /
    1_000_000
  )
}
