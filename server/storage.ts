import { quotes, servicePricing, taxPricing, type Quote, type InsertQuote, type ServicePricing, type InsertServicePricing, type TaxPricing, type InsertTaxPricing } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getQuotes(): Promise<Quote[]>;
  getQuoteById(id: number): Promise<Quote | undefined>;
  getQuoteByRequestId(notionRequestId: string): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: number, data: Partial<InsertQuote>): Promise<Quote | undefined>;
  deleteQuote(id: number): Promise<boolean>;
  getServicePricing(): Promise<ServicePricing[]>;
  getServicePricingByTier(tierCode: string): Promise<ServicePricing | undefined>;
  seedPricing(): Promise<void>;
  getTaxPricing(): Promise<TaxPricing[]>;
  seedTaxPricing(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getQuotes(): Promise<Quote[]> {
    return db.select().from(quotes);
  }

  async getQuoteById(id: number): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote || undefined;
  }

  async getQuoteByRequestId(notionRequestId: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.notionRequestId, notionRequestId));
    return quote || undefined;
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [created] = await db.insert(quotes).values(quote).returning();
    return created;
  }

  async updateQuote(id: number, data: Partial<InsertQuote>): Promise<Quote | undefined> {
    const [updated] = await db.update(quotes).set(data).where(eq(quotes.id, id)).returning();
    return updated || undefined;
  }

  async deleteQuote(id: number): Promise<boolean> {
    const result = await db.delete(quotes).where(eq(quotes.id, id)).returning();
    return result.length > 0;
  }

  async getServicePricing(): Promise<ServicePricing[]> {
    return db.select().from(servicePricing);
  }

  async getServicePricingByTier(tierCode: string): Promise<ServicePricing | undefined> {
    const [pricing] = await db.select().from(servicePricing).where(eq(servicePricing.tierCode, tierCode));
    return pricing || undefined;
  }

  async seedPricing(): Promise<void> {
    const existing = await db.select().from(servicePricing);
    if (existing.length > 0) return;

    await db.insert(servicePricing).values([
      {
        tierCode: "LITE",
        tierName: "LITE (실속형)",
        baseMonthlyFee: 400000,
        matchingCondition: "월 거래 50건 이하, 세금계산서 5건 이하",
        targetRevenue: "10억 이하",
      },
      {
        tierCode: "BASIC",
        tierName: "BASIC (일반형)",
        baseMonthlyFee: 800000,
        matchingCondition: "월 거래 51~150건, 세금계산서 6~20건",
        targetRevenue: "10억~50억",
      },
      {
        tierCode: "PREMIUM",
        tierName: "PREMIUM (고급형)",
        baseMonthlyFee: 1000000,
        matchingCondition: "월 거래 151~400건, 세금계산서 21~60건",
        targetRevenue: "50억~100억",
      },
      {
        tierCode: "LUXURY",
        tierName: "LUXURY (명품형)",
        baseMonthlyFee: 2000000,
        matchingCondition: "월 거래 401건 이상, 세금계산서 61건 이상",
        targetRevenue: "100억 이상",
      },
    ]);
  }

  async getTaxPricing(): Promise<TaxPricing[]> {
    return db.select().from(taxPricing);
  }

  async seedTaxPricing(): Promise<void> {
    const existing = await db.select().from(taxPricing);
    if (existing.length > 0) return;

    await db.insert(taxPricing).values([
      { revenueRange: "5천만원 이하", businessType: "개인사업자", monthlyFee: 0, description: "금액 미정 (추후 설정)" },
      { revenueRange: "5천만원~1억", businessType: "개인사업자", monthlyFee: 0, description: "금액 미정 (추후 설정)" },
      { revenueRange: "1억~3억", businessType: "개인사업자", monthlyFee: 0, description: "금액 미정 (추후 설정)" },
      { revenueRange: "3억~5억", businessType: "개인사업자", monthlyFee: 0, description: "금액 미정 (추후 설정)" },
      { revenueRange: "5억~10억", businessType: "개인사업자", monthlyFee: 0, description: "금액 미정 (추후 설정)" },
      { revenueRange: "10억 이상", businessType: "개인사업자", monthlyFee: 0, description: "금액 미정 (추후 설정)" },
      { revenueRange: "5천만원 이하", businessType: "법인사업자", monthlyFee: 0, description: "금액 미정 (추후 설정)" },
      { revenueRange: "5천만원~1억", businessType: "법인사업자", monthlyFee: 0, description: "금액 미정 (추후 설정)" },
      { revenueRange: "1억~3억", businessType: "법인사업자", monthlyFee: 0, description: "금액 미정 (추후 설정)" },
      { revenueRange: "3억~5억", businessType: "법인사업자", monthlyFee: 0, description: "금액 미정 (추후 설정)" },
      { revenueRange: "5억~10억", businessType: "법인사업자", monthlyFee: 0, description: "금액 미정 (추후 설정)" },
      { revenueRange: "10억 이상", businessType: "법인사업자", monthlyFee: 0, description: "금액 미정 (추후 설정)" },
    ]);
  }
}

export const storage = new DatabaseStorage();
