import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, ArrowRight, ArrowLeft, CalendarDays, CheckCircle2, Clock, Phone } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { ServiceType, ScheduleSlot } from "@shared/schema";

const STORAGE_KEY_PREFIX = "consult_form_";
const STORAGE_EXPIRY = 30 * 60 * 1000;

function useFormPersistence(serviceType: ServiceType) {
  const key = STORAGE_KEY_PREFIX + serviceType;

  const loadSaved = useCallback((): Record<string, any> | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed._savedAt > STORAGE_EXPIRY) {
        localStorage.removeItem(key);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, [key]);

  const save = useCallback((data: Record<string, any>) => {
    try {
      localStorage.setItem(key, JSON.stringify({ ...data, _savedAt: Date.now() }));
    } catch {}
  }, [key]);

  const clear = useCallback(() => {
    localStorage.removeItem(key);
  }, [key]);

  return { loadSaved, save, clear };
}

function formatPhoneNumber(value: string): string {
  const nums = value.replace(/\D/g, "");
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
}

function resolveMutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "상담 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
}

const ACCOUNTING_SERVICES = [
  "급여계산/4대보험 신고/급여명세서 발송",
  "세금계산서/현금영수증 발행",
  "월/분기/반기 결산 + 손익 분석",
  "자금일보 (매일 통장잔고 보고)",
  "카드품목 상세 분류",
  "지출결의/자금 이체 대행",
  "미수/미지급 관리",
  "근로계약서 및 취업규칙 작성/노무리스크 진단",
  "실제 마진 계산",
];

const TAX_SERVICES = [
  "부가가치세 신고",
  "종합소득세/법인세 신고",
  "원천징수 신고",
  "4대보험 신고",
  "세무 조정/경정 청구",
  "기장대리 (장부 작성)",
  "세무 상담/절세 컨설팅",
];

const URGENT_ISSUES = [
  "경리 퇴사/공백 발생",
  "자금 누락/중복 지급 우려",
  "카드 품목이 엉망이라 원가를 모르겠음",
  "통장 잔고는 없는데 세금은 왜 많이 나오는지 모르겠음",
  "급여/4대보험 처리가 너무 복잡함",
  "투자 유치/대출 위해 정확한 재무제표 필요",
  "기존 경리 업무 과다로 인력 보강 필요",
];

const TAX_CONCERNS = [
  "세금 신고 기한 임박",
  "세무조사 대비 필요",
  "절세 방안 상담",
  "사업 확장에 따른 세무 전략",
  "기존 세무사 변경 검토",
  "창업 초기 세무 설정",
];

const PLATFORMS = [
  "없음",
  "배달의민족/배달앱",
  "쿠팡 정산",
  "네이버 스마트스토어",
  "카카오 선물하기",
  "기타 온라인 플랫폼",
];

interface StepProps {
  formData: Record<string, any>;
  onChange: (key: string, value: any) => void;
  serviceType: ServiceType;
}

