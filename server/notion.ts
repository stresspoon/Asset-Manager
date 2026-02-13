import { Client } from "@notionhq/client";
import type { NotionConsultationRequest, NotionConsultationSchedule, ServiceType } from "@shared/schema";

function normalizeEnvValue(value: string | undefined): string {
  return (value || "").replace(/\\n/g, "").trim();
}

function normalizeDatabaseId(value: string | undefined): string {
  return normalizeEnvValue(value).replace(/\s+/g, "");
}

export class NotionIntegrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotionIntegrationError";
  }
}

export function isNotionIntegrationError(error: unknown): error is NotionIntegrationError {
  return error instanceof NotionIntegrationError;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function toNotionError(action: string, error: unknown): NotionIntegrationError {
  if (isNotionIntegrationError(error)) return error;
  return new NotionIntegrationError(`${action}: ${getErrorMessage(error)}`);
}

function assertNotionConfig(): void {
  if (!NOTION_API_KEY) {
    throw new NotionIntegrationError("NOTION_API_KEY is missing or invalid. Check Vercel environment variables.");
  }
}

function requireDatabaseId(envName: string, value: string): string {
  if (!value) {
    throw new NotionIntegrationError(`${envName} is missing. Check Vercel environment variables.`);
  }

  const normalized = value.replace(/-/g, "");
  if (!/^[a-f0-9]{32}$/i.test(normalized)) {
    throw new NotionIntegrationError(
      `${envName} is invalid (${value}). Expected a 32-character Notion database ID (hex).`,
    );
  }

  return value;
}

const NOTION_API_KEY = normalizeEnvValue(process.env.NOTION_API_KEY);
const notion = new Client({
  auth: NOTION_API_KEY || undefined,
});

const ACCOUNTING_REQUEST_DB_ID = normalizeDatabaseId(
  process.env.NOTION_ACCOUNTING_REQUEST_DB_ID || process.env.NOTION_REQUEST_DB_ID,
);
const TAX_REQUEST_DB_ID = normalizeDatabaseId(process.env.NOTION_TAX_REQUEST_DB_ID);
const SCHEDULE_DB_ID = normalizeDatabaseId(process.env.NOTION_SCHEDULE_DB_ID);

const ACCOUNTING_PRICING_DB_ID = normalizeDatabaseId(
  process.env.NOTION_ACCOUNTING_PRICING_DB_ID || process.env.NOTION_PRICING_DB_ID,
);
const TAX_PRICING_DB_ID = normalizeDatabaseId(process.env.NOTION_TAX_PRICING_DB_ID);

const ACCOUNTING_QUOTES_DB_ID = normalizeDatabaseId(
  process.env.NOTION_ACCOUNTING_QUOTES_DB_ID || process.env.NOTION_QUOTES_DB_ID,
);
const TAX_QUOTES_DB_ID = normalizeDatabaseId(process.env.NOTION_TAX_QUOTES_DB_ID);

function getRequestDbIdForService(serviceType: ServiceType): string {
  if (serviceType === "tax" && TAX_REQUEST_DB_ID) {
    return requireDatabaseId("NOTION_TAX_REQUEST_DB_ID", TAX_REQUEST_DB_ID);
  }

  if (serviceType === "tax") {
    return requireDatabaseId("NOTION_ACCOUNTING_REQUEST_DB_ID", ACCOUNTING_REQUEST_DB_ID);
  }

  return requireDatabaseId("NOTION_ACCOUNTING_REQUEST_DB_ID", ACCOUNTING_REQUEST_DB_ID);
}

function getReadableRequestDatabases(): Array<{ id: string; envName: string; fallbackServiceType: ServiceType }> {
  const databases: Array<{ id: string; envName: string; fallbackServiceType: ServiceType }> = [];
  const accountingId = requireDatabaseId("NOTION_ACCOUNTING_REQUEST_DB_ID", ACCOUNTING_REQUEST_DB_ID);
  databases.push({ id: accountingId, envName: "NOTION_ACCOUNTING_REQUEST_DB_ID", fallbackServiceType: "accounting" });

  if (TAX_REQUEST_DB_ID) {
    const taxId = requireDatabaseId("NOTION_TAX_REQUEST_DB_ID", TAX_REQUEST_DB_ID);
    if (taxId !== accountingId) {
      databases.push({ id: taxId, envName: "NOTION_TAX_REQUEST_DB_ID", fallbackServiceType: "tax" });
    }
  }

  return databases;
}

function getPricingDbIdForService(serviceType: ServiceType): string {
  if (serviceType === "tax" && TAX_PRICING_DB_ID) {
    return requireDatabaseId("NOTION_TAX_PRICING_DB_ID", TAX_PRICING_DB_ID);
  }

  return requireDatabaseId("NOTION_ACCOUNTING_PRICING_DB_ID", ACCOUNTING_PRICING_DB_ID);
}

function getQuotesDbIdForService(serviceType: ServiceType): string {
  if (serviceType === "tax" && TAX_QUOTES_DB_ID) {
    return requireDatabaseId("NOTION_TAX_QUOTES_DB_ID", TAX_QUOTES_DB_ID);
  }

  return requireDatabaseId("NOTION_ACCOUNTING_QUOTES_DB_ID", ACCOUNTING_QUOTES_DB_ID);
}

function getPlainText(property: any): string {
  if (!property) return "";
  if (property.type === "title" && property.title) {
    return property.title.map((t: any) => t.plain_text).join("");
  }
  if (property.type === "rich_text" && property.rich_text) {
    return property.rich_text.map((t: any) => t.plain_text).join("");
  }
  return "";
}

function getSelect(property: any): string {
  if (!property || property.type !== "select" || !property.select) return "";
  return property.select.name || "";
}

function getMultiSelect(property: any): string[] {
  if (!property || property.type !== "multi_select" || !property.multi_select) return [];
  return property.multi_select.map((s: any) => s.name);
}

function getNumber(property: any): number {
  if (!property || property.type !== "number") return 0;
  return property.number || 0;
}

function getCheckbox(property: any): boolean {
  if (!property || property.type !== "checkbox") return false;
  return property.checkbox || false;
}

function getFormula(property: any): any {
  if (!property || property.type !== "formula") return null;
  const formula = property.formula;
  if (formula.type === "boolean") return formula.boolean;
  if (formula.type === "string") return formula.string;
  if (formula.type === "number") return formula.number;
  return null;
}

function getDate(property: any): string {
  if (!property) return "";
  if (property.type === "date" && property.date) {
    return property.date.start || "";
  }
  if (property.type === "created_time") {
    return property.created_time || "";
  }
  return "";
}

function getStatus(property: any): string {
  if (!property || property.type !== "status" || !property.status) return "";
  return property.status.name || "";
}

function getRelation(property: any): string | undefined {
  if (!property || property.type !== "relation" || !property.relation?.length) return undefined;
  return property.relation[0].id;
}

function parseRequest(page: any, fallbackServiceType: ServiceType = "accounting"): NotionConsultationRequest {
  const props = page.properties;
  const submissionComplete = getFormula(props["접수 완료 여부"]);
  const serviceTypeRaw = getSelect(props["서비스 유형"] || props["Service Type"]);
  const serviceType: ServiceType =
    serviceTypeRaw === "일반세무기장"
      ? "tax"
      : serviceTypeRaw === "경리아웃소싱"
      ? "accounting"
      : fallbackServiceType;
  return {
    id: page.id,
    serviceType,
    companyContact: getPlainText(props["회사명/담당자/연락처"] || props["title"] || props["Title"] || props["Name"] || props["이름"]) || "정보 없음",
    businessType: getSelect(props["사업자 유형"] || props["Business Type"]),
    industry: getSelect(props["주요 업종"] || props["Industry"]),
    monthlyVolume: getSelect(props["월 거래량/세금계산서"] || props["Monthly Volume"]),
    employeeRevenue: getPlainText(props["직원 수 및 연매출"] || props["Employee Revenue"]),
    bankCardCount: getPlainText(props["통장/법인카드 개수"] || props["Bank Card Count"]),
    cardUsageCount: getSelect(props["카드 사용 건수 (월)"] || props["Card Usage Count"]),
    cardCount: getNumber(props["카드 개수"] || props["Card Count"]),
    taxInvoiceCount: getSelect(props["세금계산서 발행 건수 (월)"] || props["Tax Invoice Count"]),
    annualRevenue: getSelect(props["연매출 규모"] || props["Annual Revenue"]),
    formCompleted: getCheckbox(props["폼 작성 완료 여부"] || props["Form Completed"]),
    reservationCompleted: getCheckbox(props["예약 완료 여부"] || props["Reservation Completed"]),
    submissionComplete: submissionComplete === true || submissionComplete === "true",
    urgentIssues: getMultiSelect(props["지금 가장 급한 문제"] || props["Urgent Issues"]),
    monthlyTask: getPlainText(props["이번 달 해결 과제"] || props["Monthly Task"]),
    desiredServices: getMultiSelect(props["원하는 서비스"] || props["Desired Services"]),
    platformSettlement: getMultiSelect(props["온라인 플랫폼 정산"] || props["Platform Settlement"]),
    availableTime: getSelect(props["상담 가능 시간대"] || props["Available Time"]) || getPlainText(props["상담 가능 시간대"]),
    specificRequest: getPlainText(props["구체적"] || props["Specific Request"]),
    submittedAt: getDate(props["제출일시"] || props["Created"]) || page.created_time || "",
    consultationStatus: (getStatus(props["상담 상태"] || props["Status"] || props["상태"]) || "신규접수") as any,
    scheduleId: getRelation(props["상담 일정"] || props["Schedule"]),
    phone: getPlainText(props["전화번호"] || props["Phone"]),
  };
}

function parseSchedule(page: any): NotionConsultationSchedule {
  const props = page.properties;
  const serviceTypeRaw = getSelect(props["서비스 유형"] || props["Service Type"]);
  const serviceType: ServiceType = serviceTypeRaw === "일반세무기장" ? "tax" : "accounting";
  return {
    id: page.id,
    title: getPlainText(props["상담 일시"] || props["title"] || props["Title"] || props["Name"] || props["이름"]) || getPlainText(props["제목"]) || "제목 없음",
    scheduledAt: getDate(props["예약 일시"] || props["Date"] || props["날짜"]) || page.created_time || "",
    serviceType,
    progressStatus: (getStatus(props["진행 상태"] || props["Status"] || props["상태"]) || "예약됨") as any,
    memo: getPlainText(props["메모"] || props["Memo"]),
    consultationNotes: getPlainText(props["상담 내용 메모"] || props["Notes"]),
    quoteGenerated: getCheckbox(props["견적 산출 여부"]),
    requestId: getRelation(props["상담 신청자"] || props["상담 신청자 (관계)"]),
  };
}

interface NotionPricingEntry {
  tierCode: string;
  tierName: string;
  baseMonthlyFee: number;
  matchingCondition: string;
  targetRevenue: string;
}

function parsePricing(page: any): NotionPricingEntry {
  const props = page.properties;
  return {
    tierCode: getSelect(props["등급 코드"] || props["Tier Code"]) || getPlainText(props["등급 코드"]),
    tierName: getPlainText(props["서비스 등급"] || props["title"] || props["Title"] || props["Name"]) || getSelect(props["서비스 등급"]),
    baseMonthlyFee: getNumber(props["월 기본료"] || props["Base Monthly Fee"]),
    matchingCondition: getPlainText(props["매칭 조건"] || props["Matching Condition"]),
    targetRevenue: getPlainText(props["대상 연매출"] || props["Target Revenue"]) || getSelect(props["대상 연매출"]),
  };
}

export async function getRequests(): Promise<NotionConsultationRequest[]> {
  assertNotionConfig();
  const requestDatabases = getReadableRequestDatabases();
  try {
    const allRequests: NotionConsultationRequest[] = [];
    const seenPageIds = new Set<string>();

    for (const db of requestDatabases) {
      const response = await notion.databases.query({
        database_id: db.id,
        page_size: 100,
      });

      for (const page of response.results as any[]) {
        if (seenPageIds.has(page.id)) continue;
        seenPageIds.add(page.id);
        allRequests.push(parseRequest(page, db.fallbackServiceType));
      }
    }

    return allRequests;
  } catch (error: unknown) {
    throw toNotionError("Failed to fetch requests from Notion", error);
  }
}

export async function getRequestById(id: string): Promise<NotionConsultationRequest | null> {
  assertNotionConfig();
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    return parseRequest(page);
  } catch (error: unknown) {
    const message = getErrorMessage(error).toLowerCase();
    if (message.includes("could not find page")) {
      return null;
    }
    throw toNotionError("Failed to fetch request from Notion", error);
  }
}

