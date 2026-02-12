import type { TierCode } from "@shared/schema";

interface QuoteInput {
  annualRevenue: string;
  monthlyVolume: string;
  taxInvoiceCount: string;
  companyContact: string;
  industry: string;
  cardCount: number;
  cardUsageCount: string;
  platformSettlement: string[];
}

const TIER_FEES: Record<TierCode, number> = {
  LITE: 400000,
  BASIC: 800000,
  PREMIUM: 1000000,
  LUXURY: 2000000,
};

function getTierFromRevenue(revenue: string): TierCode {
  if (revenue.includes("100억 이상")) return "LUXURY";
  if (revenue.includes("50억~100억")) return "PREMIUM";
  if (revenue.includes("10억~50억")) return "BASIC";
  return "LITE";
}

function getTierFromVolume(volume: string): TierCode {
  if (volume.includes("401건 이상")) return "LUXURY";
  if (volume.includes("151~400건")) return "PREMIUM";
  if (volume.includes("51~150건")) return "BASIC";
  return "LITE";
}

function getTierFromTaxInvoice(invoiceCount: string): TierCode {
  if (invoiceCount.includes("61건 이상")) return "LUXURY";
  if (invoiceCount.includes("21~60건")) return "PREMIUM";
  if (invoiceCount.includes("6~20건")) return "BASIC";
  return "LITE";
}

const TIER_ORDER: Record<TierCode, number> = {
  LITE: 0,
  BASIC: 1,
  PREMIUM: 2,
  LUXURY: 3,
};

function maxTier(...tiers: TierCode[]): TierCode {
  return tiers.reduce((max, t) => (TIER_ORDER[t] > TIER_ORDER[max] ? t : max), "LITE");
}

export function calculateQuote(input: QuoteInput): {
  recommendedTier: TierCode;
  baseMonthlyFee: number;
  calculationBasis: string;
} {
  const revenueTier = getTierFromRevenue(input.annualRevenue);
  const volumeTier = getTierFromVolume(input.monthlyVolume);
  const taxTier = getTierFromTaxInvoice(input.taxInvoiceCount);

  const recommendedTier = maxTier(revenueTier, volumeTier, taxTier);
  const baseMonthlyFee = TIER_FEES[recommendedTier];

  const basisParts = [
    `연매출: ${input.annualRevenue} (${revenueTier} 등급)`,
    `월거래량: ${input.monthlyVolume} (${volumeTier} 등급)`,
    `세금계산서: ${input.taxInvoiceCount} (${taxTier} 등급)`,
    `업종: ${input.industry}`,
    `카드 ${input.cardCount}개, 사용건수 ${input.cardUsageCount}`,
  ];

  if (input.platformSettlement.length > 0 && !input.platformSettlement.includes("없음")) {
    basisParts.push(`플랫폼 정산: ${input.platformSettlement.join(", ")}`);
  }

  basisParts.push(`최종 추천 등급: ${recommendedTier} (가장 높은 등급 기준)`);

  return {
    recommendedTier,
    baseMonthlyFee,
    calculationBasis: basisParts.join(" | "),
  };
}
