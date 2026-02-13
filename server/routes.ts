import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuoteSchema } from "@shared/schema";
import * as notion from "./notion";
import { calculateQuote, calculateTaxQuote } from "./quote-engine";
import type { NotionConsultationRequest, ServiceType } from "@shared/schema";

const sampleRequests: NotionConsultationRequest[] = [
  {
    id: "sample-1",
    serviceType: "accounting",
    companyContact: "(주)테크스타 / 김민수 대표 / 010-1234-5678",
    businessType: "법인사업자",
    industry: "IT/서비스",
    monthlyVolume: "월 거래 51~150건 / 세금계산서 6~20건",
    employeeRevenue: "직원 12명(4대보험) / 프리랜서 3명 / 월매출 약 8,000만원",
    bankCardCount: "통장 4개 / 법인카드 3개",
    cardUsageCount: "51~150건",
    cardCount: 3,
    taxInvoiceCount: "6~20건",
    annualRevenue: "10억~50억",
    formCompleted: true,
    reservationCompleted: true,
    submissionComplete: true,
    urgentIssues: ["경리 퇴사/공백 발생", "자금 누락/중복 지급 우려"],
    monthlyTask: "신규 경리 채용 전까지 급여계산 및 4대보험 신고 처리 필요",
    desiredServices: ["급여계산/4대보험 신고/급여명세서 발송", "월/분기/반기 결산 + 손익 분석", "자금일보 (매일 통장잔고 보고)"],
    platformSettlement: ["없음"],
    availableTime: "평일 오전 (10~12시)",
    specificRequest: "기존 경리 퇴사로 급하게 업무 인수인계가 필요합니다.",
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    consultationStatus: "신규접수",
  },
  {
    id: "sample-2",
    serviceType: "accounting",
    companyContact: "맛나푸드 / 박영희 사장 / 010-9876-5432",
    businessType: "개인사업자",
    industry: "음식점/프랜차이즈",
    monthlyVolume: "월 거래 50건 이하 / 세금계산서 5건 이하",
    employeeRevenue: "직원 3명(4대보험) / 아르바이트 5명 / 월매출 약 2,000만원",
    bankCardCount: "통장 2개 / 법인카드 1개",
    cardUsageCount: "50건 이하",
    cardCount: 1,
    taxInvoiceCount: "5건 이하",
    annualRevenue: "10억 이하",
    formCompleted: true,
    reservationCompleted: true,
    submissionComplete: true,
    urgentIssues: ["카드 품목이 엉망이라 원가를 모르겠음", "통장 잔고는 없는데 세금은 왜 많이 나오는지 모르겠음"],
    monthlyTask: "이번 달 부가세 신고 준비",
    desiredServices: ["세금계산서/현금영수증 발행", "카드품목 상세 분류", "실제 마진 계산"],
    platformSettlement: ["배달의민족/배달앱"],
    availableTime: "평일 오후 (14~17시)",
    specificRequest: "배달앱 정산 내역 정리가 너무 복잡해요.",
    submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    consultationStatus: "상담중",
  },
  {
    id: "sample-3",
    serviceType: "tax",
    companyContact: "(주)글로벌트레이드 / 이준호 이사 / 010-5555-1234",
    businessType: "법인사업자",
    industry: "제조/수출",
    monthlyVolume: "월 거래 151~400건 / 세금계산서 21~60건",
    employeeRevenue: "직원 45명(4대보험) / 월매출 약 5억원",
    bankCardCount: "통장 8개 / 법인카드 6개",
    cardUsageCount: "151~400건",
    cardCount: 6,
    taxInvoiceCount: "21~60건",
    annualRevenue: "50억~100억",
    formCompleted: true,
    reservationCompleted: false,
    submissionComplete: false,
    urgentIssues: ["투자 유치/대출 위해 정확한 재무제표 필요", "기존 경리 업무 과다로 인력 보강 필요"],
    monthlyTask: "투자 유치를 위한 재무제표 정리 및 감사 대비",
    desiredServices: ["월/분기/반기 결산 + 손익 분석", "미수/미지급 관리", "급여계산/4대보험 신고/급여명세서 발송"],
    platformSettlement: ["없음"],
    availableTime: "언제든 가능",
    specificRequest: "해외 수출 관련 세무 처리도 함께 상담 받고 싶습니다.",
    submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    consultationStatus: "신규접수",
  },
  {
    id: "sample-4",
    serviceType: "accounting",
    companyContact: "스마트몰 / 정수진 대표 / 010-3333-7777",
    businessType: "개인사업자",
    industry: "온라인몰/플랫폼",
    monthlyVolume: "월 거래 51~150건 / 세금계산서 6~20건",
    employeeRevenue: "직원 2명(4대보험) / 프리랜서 1명 / 월매출 약 4,000만원",
    bankCardCount: "통장 3개 / 법인카드 2개",
    cardUsageCount: "51~150건",
    cardCount: 2,
    taxInvoiceCount: "6~20건",
    annualRevenue: "10억 이하",
    formCompleted: true,
    reservationCompleted: true,
    submissionComplete: true,
    urgentIssues: ["급여/4대보험 처리가 너무 복잡함"],
    monthlyTask: "네이버 스마트스토어 정산 내역 정리",
    desiredServices: ["세금계산서/현금영수증 발행", "지출결의/자금 이체 대행", "카드품목 상세 분류"],
    platformSettlement: ["쿠팡 정산", "네이버 스마트스토어"],
    availableTime: "평일 오전 (10~12시)",
    specificRequest: "쿠팡, 네이버 스마트스토어 정산 자동화 가능한지 문의드립니다.",
    submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    consultationStatus: "완료",
  },
  {
    id: "sample-5",
    serviceType: "accounting",
    companyContact: "(주)메디헬스 / 최윤아 원장 / 010-8888-2222",
    businessType: "법인사업자",
    industry: "기타",
    monthlyVolume: "월 거래 401건 이상 / 세금계산서 61건 이상",
    employeeRevenue: "직원 80명(4대보험) / 월매출 약 12억원",
    bankCardCount: "통장 12개 / 법인카드 10개",
    cardUsageCount: "401건 이상",
    cardCount: 10,
    taxInvoiceCount: "61건 이상",
    annualRevenue: "100억 이상",
    formCompleted: true,
    reservationCompleted: true,
    submissionComplete: true,
    urgentIssues: ["기존 경리 업무 과다로 인력 보강 필요", "급여/4대보험 처리가 너무 복잡함"],
    monthlyTask: "연말정산 준비 및 퇴직금 정산",
    desiredServices: ["급여계산/4대보험 신고/급여명세서 발송", "근로계약서 및 취업규칙 작성/노무리스크 진단", "월/분기/반기 결산 + 손익 분석"],
    platformSettlement: ["없음"],
    availableTime: "토요일 및 평일 저녁 (사전조율)",
    specificRequest: "80명 급여 처리와 4대보험 신고를 완전히 아웃소싱하고 싶습니다.",
    submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    consultationStatus: "상담중",
  },
];