export async function updateRequestStatus(id: string, status: string): Promise<boolean> {
  try {
    await notion.pages.update({
      page_id: id,
      properties: {
        "상담 상태": {
          status: { name: status },
        } as any,
      },
    });
    return true;
  } catch (error: any) {
    console.error("Error updating request status:", error?.message || error);
    return false;
  }
}

export async function updateRequestFields(id: string, fields: Record<string, any>): Promise<boolean> {
  try {
    const properties: any = {};
    if (fields.companyContact !== undefined) {
      properties["회사명/담당자/연락처"] = {
        title: [{ text: { content: fields.companyContact } }],
      };
    }
    if (fields.businessType !== undefined) {
      properties["사업자 유형"] = { select: { name: fields.businessType } };
    }
    if (fields.industry !== undefined) {
      properties["주요 업종"] = { select: { name: fields.industry } };
    }
    if (fields.monthlyVolume !== undefined) {
      properties["월 거래량/세금계산서"] = { select: { name: fields.monthlyVolume } };
    }
    if (fields.cardUsageCount !== undefined) {
      properties["카드 사용 건수 (월)"] = { select: { name: fields.cardUsageCount } };
    }
    if (fields.taxInvoiceCount !== undefined) {
      properties["세금계산서 발행 건수 (월)"] = { select: { name: fields.taxInvoiceCount } };
    }
    if (fields.annualRevenue !== undefined) {
      properties["연매출 규모"] = { select: { name: fields.annualRevenue } };
    }
    if (fields.employeeRevenue !== undefined) {
      properties["직원 수 및 연매출"] = {
        rich_text: [{ text: { content: fields.employeeRevenue.substring(0, 2000) } }],
      };
    }
    if (fields.bankCardCount !== undefined) {
      properties["통장/법인카드 개수"] = {
        rich_text: [{ text: { content: fields.bankCardCount.substring(0, 2000) } }],
      };
    }
    if (fields.cardCount !== undefined) {
      properties["카드 개수"] = { number: Number(fields.cardCount) };
    }
    if (fields.specificRequest !== undefined) {
      properties["구체적"] = {
        rich_text: [{ text: { content: fields.specificRequest.substring(0, 2000) } }],
      };
    }
    if (fields.monthlyTask !== undefined) {
      properties["이번 달 해결 과제"] = {
        rich_text: [{ text: { content: fields.monthlyTask.substring(0, 2000) } }],
      };
    }

    await notion.pages.update({
      page_id: id,
      properties,
    });
    return true;
  } catch (error: any) {
    console.error("Error updating request fields:", error?.message || error);
    return false;
  }
}