function Step1BasicInfo({ formData, onChange, serviceType }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm font-medium">
          회사명 / 담당자 / 연락처 <span className="text-red-500">*</span>
        </Label>
        <Input
          placeholder="예: (주)테크스타 / 김민수 대표"
          value={formData.companyContact || ""}
          onChange={(e) => onChange("companyContact", e.target.value)}
          data-testid="input-company-contact"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          전화번호 <span className="text-red-500">*</span>
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground shrink-0 font-medium">+82</span>
          <Input
            placeholder="010-1234-5678"
            value={formData.phone || ""}
            onChange={(e) => onChange("phone", formatPhoneNumber(e.target.value))}
            maxLength={13}
            data-testid="input-phone"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium">
            사업자 유형 <span className="text-red-500">*</span>
          </Label>
          <Select value={formData.businessType || ""} onValueChange={(v) => onChange("businessType", v)}>
            <SelectTrigger data-testid="select-business-type">
              <SelectValue placeholder="선택하세요" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="개인사업자">개인사업자</SelectItem>
              <SelectItem value="법인사업자">법인사업자</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium">
            주요 업종 <span className="text-red-500">*</span>
          </Label>
          <Select value={formData.industry || ""} onValueChange={(v) => onChange("industry", v)}>
            <SelectTrigger data-testid="select-industry">
              <SelectValue placeholder="선택하세요" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="음식점/프랜차이즈">음식점/프랜차이즈</SelectItem>
              <SelectItem value="온라인몰/플랫폼">온라인몰/플랫폼</SelectItem>
              <SelectItem value="제조/수출">제조/수출</SelectItem>
              <SelectItem value="IT/서비스">IT/서비스</SelectItem>
              <SelectItem value="도소매/유통">도소매/유통</SelectItem>
              <SelectItem value="기타">기타</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-sm font-medium">
          연매출 규모 <span className="text-red-500">*</span>
        </Label>
        <Select value={formData.annualRevenue || ""} onValueChange={(v) => onChange("annualRevenue", v)}>
          <SelectTrigger data-testid="select-annual-revenue">
            <SelectValue placeholder="선택하세요" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10억 이하">10억 이하</SelectItem>
            <SelectItem value="10억~50억">10억~50억</SelectItem>
            <SelectItem value="50억~100억">50억~100억</SelectItem>
            <SelectItem value="100억 이상">100억 이상</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {serviceType === "accounting" && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">직원 수 및 연매출</Label>
            <Input
              placeholder="예: 직원 12명(4대보험) / 프리랜서 3명 / 월매출 약 8,000만원"
              value={formData.employeeRevenue || ""}
              onChange={(e) => onChange("employeeRevenue", e.target.value)}
              data-testid="input-employee-revenue"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">월 거래량/세금계산서</Label>
              <Select value={formData.monthlyVolume || ""} onValueChange={(v) => onChange("monthlyVolume", v)}>
                <SelectTrigger data-testid="select-monthly-volume">
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="월 거래 50건 이하 / 세금계산서 5건 이하">50건 이하 / 세금계산서 5건 이하</SelectItem>
                  <SelectItem value="월 거래 51~150건 / 세금계산서 6~20건">51~150건 / 세금계산서 6~20건</SelectItem>
                  <SelectItem value="월 거래 151~400건 / 세금계산서 21~60건">151~400건 / 세금계산서 21~60건</SelectItem>
                  <SelectItem value="월 거래 401건 이상 / 세금계산서 61건 이상">401건 이상 / 세금계산서 61건 이상</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">카드 사용 건수 (월)</Label>
              <Select value={formData.cardUsageCount || ""} onValueChange={(v) => onChange("cardUsageCount", v)}>
                <SelectTrigger data-testid="select-card-usage">
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50건 이하">50건 이하</SelectItem>
                  <SelectItem value="51~150건">51~150건</SelectItem>
                  <SelectItem value="151~400건">151~400건</SelectItem>
                  <SelectItem value="401건 이상">401건 이상</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">통장/법인카드 개수</Label>
              <Input
                placeholder="예: 통장 4개 / 법인카드 3개"
                value={formData.bankCardCount || ""}
                onChange={(e) => onChange("bankCardCount", e.target.value)}
                data-testid="input-bank-card-count"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">세금계산서 발행 건수 (월)</Label>
              <Select value={formData.taxInvoiceCount || ""} onValueChange={(v) => onChange("taxInvoiceCount", v)}>
                <SelectTrigger data-testid="select-tax-invoice">
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5건 이하">5건 이하</SelectItem>
                  <SelectItem value="6~20건">6~20건</SelectItem>
                  <SelectItem value="21~60건">21~60건</SelectItem>
                  <SelectItem value="61건 이상">61건 이상</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {serviceType === "tax" && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">직원 수</Label>
            <Input
              placeholder="예: 직원 5명"
              value={formData.employeeCount || ""}
              onChange={(e) => onChange("employeeCount", e.target.value)}
              data-testid="input-employee-count"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">현재 기장 방식</Label>
            <Select value={formData.currentAccountingMethod || ""} onValueChange={(v) => onChange("currentAccountingMethod", v)}>
              <SelectTrigger data-testid="select-accounting-method">
                <SelectValue placeholder="선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="세무사 기장">세무사 기장</SelectItem>
                <SelectItem value="직접 기장">직접 기장</SelectItem>
                <SelectItem value="기장 없음 (신규)">기장 없음 (신규)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}

function Step2Services({ formData, onChange, serviceType }: StepProps) {
  const services = serviceType === "accounting" ? ACCOUNTING_SERVICES : TAX_SERVICES;
  const issues = serviceType === "accounting" ? URGENT_ISSUES : TAX_CONCERNS;
  const issueKey = serviceType === "accounting" ? "urgentIssues" : "taxConcerns";
  const selectedServices = formData.desiredServices || [];
  const selectedIssues = formData[issueKey] || [];

  const toggleService = (svc: string) => {
    const current = [...selectedServices];
    const idx = current.indexOf(svc);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(svc);
    onChange("desiredServices", current);
  };

  const toggleIssue = (issue: string) => {
    const current = [...selectedIssues];
    const idx = current.indexOf(issue);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(issue);
    onChange(issueKey, current);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">
          {serviceType === "accounting" ? "원하는 서비스" : "필요한 세무 서비스"}
        </Label>
        <div className="grid grid-cols-1 gap-2">
          {services.map((svc) => (
            <label
              key={svc}
              className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover-elevate"
              data-testid={`checkbox-service-${svc}`}
            >
              <Checkbox
                checked={selectedServices.includes(svc)}
                onCheckedChange={() => toggleService(svc)}
              />
              <span className="text-sm">{svc}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">
          {serviceType === "accounting" ? "지금 가장 급한 문제" : "세무 관련 고민"}
        </Label>
        <div className="grid grid-cols-1 gap-2">
          {issues.map((issue) => (
            <label
              key={issue}
              className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover-elevate"
              data-testid={`checkbox-issue-${issue}`}
            >
              <Checkbox
                checked={selectedIssues.includes(issue)}
                onCheckedChange={() => toggleIssue(issue)}
              />
              <span className="text-sm">{issue}</span>
            </label>
          ))}
        </div>
      </div>

      {serviceType === "accounting" && (
        <div className="flex flex-col gap-3">
          <Label className="text-sm font-medium">온라인 플랫폼 정산</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PLATFORMS.map((platform) => {
              const selectedPlatforms = formData.platformSettlement || [];
              return (
                <label
                  key={platform}
                  className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover-elevate"
                  data-testid={`checkbox-platform-${platform}`}
                >
                  <Checkbox
                    checked={selectedPlatforms.includes(platform)}
                    onCheckedChange={() => {
                      const current = [...selectedPlatforms];
                      const idx = current.indexOf(platform);
                      if (idx >= 0) current.splice(idx, 1);
                      else current.push(platform);
                      onChange("platformSettlement", current);
                    }}
                  />
                  <span className="text-sm">{platform}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label className="text-sm font-medium">
          {serviceType === "accounting" ? "이번 달 해결 과제" : "추가 요청사항"}
        </Label>
        <Textarea
          placeholder={serviceType === "accounting" ? "이번 달 급하게 처리해야 할 업무를 적어주세요..." : "세무 관련 추가 요청사항을 적어주세요..."}
          value={formData.monthlyTask || formData.specificRequest || ""}
          onChange={(e) => onChange(serviceType === "accounting" ? "monthlyTask" : "specificRequest", e.target.value)}
          className="min-h-[100px] resize-none text-sm"
          data-testid="textarea-additional-request"
        />
      </div>

      {serviceType === "accounting" && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium">구체적 요청사항</Label>
          <Textarea
            placeholder="기타 요청사항이 있으시면 적어주세요..."
            value={formData.specificRequest || ""}
            onChange={(e) => onChange("specificRequest", e.target.value)}
            className="min-h-[80px] resize-none text-sm"
            data-testid="textarea-specific-request"
          />
        </div>
      )}
    </div>
  );
}

function Step3Schedule({ formData, onChange }: StepProps) {
  const [selectedDate, setSelectedDate] = useState(formData.scheduledDate || "");

  const { data: slots, isLoading: slotsLoading } = useQuery<ScheduleSlot[]>({
    queryKey: ["/api/schedules/available-slots", selectedDate],
    enabled: !!selectedDate,
  });

  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 1);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    onChange("scheduledDate", date);
    onChange("scheduledTime", "");
  };

  const generateDateOptions = () => {
    const dates: { value: string; label: string; disabled: boolean }[] = [];
    const d = new Date(minDate);
    while (d <= maxDate) {
      const dayOfWeek = d.getDay();
      const dateStr = d.toISOString().split("T")[0];
      const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
      const label = `${d.getMonth() + 1}/${d.getDate()} (${dayNames[dayOfWeek]})`;
      dates.push({
        value: dateStr,
        label,
        disabled: dayOfWeek === 0 || dayOfWeek === 6,
      });
      d.setDate(d.getDate() + 1);
    }
    return dates;
  };

  const dateOptions = generateDateOptions();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">
          상담 날짜 선택 <span className="text-red-500">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">평일만 예약 가능합니다 (토/일 제외)</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {dateOptions.filter((d) => !d.disabled).slice(0, 15).map((opt) => (
            <Button
              key={opt.value}
              variant={selectedDate === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleDateChange(opt.value)}
              data-testid={`button-date-${opt.value}`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div className="flex flex-col gap-3">
          <Label className="text-sm font-medium">
            상담 시간 선택 <span className="text-red-500">*</span>
          </Label>
          {slotsLoading ? (
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {(slots || []).map((slot) => (
                <Button
                  key={slot.time}
                  variant={formData.scheduledTime === slot.time ? "default" : "outline"}
                  size="sm"
                  disabled={!slot.available}
                  onClick={() => onChange("scheduledTime", slot.time)}
                  className={!slot.available ? "opacity-40 line-through" : ""}
                  data-testid={`button-time-${slot.time}`}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {slot.time}
                </Button>
              ))}
            </div>
          )}
          {slots && slots.every((s) => !s.available) && (
            <p className="text-xs text-red-500">이 날짜에 예약 가능한 시간이 없습니다. 다른 날짜를 선택해주세요.</p>
          )}
        </div>
      )}
    </div>
  );
}

function SuccessScreen({ formData, serviceType }: { formData: Record<string, any>; serviceType: ServiceType }) {
  const serviceLabel = serviceType === "accounting" ? "경리아웃소싱" : "일반 세무기장";
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2" data-testid="text-success-title">상담 신청이 완료되었습니다</h2>
        <p className="text-sm text-muted-foreground">빠른 시일 내에 연락드리겠습니다.</p>
      </div>
      <Card className="w-full max-w-md">
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex justify-between gap-2">
            <span className="text-xs text-muted-foreground">서비스 유형</span>
            <Badge variant="secondary">{serviceLabel}</Badge>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-xs text-muted-foreground">회사명/담당자</span>
            <span className="text-sm font-medium">{formData.companyContact}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-xs text-muted-foreground">상담 일시</span>
            <span className="text-sm font-medium">{formData.scheduledDate} {formData.scheduledTime}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-xs text-muted-foreground">연락처</span>
            <span className="text-sm font-medium">{formData.phone}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConsultForm() {
  const [matchAccounting] = useRoute("/consult/accounting");
  const [matchTax] = useRoute("/consult/tax");
  const serviceType: ServiceType = matchTax ? "tax" : "accounting";
  const serviceLabel = serviceType === "accounting" ? "경리아웃소싱" : "일반 세무기장";

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const { loadSaved, save, clear } = useFormPersistence(serviceType);

  useEffect(() => {
    const saved = loadSaved();
    if (saved) {
      const { _savedAt, ...data } = saved;
      setFormData(data);
      if (data._step) setStep(data._step);
    }
  }, [loadSaved]);

  const handleChange = useCallback((key: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      save({ ...next, _step: step });
      return next;
    });
  }, [save, step]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/consult/submit", {
        ...formData,
        serviceType,
      });
    },
    onSuccess: () => {
      clear();
      setSubmitted(true);
    },
  });
  const submitErrorMessage = resolveMutationErrorMessage(submitMutation.error);

  const canProceedStep1 = formData.companyContact && formData.phone && formData.businessType && formData.industry && formData.annualRevenue;
  const canProceedStep3 = formData.scheduledDate && formData.scheduledTime;

  const totalSteps = 3;

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <SuccessScreen formData={formData} serviceType={serviceType} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold">천지세무법인</span>
          </div>
          <h1 className="text-xl font-bold mb-1" data-testid="text-form-title">
            {serviceLabel} 상담 신청
          </h1>
          <p className="text-sm text-muted-foreground">
            상담 정보를 입력하시고 원하시는 일정을 선택해주세요.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  s === step
                    ? "bg-primary text-primary-foreground"
                    : s < step
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground"
                }`}
                data-testid={`step-indicator-${s}`}
              >
                {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < totalSteps && (
                <div className={`w-8 h-0.5 ${s < step ? "bg-emerald-500" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {step === 1 && (
                <>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  기본 정보 입력
                </>
              )}
              {step === 2 && (
                <>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  서비스 선택
                </>
              )}
              {step === 3 && (
                <>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  상담 일정 예약
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <Step1BasicInfo formData={formData} onChange={handleChange} serviceType={serviceType} />
            )}
            {step === 2 && (
              <Step2Services formData={formData} onChange={handleChange} serviceType={serviceType} />
            )}
            {step === 3 && (
              <Step3Schedule formData={formData} onChange={handleChange} serviceType={serviceType} />
            )}

            <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t">
              {step > 1 ? (
                <Button
                  variant="ghost"
                  onClick={() => { setStep(step - 1); save({ ...formData, _step: step - 1 }); }}
                  data-testid="button-prev-step"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  이전
                </Button>
              ) : (
                <div />
              )}

              {step < totalSteps ? (
                <Button
                  onClick={() => { setStep(step + 1); save({ ...formData, _step: step + 1 }); }}
                  disabled={step === 1 && !canProceedStep1}
                  data-testid="button-next-step"
                >
                  다음
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={!canProceedStep3 || submitMutation.isPending}
                  data-testid="button-submit-form"
                >
                  {submitMutation.isPending ? "제출 중..." : "상담 신청 완료"}
                </Button>
              )}
            </div>

            {submitMutation.isError && (
              <p className="text-xs text-red-500 mt-2 text-center">
                {submitErrorMessage}
              </p>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          입력하신 정보는 상담 목적으로만 사용됩니다.
        </p>
      </div>
    </div>
  );
}