async function getRequestsData(): Promise<NotionConsultationRequest[]> {
  const notionRequests = await notion.getRequests();
  if (notionRequests.length > 0) {
    return notionRequests;
  }
  return sampleRequests;
}

async function getRequestByIdData(id: string): Promise<NotionConsultationRequest | null> {
  if (id.startsWith("sample-")) {
    return sampleRequests.find((r) => r.id === id) || null;
  }
  const request = await notion.getRequestById(id);
  if (request) return request;
  return sampleRequests.find((r) => r.id === id) || null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await storage.seedPricing();
  await storage.seedTaxPricing();

  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const requests = await getRequestsData();
      const newRequests = requests.filter((r) => r.consultationStatus === "신규접수").length;
      const inProgress = requests.filter((r) => r.consultationStatus === "상담중").length;
      const completed = requests.filter((r) => r.consultationStatus === "완료").length;
      const accountingRequests = requests.filter((r) => r.serviceType === "accounting").length;
      const taxRequests = requests.filter((r) => r.serviceType === "tax").length;

      let todaySchedules = 0;
      try {
        const today = await notion.getTodaySchedules();
        todaySchedules = today.length;
      } catch {}

      res.json({ newRequests, inProgress, completed, todaySchedules, accountingRequests, taxRequests });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/requests", async (req, res) => {
    try {
      const requests = await getRequestsData();
      const serviceType = req.query.serviceType as string | undefined;
      let filtered = requests;
      if (serviceType && serviceType !== "all") {
        filtered = requests.filter((r) => r.serviceType === serviceType);
      }
      if (req.query[0] === "recent") {
        const sorted = [...filtered].sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        return res.json(sorted.slice(0, 5));
      }
      res.json(filtered);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/requests/recent", async (_req, res) => {
    try {
      const requests = await getRequestsData();
      const sorted = [...requests].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      res.json(sorted.slice(0, 5));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/requests/:id", async (req, res) => {
    try {
      const request = await getRequestByIdData(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      res.json(request);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/requests/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      if (req.params.id.startsWith("sample-")) {
        const idx = sampleRequests.findIndex((r) => r.id === req.params.id);
        if (idx === -1) {
          return res.status(404).json({ message: "Request not found" });
        }
        sampleRequests[idx] = { ...sampleRequests[idx], consultationStatus: status };
        return res.json({ success: true });
      }
      const success = await notion.updateRequestStatus(req.params.id, status);
      if (!success) {
        return res.status(500).json({ message: "Failed to update status" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/requests/:id", async (req, res) => {
    try {
      if (req.params.id.startsWith("sample-")) {
        const idx = sampleRequests.findIndex((r) => r.id === req.params.id);
        if (idx === -1) {
          return res.status(404).json({ message: "Request not found" });
        }
        sampleRequests[idx] = { ...sampleRequests[idx], ...req.body };
        return res.json({ success: true });
      }
      const success = await notion.updateRequestFields(req.params.id, req.body);
      if (!success) {
        return res.status(500).json({ message: "Failed to update request" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/schedules", async (_req, res) => {
    try {
      const schedules = await notion.getSchedules();
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/schedules/today", async (_req, res) => {
    try {
      const schedules = await notion.getTodaySchedules();
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/schedules/available-slots", async (req, res) => {
    try {
      const date = req.query.date as string;
      if (!date) {
        return res.status(400).json({ message: "date query parameter required" });
      }
      const dayOfWeek = new Date(date).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return res.json([]);
      }
      const bookedTimes = await notion.getBookedSlots(date);
      const allSlots = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
      const slots = allSlots.map((time) => ({
        date,
        time,
        available: !bookedTimes.includes(time),
      }));
      res.json(slots);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/schedules/:id", async (req, res) => {
    try {
      const schedule = await notion.getScheduleById(req.params.id);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      res.json(schedule);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/schedules/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const success = await notion.updateScheduleStatus(req.params.id, status);
      if (!success) {
        return res.status(500).json({ message: "Failed to update status" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/schedules/:id/notes", async (req, res) => {
    try {
      const { notes } = req.body;
      const success = await notion.updateScheduleNotes(req.params.id, notes);
      if (!success) {
        return res.status(500).json({ message: "Failed to update notes" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/consult/submit", async (req, res) => {
    try {
      const data = req.body;
      const serviceType = data.serviceType || "accounting";
      const serviceLabel = serviceType === "tax" ? "일반세무기장" : "경리아웃소싱";

      const requestId = await notion.createRequest({
        companyContact: data.companyContact,
        phone: data.phone,
        businessType: data.businessType,
        industry: data.industry,
        monthlyVolume: data.monthlyVolume,
        employeeRevenue: data.employeeRevenue,
        bankCardCount: data.bankCardCount,
        cardUsageCount: data.cardUsageCount,
        cardCount: data.cardCount,
        taxInvoiceCount: data.taxInvoiceCount,
        annualRevenue: data.annualRevenue,
        urgentIssues: data.urgentIssues,
        monthlyTask: data.monthlyTask,
        desiredServices: data.desiredServices,
        platformSettlement: data.platformSettlement,
        specificRequest: data.specificRequest,
        serviceType,
      });

      const scheduledDatetime = `${data.scheduledDate}T${data.scheduledTime}:00+09:00`;
      const title = `${serviceLabel} 상담 - ${data.companyContact?.split("/")[0]?.trim() || "고객"}`;

      const scheduleId = await notion.createSchedule({
        title,
        scheduledAt: scheduledDatetime,
        serviceType,
        requestId: requestId || undefined,
      });

      res.json({
        success: true,
        requestId,
        scheduleId,
        message: "상담 신청이 완료되었습니다.",
      });
    } catch (error: any) {
      console.error("Error submitting consultation:", error);
      res.status(500).json({ message: error.message || "상담 신청 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/pricing", async (_req, res) => {
    try {
      const notionPricing = await notion.getPricing();
      if (notionPricing.length > 0) {
        return res.json(notionPricing);
      }
      const dbPricing = await storage.getServicePricing();
      res.json(dbPricing);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/pricing/tax", async (_req, res) => {
    try {
      const pricing = await storage.getTaxPricing();
      res.json(pricing);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/quotes", async (_req, res) => {
    try {
      const allQuotes = await storage.getQuotes();
      res.json(allQuotes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/quotes/by-request/:requestId", async (req, res) => {
    try {
      const quote = await storage.getQuoteByRequestId(req.params.requestId);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/quotes/calculate/:requestId", async (req, res) => {
    try {
      const request = await getRequestByIdData(req.params.requestId);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      if (request.serviceType === "tax") {
        const taxPricing = await storage.getTaxPricing();
        const result = calculateTaxQuote({
          annualRevenue: request.annualRevenue,
          businessType: request.businessType,
          companyContact: request.companyContact,
          industry: request.industry,
        }, taxPricing);
        return res.json(result);
      }
      const result = calculateQuote({
        annualRevenue: request.annualRevenue,
        monthlyVolume: request.monthlyVolume,
        taxInvoiceCount: request.taxInvoiceCount,
        companyContact: request.companyContact,
        industry: request.industry,
        cardCount: request.cardCount,
        cardUsageCount: request.cardUsageCount,
        platformSettlement: request.platformSettlement,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/quotes/:id", async (req, res) => {
    try {
      const quote = await storage.getQuoteById(Number(req.params.id));
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/quotes", async (req, res) => {
    try {
      const data = insertQuoteSchema.parse(req.body);
      const quote = await storage.createQuote(data);

      notion.createQuoteInNotion({
        title: data.title,
        recommendedTier: data.recommendedTier,
        baseMonthlyFee: data.baseMonthlyFee,
        onestopDiscount: data.onestopDiscount || false,
        discountRate: data.discountRate || 0,
        finalMonthlyFee: data.finalMonthlyFee,
        additionalNotes: data.additionalNotes || undefined,
        calculationBasis: data.calculationBasis || undefined,
        requestId: data.notionRequestId || undefined,
      }).catch((err) => {
        console.error("Failed to sync quote to Notion:", err);
      });

      if (data.notionRequestId && !data.notionRequestId.startsWith("sample-")) {
        const requests = await getRequestsData();
        const request = requests.find((r) => r.id === data.notionRequestId);
        if (request?.scheduleId) {
          notion.updateScheduleQuoteGenerated(request.scheduleId, true).catch((err) => {
            console.error("Failed to update schedule quote status:", err);
          });
        }
      }

      res.json(quote);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/quotes/:id", async (req, res) => {
    try {
      const quote = await storage.updateQuote(Number(req.params.id), req.body);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/quotes/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteQuote(Number(req.params.id));
      if (!deleted) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/notion/debug", async (req, res) => {
    try {
      const dbId = req.query.db as string | undefined;
      const props = await notion.discoverDatabaseProperties(dbId);
      res.json(props);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