export async function createRequest(data: {
  companyContact: string;
  phone?: string;
  businessType: string;
  industry: string;
  monthlyVolume?: string;
  employeeRevenue?: string;
  bankCardCount?: string;
  cardUsageCount?: string;
  cardCount?: number;
  taxInvoiceCount?: string;
  annualRevenue: string;
  urgentIssues?: string[];
  monthlyTask?: string;
  desiredServices?: string[];
  platformSettlement?: string[];
  availableTime?: string;
  specificRequest?: string;
  serviceType: string;
}): Promise<string> {
  assertNotionConfig();
  const serviceType = data.serviceType === "tax" ? "tax" : "accounting";
  const requestDbId = getRequestDbIdForService(serviceType);
  try {
    const properties: any = {
      "회사명/담당자/연락처": {
        title: [{ text: { content: data.companyContact } }],
      },
      "사업자 유형": { select: { name: data.businessType } },
      "주요 업종": { select: { name: data.industry } },
      "폼 작성 완료 여부": { checkbox: true },
      "예약 완료 여부": { checkbox: true },
    };
    if (data.annualRevenue) {
      properties["연매출 규모"] = { select: { name: data.annualRevenue } };
    }
    if (data.phone) {
      properties["전화번호"] = {
        rich_text: [{ text: { content: data.phone } }],
      };
    }

    if (data.monthlyVolume) {
      properties["월 거래량/세금계산서"] = { select: { name: data.monthlyVolume } };
    }
    if (data.employeeRevenue) {
      properties["직원 수 및 연매출"] = {
        rich_text: [{ text: { content: data.employeeRevenue } }],
      };
    }
    if (data.bankCardCount) {
      properties["통장/법인카드 개수"] = {
        rich_text: [{ text: { content: data.bankCardCount } }],
      };
    }
    if (data.cardUsageCount) {
      properties["카드 사용 건수 (월)"] = { select: { name: data.cardUsageCount } };
    }
    if (data.cardCount !== undefined) {
      properties["카드 개수"] = { number: data.cardCount };
    }
    if (data.taxInvoiceCount) {
      properties["세금계산서 발행 건수 (월)"] = { select: { name: data.taxInvoiceCount } };
    }
    if (data.urgentIssues && data.urgentIssues.length > 0) {
      properties["지금 가장 급한 문제"] = {
        multi_select: data.urgentIssues.map((name) => ({ name })),
      };
    }
    if (data.monthlyTask) {
      properties["이번 달 해결 과제"] = {
        rich_text: [{ text: { content: data.monthlyTask } }],
      };
    }
    if (data.desiredServices && data.desiredServices.length > 0) {
      properties["원하는 서비스"] = {
        multi_select: data.desiredServices.map((name) => ({ name })),
      };
    }
    if (data.platformSettlement && data.platformSettlement.length > 0) {
      properties["온라인 플랫폼 정산"] = {
        multi_select: data.platformSettlement.map((name) => ({ name })),
      };
    }
    if (data.specificRequest) {
      properties["구체적"] = {
        rich_text: [{ text: { content: data.specificRequest.substring(0, 2000) } }],
      };
    }

    const response = await notion.pages.create({
      parent: { database_id: requestDbId },
      properties,
    });
    return response.id;
  } catch (error: unknown) {
    throw toNotionError("Failed to create request in Notion", error);
  }
}

