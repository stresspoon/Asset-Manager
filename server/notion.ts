import { Client } from "@notionhq/client";
import type { NotionConsultationSchedule } from "@shared/schema";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const SCHEDULE_DB_ID = process.env.NOTION_SCHEDULE_DB_ID || "";

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

function getNumber(property: any): number {
  if (!property || property.type !== "number") return 0;
  return property.number || 0;
}

function getCheckbox(property: any): boolean {
  if (!property || property.type !== "checkbox") return false;
  return property.checkbox || false;
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
    const statusPropertyName = "진행 상태";
    await notion.pages.update({
      page_id: id,
      properties: {
        [statusPropertyName]: {
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
    const notesPropertyName = "상담 내용 메모";
    await notion.pages.update({
      page_id: id,
      properties: {
        [notesPropertyName]: {
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

export async function discoverDatabaseProperties(): Promise<any> {
  if (!SCHEDULE_DB_ID) return null;
  try {
    const db: any = await notion.databases.retrieve({ database_id: SCHEDULE_DB_ID });
    return db.properties;
  } catch (error: any) {
    console.error("Error discovering database:", error?.message || error);
    return null;
  }
}
