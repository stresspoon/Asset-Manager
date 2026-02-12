import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuoteSchema } from "@shared/schema";
import * as notion from "./notion";
import { calculateQuote } from "./quote-engine";
import type { NotionConsultationRequest } from "@shared/schema";

const sampleRequests: NotionConsultationRequest[] = [
  {
    id: "sample-1",
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

let requestsCache = [...sampleRequests];

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await storage.seedPricing();

  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const newRequests = requestsCache.filter((r) => r.consultationStatus === "신규접수").length;
      const inProgress = requestsCache.filter((r) => r.consultationStatus === "상담중").length;
      const completed = requestsCache.filter((r) => r.consultationStatus === "완료").length;

      let todaySchedules = 0;
      try {
        const today = await notion.getTodaySchedules();
        todaySchedules = today.length;
      } catch {}

      res.json({ newRequests, inProgress, completed, todaySchedules });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/requests", async (req, res) => {
    try {
      if (req.query[0] === "recent") {
        const sorted = [...requestsCache].sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        return res.json(sorted.slice(0, 5));
      }
      res.json(requestsCache);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/requests/recent", async (_req, res) => {
    try {
      const sorted = [...requestsCache].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      res.json(sorted.slice(0, 5));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/requests/:id", async (req, res) => {
    try {
      const request = requestsCache.find((r) => r.id === req.params.id);
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
      const idx = requestsCache.findIndex((r) => r.id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ message: "Request not found" });
      }
      requestsCache[idx] = { ...requestsCache[idx], consultationStatus: status };
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
      const request = requestsCache.find((r) => r.id === req.params.requestId);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
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

  app.get("/api/notion/debug", async (_req, res) => {
    try {
      const props = await notion.discoverDatabaseProperties();
      res.json(props);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