export async function getSchedules(): Promise<NotionConsultationSchedule[]> {
  assertNotionConfig();
  const scheduleDbId = requireDatabaseId("NOTION_SCHEDULE_DB_ID", SCHEDULE_DB_ID);
  try {
    const response = await notion.databases.query({
      database_id: scheduleDbId,
      page_size: 100,
    });
    return response.results.map((page: any) => parseSchedule(page));
  } catch (error: unknown) {
    throw toNotionError("Failed to fetch schedules from Notion", error);
  }
}

export async function getScheduleById(id: string): Promise<NotionConsultationSchedule | null> {
  assertNotionConfig();
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    return parseSchedule(page);
  } catch (error: unknown) {
    const message = getErrorMessage(error).toLowerCase();
    if (message.includes("could not find page")) {
      return null;
    }
    throw toNotionError("Failed to fetch schedule from Notion", error);
  }
}

export async function updateScheduleStatus(id: string, status: string): Promise<boolean> {
  try {
    await notion.pages.update({
      page_id: id,
      properties: {
        "진행 상태": {
          status: { name: status },
        } as any,
      },
    });
    return true;
  } catch (error: any) {
    console.error("Error updating schedule status:", error?.message || error);
    return false;
  }
}

export async function updateScheduleNotes(id: string, notes: string): Promise<boolean> {
  try {
    await notion.pages.update({
      page_id: id,
      properties: {
        "상담 내용 메모": {
          rich_text: [{ text: { content: notes.substring(0, 2000) } }],
        },
      },
    });
    return true;
  } catch (error: any) {
    console.error("Error updating schedule notes:", error?.message || error);
    return false;
  }
}

