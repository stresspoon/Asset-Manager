import type { Express } from "express";
import type { Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertQuoteSchema } from "@shared/schema";
import * as notion from "./notion";
import { calculateQuote, calculateTaxQuote } from "./quote-engine";
import type { NotionConsultationRequest } from "@shared/schema";

async function getRequestsData(): Promise<NotionConsultationRequest[]> {
  return notion.getRequests();
}

async function getRequestByIdData(id: string): Promise<NotionConsultationRequest | null> {
  return notion.getRequestById(id);
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function sendNotionIntegrationError(res: Response, error: unknown, message: string) {
  const details = resolveErrorMessage(error);
  return res.status(502).json({
    success: false,
    message,
    details,
  });
}

export async function setupRoutes(app: Express): Promise<void> {
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
      const today = await notion.getTodaySchedules();
      const todaySchedules = today.length;

      res.json({ newRequests, inProgress, completed, todaySchedules, accountingRequests, taxRequests });
    } catch (error: unknown) {
      if (notion.isNotionIntegrationError(error)) {
        return sendNotionIntegrationError(res, error, "Notion 연동 오류로 대시보드 통계를 불러오지 못했습니다.");
      }
      res.status(500).json({ message: resolveErrorMessage(error) });
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
    } catch (error: unknown) {
      if (notion.isNotionIntegrationError(error)) {
        return sendNotionIntegrationError(res, error, "Notion 연동 오류로 상담 신청 목록을 불러오지 못했습니다.");
      }
      res.status(500).json({ message: resolveErrorMessage(error) });
    }
  });

  app.get("/api/requests/recent", async (_req, res) => {
    try {
      const requests = await getRequestsData();
      const sorted = [...requests].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      res.json(sorted.slice(0, 5));
    } catch (error: unknown) {
      if (notion.isNotionIntegrationError(error)) {
        return sendNotionIntegrationError(res, error, "Notion 연동 오류로 최근 상담 신청을 불러오지 못했습니다.");
      }
      res.status(500).json({ message: resolveErrorMessage(error) });
    }
  });

  app.get("/api/requests/:id", async (req, res) => {
    try {
      const request = await getRequestByIdData(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      res.json(request);
    } catch (error: unknown) {
      if (notion.isNotionIntegrationError(error)) {
        return sendNotionIntegrationError(res, error, "Notion 연동 오류로 상담 신청 상세를 불러오지 못했습니다.");
      }
      res.status(500).json({ message: resolveErrorMessage(error) });
    }
  });

  app.patch("/api/requests/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const success = await notion.updateRequestStatus(req.params.id, status);
      if (!success) {
        return res.status(500).json({ message: "Failed to update status" });
      }
      res.json({ success: true });
    } catch (error: unknown) {
      if (notion.isNotionIntegrationError(error)) {
        return sendNotionIntegrationError(res, error, "Notion 연동 오류로 상담 상태를 변경하지 못했습니다.");
      }
      res.status(500).json({ message: resolveErrorMessage(error) });
    }
  });

  app.patch("/api/requests/:id", async (req, res) => {
    try {
      const success = await notion.updateRequestFields(req.params.id, req.body);
      if (!success) {
        return res.status(500).json({ message: "Failed to update request" });
      }
      res.json({ success: true });
    } catch (error: unknown) {
      if (notion.isNotionIntegrationError(error)) {
        return sendNotionIntegrationError(res, error, "Notion 연동 오류로 상담 신청을 수정하지 못했습니다.");
      }
      res.status(500).json({ message: resolveErrorMessage(error) });
    }
  });

  app.get("/api/schedules", async (_req, res) => {
    try {
      const schedules = await notion.getSchedules();
      res.json(schedules);
    } catch (error: unknown) {
      if (notion.isNotionIntegrationError(error)) {
        return sendNotionIntegrationError(res, error, "Notion 연동 오류로 상담 일정을 불러오지 못했습니다.");
      }
      res.status(500).json({ message: resolveErrorMessage(error) });
    }
  });

  app.get("/api/schedules/today", async (_req, res) => {
    try {
      const schedules = await notion.getTodaySchedules();
      res.json(schedules);
    } catch (error: unknown) {
      if (notion.isNotionIntegrationError(error)) {
        return sendNotionIntegrationError(res, error, "Notion 연동 오류로 오늘 일정을 불러오지 못했습니다.");
      }
      res.status(500).json({ message: resolveErrorMessage(error) });
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
    } catch (error: unknown) {
      if (notion.isNotionIntegrationError(error)) {
        return sendNotionIntegrationError(res, error, "Notion 연동 오류로 예약 가능 시간을 불러오지 못했습니다.");
      }
      res.status(500).json({ message: resolveErrorMessage(error) });
    }
  });

  app.get("/api/schedules/:id", async (req, res) => {
    try {
      const schedule = await notion.getScheduleById(req.params.id);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      res.json(schedule);
    } catch (error: unknown) {
      if (notion.isNotionIntegrationError(error)) {
        return sendNotionIntegrationError(res, error, "Notion 연동 오류로 일정 상세를 불러오지 못했습니다.");
      }
      res.status(500).json({ message: resolveErrorMessage(error) });
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
    } catch (error: unknown) {
      if (notion.isNotionIntegrationError(error)) {
        return sendNotionIntegrationError(res, error, "Notion 연동 오류로 일정 상태를 변경하지 못했습니다.");
      }
      res.status(500).json({ message: resolveErrorMessage(error) });
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
    } catch (error: unknown) {
      if (notion.isNotionIntegrationError(error)) {
        return sendNotionIntegrationError(res, error, "Notion 연동 오류로 일정 메모를 저장하지 못했습니다.");
      }
      res.status(500).json({ message: resolveErrorMessage(error) });
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
        employeeCount: data.employeeCount,
        currentAccountingMethod: data.currentAccountingMethod,
        taxConcerns: data.taxConcerns,
      });

      const scheduledDatetime = `${data.scheduledDate}T${data.scheduledTime}:00+09:00`;
      const title = `${serviceLabel} 상담 - ${data.companyContact?.split("/")[0]?.trim() || "고객"}`;

      const scheduleId = await notion.createSchedule({
        title,
        scheduledAt: scheduledDatetime,
        serviceType,
        requestId: requestId || undefined,
      });

      if (!requestId || !scheduleId) {
        return res.status(502).json({
          success: false,
          message: "Notion 연동 오류로 상담 신청을 저장하지 못했습니다.",
          details: "requestId 또는 scheduleId 생성 실패",
        });
      }

      res.json({
        success: true,
        requestId,
        scheduleId,
        message: "상담 신청이 완료되었습니다.",
      });
    } catch (error: unknown) {
      console.error("Error submitting consultation:", error);
      if (notion.isNotionIntegrationError(error)) {
        return res.status(502).json({
          success: false,
          message: "Notion 연동 오류로 상담 신청을 저장하지 못했습니다.",
          details: resolveErrorMessage(error),
        });
      }
      res.status(500).json({ success: false, message: resolveErrorMessage(error) || "상담 신청 중 오류가 발생했습니다." });
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
    } catch (error: unknown) {
      if (notion.isNotionIntegrationError(error)) {
        const dbPricing = await storage.getServicePricing();
        return res.json(dbPricing);
      }
      res.status(500).json({ message: resolveErrorMessage(error) });
    }
  });

  app.get("/api/pricing/tax", async (_req, res) => {
    try {
      const notionPricing = await notion.getPricingByService("tax");
      if (notionPricing.length > 0) {
        return res.json(notionPricing);
      }
      const pricing = await storage.getTaxPricing();
      res.json(pricing);
    } catch (error: unknown) {
      if (notion.isNotionIntegrationError(error)) {
        const pricing = await storage.getTaxPricing();
        return res.json(pricing);
      }
      res.status(500).json({ message: resolveErrorMessage(error) });
    }
  });

  app.get("/api/quotes", async (_req, res) => {
    try {
      const allQuotes = await storage.getQuotes();
      res.json(allQuotes);
    } catch (error: any) {
      res.status(500).json({ message: resolveErrorMessage(error) });
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
      res.status(500).json({ message: resolveErrorMessage(error) });
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
      res.status(500).json({ message: resolveErrorMessage(error) });
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
      res.status(500).json({ message: resolveErrorMessage(error) });
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
        serviceType: data.serviceType === "tax" ? "tax" : "accounting",
      }).catch((err) => {
        console.error("Failed to sync quote to Notion:", err);
      });

      if (data.notionRequestId) {
        try {
          const requests = await getRequestsData();
          const request = requests.find((r) => r.id === data.notionRequestId);
          if (request?.scheduleId) {
            notion.updateScheduleQuoteGenerated(request.scheduleId, true).catch((err) => {
              console.error("Failed to update schedule quote status:", err);
            });
          }
        } catch (err) {
          console.error("Failed to sync quote-generated state to Notion schedule:", err);
        }
      }

      res.json(quote);
    } catch (error: any) {
      res.status(400).json({ message: resolveErrorMessage(error) });
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
      res.status(500).json({ message: resolveErrorMessage(error) });
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
      res.status(500).json({ message: resolveErrorMessage(error) });
    }
  });

  app.get("/api/notion/debug", async (req, res) => {
    try {
      const dbId = req.query.db as string | undefined;
      const props = await notion.discoverDatabaseProperties(dbId);
      res.json(props);
    } catch (error: any) {
      res.status(500).json({ message: resolveErrorMessage(error) });
    }
  });

}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupRoutes(app);
  return httpServer;
}
