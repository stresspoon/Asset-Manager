import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, real, timestamp, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export type ServiceType = "accounting" | "tax";

export const servicePricing = pgTable("service_pricing", {
  tierCode: varchar("tier_code", { length: 20 }).primaryKey(),
  tierName: text("tier_name").notNull(),
  baseMonthlyFee: integer("base_monthly_fee").notNull(),
  matchingCondition: text("matching_condition").notNull(),
  targetRevenue: text("target_revenue").notNull(),
});

export const taxPricing = pgTable("tax_pricing", {
  id: serial("id").primaryKey(),
  revenueRange: text("revenue_range").notNull(),
  businessType: text("business_type").notNull(),
  monthlyFee: integer("monthly_fee").notNull(),
  description: text("description"),
});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  serviceType: varchar("service_type", { length: 20 }).default("accounting"),
  recommendedTier: varchar("recommended_tier", { length: 20 }).notNull(),
  baseMonthlyFee: integer("base_monthly_fee").notNull(),
  onestopDiscount: boolean("onestop_discount").default(false),
  discountRate: real("discount_rate").default(0),
  finalMonthlyFee: integer("final_monthly_fee").notNull(),
  additionalNotes: text("additional_notes"),
  calculationBasis: text("calculation_basis"),
  desiredServices: text("desired_services"),
  notionRequestId: text("notion_request_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true, createdAt: true });
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

export const insertServicePricingSchema = createInsertSchema(servicePricing);
export type InsertServicePricing = z.infer<typeof insertServicePricingSchema>;
export type ServicePricing = typeof servicePricing.$inferSelect;

export const insertTaxPricingSchema = createInsertSchema(taxPricing).omit({ id: true });
export type InsertTaxPricing = z.infer<typeof insertTaxPricingSchema>;
export type TaxPricing = typeof taxPricing.$inferSelect;

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
  serviceType: ServiceType;
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
  phone?: string;
}

export interface NotionTaxConsultationRequest {
  id: string;
  serviceType: ServiceType;
  companyContact: string;
  businessType: string;
  industry: string;
  annualRevenue: string;
  employeeCount: string;
  currentAccountingMethod: string;
  taxConcerns: string[];
  desiredServices: string[];
  specificRequest: string;
  phone?: string;
  formCompleted: boolean;
  reservationCompleted: boolean;
  submissionComplete: boolean;
  submittedAt: string;
  consultationStatus: ConsultationStatus;
  scheduleId?: string;
}

export interface NotionConsultationSchedule {
  id: string;
  title: string;
  scheduledAt: string;
  serviceType: ServiceType;
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
  accountingRequests: number;
  taxRequests: number;
}

export interface ScheduleSlot {
  date: string;
  time: string;
  available: boolean;
}

export const consultationFormSchema = z.object({
  serviceType: z.enum(["accounting", "tax"]),
  companyContact: z.string().min(1, "회사명/담당자/연락처를 입력해주세요"),
  phone: z.string().min(1, "전화번호를 입력해주세요"),
  businessType: z.string().min(1, "사업자 유형을 선택해주세요"),
  industry: z.string().min(1, "업종을 선택해주세요"),
  annualRevenue: z.string().min(1, "연매출 규모를 선택해주세요"),
  monthlyVolume: z.string().optional(),
  employeeRevenue: z.string().optional(),
  bankCardCount: z.string().optional(),
  cardUsageCount: z.string().optional(),
  cardCount: z.number().optional(),
  taxInvoiceCount: z.string().optional(),
  urgentIssues: z.array(z.string()).optional(),
  monthlyTask: z.string().optional(),
  desiredServices: z.array(z.string()).optional(),
  platformSettlement: z.array(z.string()).optional(),
  availableTime: z.string().optional(),
  specificRequest: z.string().optional(),
  employeeCount: z.string().optional(),
  currentAccountingMethod: z.string().optional(),
  taxConcerns: z.array(z.string()).optional(),
  scheduledDate: z.string().min(1, "상담 날짜를 선택해주세요"),
  scheduledTime: z.string().min(1, "상담 시간을 선택해주세요"),
});

export type ConsultationFormData = z.infer<typeof consultationFormSchema>;