export async function updateScheduleQuoteGenerated(id: string, generated: boolean): Promise<boolean> {
  try {
    await notion.pages.update({
      page_id: id,
      properties: {
        "견적 산출 여부": {
          checkbox: generated,
        },
      },
    });
    return true;
  } catch (error: any) {
    console.error("Error updating schedule quote status:", error?.message || error);
    return false;
  }
}

export async function createSchedule(data: {
  title: string;
  scheduledAt: string;
  serviceType: string;
  requestId?: string;
}): Promise<string> {
  assertNotionConfig();
  const scheduleDbId = requireDatabaseId("NOTION_SCHEDULE_DB_ID", SCHEDULE_DB_ID);
  try {
    const properties: any = {
      "상담 일시": {
        title: [{ text: { content: data.title } }],
      },
      "예약 일시": {
        date: { start: data.scheduledAt },
      },
      "진행 상태": {
        status: { name: "예약됨" },
      } as any,
    };

    if (data.requestId) {
      properties["상담 신청자"] = {
        relation: [{ id: data.requestId }],
      };
    }

    const response = await notion.pages.create({
      parent: { database_id: scheduleDbId },
      properties,
    });
    return response.id;
  } catch (error: unknown) {
    throw toNotionError("Failed to create schedule in Notion", error);
  }
}

