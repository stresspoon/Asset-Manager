import type { TierCode, TaxPricing } from "@shared/schema";

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

interface TaxQuoteInput {
  annualRevenue: string;
  businessType: string;
  companyContact: string;
  industry: string;
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

function matchRevenueRange(annualRevenue: string, rangeStr: string): boolean {
  const rev = annualRevenue.toLowerCase().replace(/\s/g, "");
  const range = rangeStr.toLowerCase().replace(/\s/g, "");
  if (rev.includes("5천만원이하") && range.includes("5천만원이하")) return true;
  if (rev.includes("5천만원~1억") && range.includes("5천만원~1억")) return true;
  if (rev.includes("1억~3억") && range.includes("1억~3억")) return true;
  if (rev.includes("3억~5억") && range.includes("3억~5억")) return true;
  if (rev.includes("5억~10억") && range.includes("5억~10억")) return true;
  if (rev.includes("10억") && range.includes("10억이상")) return true;
  if (rev.includes("10억이하") && range.includes("5억~10억")) return true;
  if (rev.includes("10억~50억") && range.includes("10억이상")) return true;
  if (rev.includes("50억~100억") && range.includes("10억이상")) return true;
  if (rev.includes("100억이상") && range.includes("10억이상")) return true;
  return false;
}

export function calculateTaxQuote(input: TaxQuoteInput, taxPricing: TaxPricing[]): {
  recommendedTier: string;
  baseMonthlyFee: number;
  calculationBasis: string;
} {
  const matched = taxPricing.find((p) => {
    const typeMatch = p.businessType === input.businessType;
    const rangeMatch = matchRevenueRange(input.annualRevenue, p.revenueRange);
    return typeMatch && rangeMatch;
  });

  const monthlyFee = matched?.monthlyFee || 0;
  const revenueRange = matched?.revenueRange || input.annualRevenue;

  const basisParts = [
    `사업자 유형: ${input.businessType}`,
    `연매출: ${input.annualRevenue}`,
    `매칭 구간: ${revenueRange}`,
    `업종: ${input.industry}`,
    `월 기장료: ${monthlyFee > 0 ? `${monthlyFee.toLocaleString()}원` : "미정 (추후 설정)"}`,
  ];

  return {
    recommendedTier: "TAX",
    baseMonthlyFee: monthlyFee,
    calculationBasis: basisParts.join(" | "),
  };
}
