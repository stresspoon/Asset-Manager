import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, real, timestamp, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const servicePricing = pgTable("service_pricing", {
  tierCode: varchar("tier_code", { length: 20 }).primaryKey(),
  tierName: text("tier_name").notNull(),
  baseMonthlyFee: integer("base_monthly_fee").notNull(),
  matchingCondition: text("matching_condition").notNull(),
  targetRevenue: text("target_revenue").notNull(),
});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  recommendedTier: varchar("recommended_tier", { length: 20 }).notNull(),
  baseMonthlyFee: integer("base_monthly_fee").notNull(),
  onestopDiscount: boolean("onestop_discount").default(false),
  discountRate: real("discount_rate").default(0),
  finalMonthlyFee: integer("final_monthly_fee").notNull(),
  additionalNotes: text("additional_notes"),
  calculationBasis: text("calculation_basis"),
  notionRequestId: text("notion_request_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true, createdAt: true });
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

export const insertServicePricingSchema = createInsertSchema(servicePricing);
export type InsertServicePricing = z.infer<typeof insertServicePricingSchema>;
export type ServicePricing = typeof servicePricing.$inferSelect;

export const quotesRelations = relations(quotes, ({ one }) => ({
  pricing: one(servicePricing, {
    fields: [quotes.recommendedTier],
    references: [servicePricing.tierCode],
  }),
}));

export type ConsultationStatus = "신규접수" | "상담중" | "완료";
export type ScheduleStatus = "예약됨" | "상담중" | "완료" | "취소" | "노쇼";

export type BusinessType = "개인사업자" | "법인사업자";
export type Industry = "음식점/프랜차이즈" | "온라인몰/플랫폼" | "제조/수출" | "IT/서비스" | "도소매/유통" | "기타";
export type MonthlyVolume = "월 거래 50건 이하 / 세금계산서 5건 이하" | "월 거래 51~150건 / 세금계산서 6~20건" | "월 거래 151~400건 / 세금계산서 21~60건" | "월 거래 401건 이상 / 세금계산서 61건 이상" | "기타";
export type CardUsageCount = "50건 이하" | "51~150건" | "151~400건" | "401건 이상";
export type TaxInvoiceCount = "5건 이하" | "6~20건" | "21~60건" | "61건 이상";
export type AnnualRevenue = "10억 이하" | "10억~50억" | "50억~100억" | "100억 이상";
export type TierCode = "LITE" | "BASIC" | "PREMIUM" | "LUXURY";

export interface NotionConsultationRequest {
  id: string;
  companyContact: string;
  businessType: string;
  industry: string;
  monthlyVolume: string;
  employeeRevenue: string;
  bankCardCount: string;
  cardUsageCount: string;
  cardCount: number;
  taxInvoiceCount: string;
  annualRevenue: string;
  formCompleted: boolean;
  reservationCompleted: boolean;
  submissionComplete: boolean;
  urgentIssues: string[];
  monthlyTask: string;
  desiredServices: string[];
  platformSettlement: string[];
  availableTime: string;
  specificRequest: string;
  submittedAt: string;
  consultationStatus: ConsultationStatus;
  scheduleId?: string;
}

export interface NotionConsultationSchedule {
  id: string;
  title: string;
  scheduledAt: string;
  progressStatus: ScheduleStatus;
  memo: string;
  consultationNotes: string;
  quoteGenerated: boolean;
  requestId?: string;
}

export interface DashboardStats {
  newRequests: number;
  inProgress: number;
  completed: number;
  todaySchedules: number;
}