export async function getTodaySchedules(): Promise<NotionConsultationSchedule[]> {
  assertNotionConfig();
  const scheduleDbId = requireDatabaseId("NOTION_SCHEDULE_DB_ID", SCHEDULE_DB_ID);
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  try {
    const response = await notion.databases.query({
      database_id: scheduleDbId,
      page_size: 20,
    });
    const all = response.results.map((page: any) => parseSchedule(page));
    return all.filter((s: NotionConsultationSchedule) => {
      if (!s.scheduledAt) return false;
      return s.scheduledAt.startsWith(todayStr);
    });
  } catch (error: unknown) {
    throw toNotionError("Failed to fetch today's schedules from Notion", error);
  }
}

export async function getBookedSlots(dateStr: string): Promise<string[]> {
  assertNotionConfig();
  const scheduleDbId = requireDatabaseId("NOTION_SCHEDULE_DB_ID", SCHEDULE_DB_ID);
  try {
    const response = await notion.databases.query({
      database_id: scheduleDbId,
      page_size: 100,
    });
    const all = response.results.map((page: any) => parseSchedule(page));
    return all
      .filter((s) => {
        if (!s.scheduledAt) return false;
        if (s.progressStatus === "취소") return false;
        return s.scheduledAt.startsWith(dateStr);
      })
      .map((s) => {
        const d = new Date(s.scheduledAt);
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      });
  } catch (error: unknown) {
    throw toNotionError("Failed to fetch booked slots from Notion", error);
  }
}

export async function getPricing(): Promise<NotionPricingEntry[]> {
  return getPricingByService("accounting");
}

export async function getPricingByService(serviceType: ServiceType): Promise<NotionPricingEntry[]> {
  assertNotionConfig();
  const pricingDbId = getPricingDbIdForService(serviceType);
  try {
    const response = await notion.databases.query({
      database_id: pricingDbId,
      page_size: 20,
    });
    return response.results.map((page: any) => parsePricing(page));
  } catch (error: unknown) {
    throw toNotionError("Failed to fetch pricing from Notion", error);
  }
}

export async function createQuoteInNotion(data: {
  title: string;
  recommendedTier: string;
  baseMonthlyFee: number;
  onestopDiscount: boolean;
  discountRate: number;
  finalMonthlyFee: number;
  additionalNotes?: string;
  calculationBasis?: string;
  requestId?: string;
  serviceType?: ServiceType;
}): Promise<string> {
  assertNotionConfig();
  const serviceType = data.serviceType === "tax" ? "tax" : "accounting";
  const quotesDbId = getQuotesDbIdForService(serviceType);
  try {
    const properties: any = {
      "견적 제목": {
        title: [{ text: { content: data.title } }],
      },
      "추천 등급": {
        select: { name: data.recommendedTier },
      },
      "월 기본료": {
        number: data.baseMonthlyFee,
      },
      "원스톱 할인 적용": {
        checkbox: data.onestopDiscount,
      },
      "할인율": {
        number: data.discountRate,
      },
      "산출일": {
        date: { start: new Date().toISOString().split("T")[0] },
      },
    };

    if (data.additionalNotes) {
      properties["추가 옵션 설명"] = {
        rich_text: [{ text: { content: data.additionalNotes.substring(0, 2000) } }],
      };
    }

    if (data.calculationBasis) {
      properties["산출 근거"] = {
        rich_text: [{ text: { content: data.calculationBasis.substring(0, 2000) } }],
      };
    }

    if (data.requestId) {
      properties["상담 신청"] = {
        relation: [{ id: data.requestId }],
      };
    }

    const response = await notion.pages.create({
      parent: { database_id: quotesDbId },
      properties,
    });

    return response.id;
  } catch (error: unknown) {
    throw toNotionError("Failed to create quote in Notion", error);
  }
}

export async function archiveNotionPage(pageId: string): Promise<boolean> {
  try {
    await notion.pages.update({
      page_id: pageId,
      archived: true,
    });
    return true;
  } catch (error: any) {
    console.error("Error archiving Notion page:", error?.message || error);
    return false;
  }
}

export async function discoverDatabaseProperties(dbId?: string): Promise<any> {
  assertNotionConfig();
  const targetId = dbId ? normalizeDatabaseId(dbId) : ACCOUNTING_REQUEST_DB_ID;
  if (!targetId) {
    throw new NotionIntegrationError("No database ID provided or configured.");
  }
  try {
    const db: any = await notion.databases.retrieve({ database_id: targetId });
    const result: Record<string, string> = {};
    for (const [name, prop] of Object.entries(db.properties as Record<string, any>)) {
      result[name] = prop.type;
    }
    return result;
  } catch (error: unknown) {
    throw toNotionError("Failed to discover Notion database properties", error);
  }
}
