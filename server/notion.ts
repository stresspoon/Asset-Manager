import { Client } from "@notionhq/client";
import type { NotionConsultationRequest, NotionConsultationSchedule } from "@shared/schema";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const REQUEST_DB_ID = process.env.NOTION_REQUEST_DB_ID || "";
const SCHEDULE_DB_ID = process.env.NOTION_SCHEDULE_DB_ID || "";
const PRICING_DB_ID = process.env.NOTION_PRICING_DB_ID || "";
const QUOTES_DB_ID = process.env.NOTION_QUOTES_DB_ID || "";

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

function parseRequest(page: any): NotionConsultationRequest {
  const props = page.properties;
  const submissionComplete = getFormula(props["접수 완료 여부"]);
  return {
    id: page.id,
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
    specificRequest: getPlainText(props["구체적 요청사항"] || props["Specific Request"]),
    submittedAt: getDate(props["제출일시"] || props["Created"]) || page.created_time || "",
    consultationStatus: (getStatus(props["상담 상태"] || props["Status"] || props["상태"]) || "신규접수") as any,
    scheduleId: getRelation(props["상담 일정"] || props["Schedule"]),
  };
}

function parseSchedule(page: any): NotionConsultationSchedule {
  const props = page.properties;
  return {
    id: page.id,
    title: getPlainText(props["상담 일시"] || props["title"] || props["Title"] || props["Name"] || props["이름"]) || getPlainText(props["제목"]) || "제목 없음",
    scheduledAt: getDate(props["예약 일시"] || props["Date"] || props["날짜"]) || page.created_time || "",
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
  if (!REQUEST_DB_ID) {
    console.warn("NOTION_REQUEST_DB_ID not set, returning empty list");
    return [];
  }
  try {
    const response = await notion.databases.query({
      database_id: REQUEST_DB_ID,
      page_size: 100,
    });
    return response.results.map((page: any) => parseRequest(page));
  } catch (error: any) {
    console.error("Error fetching requests from Notion:", error?.message || error);
    return [];
  }
}

export async function getRequestById(id: string): Promise<NotionConsultationRequest | null> {
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    return parseRequest(page);
  } catch (error: any) {
    console.error("Error fetching request:", error?.message || error);
    return null;
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

export async function getSchedules(): Promise<NotionConsultationSchedule[]> {
  if (!SCHEDULE_DB_ID) return [];
  try {
    const response = await notion.databases.query({
      database_id: SCHEDULE_DB_ID,
      page_size: 100,
    });
    return response.results.map((page: any) => parseSchedule(page));
  } catch (error: any) {
    console.error("Error fetching schedules from Notion:", error?.message || error);
    return [];
  }
}

export async function getScheduleById(id: string): Promise<NotionConsultationSchedule | null> {
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    return parseSchedule(page);
  } catch (error: any) {
    console.error("Error fetching schedule:", error?.message || error);
    return null;
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

export async function getTodaySchedules(): Promise<NotionConsultationSchedule[]> {
  if (!SCHEDULE_DB_ID) return [];
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  try {
    const response = await notion.databases.query({
      database_id: SCHEDULE_DB_ID,
      page_size: 20,
    });
    const all = response.results.map((page: any) => parseSchedule(page));
    return all.filter((s: NotionConsultationSchedule) => {
      if (!s.scheduledAt) return false;
      return s.scheduledAt.startsWith(todayStr);
    });
  } catch (error: any) {
    console.error("Error fetching today's schedules:", error?.message || error);
    return [];
  }
}

export async function getPricing(): Promise<NotionPricingEntry[]> {
  if (!PRICING_DB_ID) {
    console.warn("NOTION_PRICING_DB_ID not set");
    return [];
  }
  try {
    const response = await notion.databases.query({
      database_id: PRICING_DB_ID,
      page_size: 20,
    });
    return response.results.map((page: any) => parsePricing(page));
  } catch (error: any) {
    console.error("Error fetching pricing from Notion:", error?.message || error);
    return [];
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
}): Promise<string | null> {
  if (!QUOTES_DB_ID) {
    console.warn("NOTION_QUOTES_DB_ID not set, skipping Notion write");
    return null;
  }
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
      parent: { database_id: QUOTES_DB_ID },
      properties,
    });

    return response.id;
  } catch (error: any) {
    console.error("Error creating quote in Notion:", error?.message || error);
    return null;
  }
}

export async function discoverDatabaseProperties(dbId?: string): Promise<any> {
  const targetId = dbId || SCHEDULE_DB_ID;
  if (!targetId) return null;
  try {
    const db: any = await notion.databases.retrieve({ database_id: targetId });
    return db.properties;
  } catch (error: any) {
    console.error("Error discovering database:", error?.message || error);
    return null;
  }
}
