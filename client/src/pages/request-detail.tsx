import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calculator, Building2, CreditCard, FileBarChart, AlertCircle, CheckCircle2, XCircle, Pencil, Save, X } from "lucide-react";
import { formatDate, formatCurrency, getStatusColor, getTierColor, getTierLabel, getServiceTypeLabel, getServiceTypeColor } from "@/lib/format";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { NotionConsultationRequest, Quote } from "@shared/schema";
import { useState, useEffect } from "react";

function InfoRow({ label, value, editMode, editValue, onEditChange, inputType = "text" }: {
  label: string;
  value: string | number | undefined;
  editMode?: boolean;
  editValue?: string;
  onEditChange?: (val: string) => void;
  inputType?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      {editMode && onEditChange ? (
        <Input
          type={inputType}
          value={editValue ?? ""}
          onChange={(e) => onEditChange(e.target.value)}
          className="h-8 text-sm"
          data-testid={`input-edit-${label}`}
        />
      ) : (
        <span className="text-sm" data-testid={`text-info-${label}`}>{value || "-"}</span>
      )}
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return <span className="text-sm text-muted-foreground">-</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <Badge key={i} variant="outline" className="text-xs font-normal">
          {item}
        </Badge>
      ))}
    </div>
  );
}

export default function RequestDetail() {
  const [, params] = useRoute("/requests/:id");
  const requestId = params?.id;
  const { toast } = useToast();
  const [onestopDiscount, setOnestopDiscount] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});

  const { data: request, isLoading } = useQuery<NotionConsultationRequest>({
    queryKey: ["/api/requests", requestId],
    enabled: !!requestId,
  });

  const { data: existingQuote } = useQuery<Quote>({
    queryKey: ["/api/quotes", "by-request", requestId],
    enabled: !!requestId,
  });

  const { data: autoQuote } = useQuery<{
    recommendedTier: string;
    baseMonthlyFee: number;
    calculationBasis: string;
  }>({
    queryKey: ["/api/quotes", "calculate", requestId],
    enabled: !!requestId,
  });

  useEffect(() => {
    if (request && editMode) {
      setEditData({
        companyContact: request.companyContact || "",
        employeeRevenue: request.employeeRevenue || "",
        bankCardCount: request.bankCardCount || "",
        cardCount: String(request.cardCount || 0),
        specificRequest: request.specificRequest || "",
        monthlyTask: request.monthlyTask || "",
      });
    }
  }, [request, editMode]);

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await apiRequest("PATCH", `/api/requests/${requestId}/status`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "상태가 변경되었습니다." });
    },
    onError: () => {
      toast({ title: "상태 변경에 실패했습니다.", variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/requests/${requestId}`, editData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", "calculate", requestId] });
      setEditMode(false);
      toast({ title: "수정이 완료되었습니다." });
    },
    onError: () => {
      toast({ title: "수정에 실패했습니다.", variant: "destructive" });
    },
  });

  const generateQuoteMutation = useMutation({
    mutationFn: async () => {
      if (!autoQuote || !request) throw new Error("Data missing");
      const discountRate = onestopDiscount ? 30 : 0;
      const finalFee = Math.round(autoQuote.baseMonthlyFee * (1 - discountRate / 100));
      const serviceLabel = request.serviceType === "tax" ? "세무기장" : "경리아웃소싱";
      await apiRequest("POST", "/api/quotes", {
        title: `${request.companyContact} ${serviceLabel} 견적서`,
        recommendedTier: autoQuote.recommendedTier,
        baseMonthlyFee: autoQuote.baseMonthlyFee,
        onestopDiscount,
        discountRate,
        finalMonthlyFee: finalFee,
        calculationBasis: autoQuote.calculationBasis,
        notionRequestId: requestId,
        serviceType: request.serviceType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "견적서가 생성되었습니다." });
    },
    onError: () => {
      toast({ title: "견적서 생성에 실패했습니다.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!existingQuote) return;
      await apiRequest("DELETE", `/api/quotes/${existingQuote.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "견적서가 삭제되었습니다." });
    },
    onError: () => {
      toast({ title: "견적서 삭제에 실패했습니다.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">상담 신청을 찾을 수 없습니다.</p>
        <Button variant="ghost" size="sm" className="mt-3" asChild>
          <Link href="/requests">목록으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  const discountRate = onestopDiscount ? 30 : 0;
  const finalFee = autoQuote ? Math.round(autoQuote.baseMonthlyFee * (1 - discountRate / 100)) : 0;
  const isTax = request.serviceType === "tax";

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/requests" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-lg font-bold truncate" data-testid="text-detail-title">{request.companyContact}</h1>
            <Badge variant="secondary" className={getServiceTypeColor(request.serviceType)} data-testid="badge-service-type">
              {getServiceTypeLabel(request.serviceType)}
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className={getStatusColor(request.consultationStatus)}>
              {request.consultationStatus}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatDate(request.submittedAt)} 접수</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditMode(false)}
                data-testid="button-cancel-edit"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                취소
              </Button>
              <Button
                size="sm"
                onClick={() => editMutation.mutate()}
                disabled={editMutation.isPending}
                data-testid="button-save-edit"
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                {editMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode(true)}
              data-testid="button-edit-request"
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              수정
            </Button>
          )}
          <Select
            value={request.consultationStatus}
            onValueChange={(val) => statusMutation.mutate(val)}
          >
            <SelectTrigger className="w-[120px]" data-testid="select-change-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="신규접수">신규접수</SelectItem>
              <SelectItem value="상담중">상담중</SelectItem>
              <SelectItem value="완료">완료</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5" data-testid="status-form-completed">
          {request.formCompleted ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground/40" />
          )}
          <span className={`text-xs font-medium ${request.formCompleted ? "text-foreground" : "text-muted-foreground"}`}>
            폼 작성 완료
          </span>
        </div>
        <div className="flex items-center gap-1.5" data-testid="status-reservation-completed">
          {request.reservationCompleted ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground/40" />
          )}
          <span className={`text-xs font-medium ${request.reservationCompleted ? "text-foreground" : "text-muted-foreground"}`}>
            예약 완료
          </span>
        </div>
        <div className="flex items-center gap-1.5" data-testid="status-submission-complete">
          {request.submissionComplete ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground/40" />
          )}
          <span className={`text-xs font-medium ${request.submissionComplete ? "text-foreground" : "text-muted-foreground"}`}>
            접수 완료
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                기본 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow
                  label="회사명/담당자/연락처"
                  value={request.companyContact}
                  editMode={editMode}
                  editValue={editData.companyContact}
                  onEditChange={(v) => setEditData({ ...editData, companyContact: v })}
                />
                <InfoRow label="사업자 유형" value={request.businessType} />
                <InfoRow label="주요 업종" value={request.industry} />
                <InfoRow label="연매출 규모" value={request.annualRevenue} />
                <InfoRow
                  label="직원 수 및 연매출"
                  value={request.employeeRevenue}
                  editMode={editMode}
                  editValue={editData.employeeRevenue}
                  onEditChange={(v) => setEditData({ ...editData, employeeRevenue: v })}
                />
                <InfoRow
                  label="통장/법인카드 개수"
                  value={request.bankCardCount}
                  editMode={editMode}
                  editValue={editData.bankCardCount}
                  onEditChange={(v) => setEditData({ ...editData, bankCardCount: v })}
                />
                {request.phone && <InfoRow label="전화번호" value={request.phone} />}
              </div>
            </CardContent>
          </Card>

          {!isTax && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  거래 및 세금 정보
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoRow label="월 거래량/세금계산서" value={request.monthlyVolume} />
                  <InfoRow label="카드 사용 건수 (월)" value={request.cardUsageCount} />
                  <InfoRow label="세금계산서 발행 건수 (월)" value={request.taxInvoiceCount} />
                  <InfoRow
                    label="카드 개수"
                    value={request.cardCount}
                    editMode={editMode}
                    editValue={editData.cardCount}
                    onEditChange={(v) => setEditData({ ...editData, cardCount: v })}
                    inputType="number"
                  />
                  <InfoRow label="상담 가능 시간대" value={request.availableTime} />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileBarChart className="h-4 w-4 text-muted-foreground" />
                상담 요청 상세
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <span className="text-[11px] text-muted-foreground font-medium mb-1 block uppercase tracking-wide">지금 가장 급한 문제</span>
                <TagList items={request.urgentIssues} />
              </div>
              <Separator />
              {editMode ? (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">이번 달 해결 과제</Label>
                  <Textarea
                    value={editData.monthlyTask || ""}
                    onChange={(e) => setEditData({ ...editData, monthlyTask: e.target.value })}
                    className="min-h-[60px] text-sm resize-none"
                    data-testid="textarea-edit-monthly-task"
                  />
                </div>
              ) : (
                <InfoRow label="이번 달 해결 과제" value={request.monthlyTask} />
              )}
              <Separator />
              <div>
                <span className="text-[11px] text-muted-foreground font-medium mb-1 block uppercase tracking-wide">원하는 서비스</span>
                <TagList items={request.desiredServices} />
              </div>
              {!isTax && (
                <>
                  <Separator />
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium mb-1 block uppercase tracking-wide">온라인 플랫폼 정산</span>
                    <TagList items={request.platformSettlement} />
                  </div>
                </>
              )}
              <Separator />
              {editMode ? (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">구체적 요청사항</Label>
                  <Textarea
                    value={editData.specificRequest || ""}
                    onChange={(e) => setEditData({ ...editData, specificRequest: e.target.value })}
                    className="min-h-[60px] text-sm resize-none"
                    data-testid="textarea-edit-specific-request"
                  />
                </div>
              ) : (
                <InfoRow label="구체적 요청사항" value={request.specificRequest} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                견적 자동 산출
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {autoQuote ? (
                <>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground font-medium">추천 등급</span>
                      <Badge className={`${getTierColor(autoQuote.recommendedTier)}`}>
                        {getTierLabel(autoQuote.recommendedTier)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground font-medium">
                        {isTax ? "월 기장료" : "월 기본료"}
                      </span>
                      <span className="text-sm font-semibold" data-testid="text-base-fee">
                        {autoQuote.baseMonthlyFee > 0
                          ? formatCurrency(autoQuote.baseMonthlyFee)
                          : "미정"}
                      </span>
                    </div>
                  </div>

                  {!isTax && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="onestop" className="text-xs text-muted-foreground font-medium cursor-pointer">
                          원스톱 할인 (30%)
                        </Label>
                        <Switch
                          id="onestop"
                          checked={onestopDiscount}
                          onCheckedChange={setOnestopDiscount}
                          data-testid="switch-onestop-discount"
                        />
                      </div>
                      {onestopDiscount && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground font-medium">할인율</span>
                          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">-30%</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">최종 월 요금</span>
                        <span className="text-lg font-bold text-foreground" data-testid="text-final-fee">
                          {formatCurrency(finalFee)}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="rounded-md bg-muted/50 p-3 mt-1">
                    <span className="text-[11px] text-muted-foreground font-medium block mb-1 uppercase tracking-wide">산출 근거</span>
                    <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-calculation-basis">
                      {autoQuote.calculationBasis}
                    </p>
                  </div>

                  {existingQuote ? (
                    <div className="flex flex-col gap-2 mt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/quotes/${existingQuote.id}`} data-testid="link-existing-quote">
                          견적서 보기
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate()}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 dark:text-red-400"
                        data-testid="button-delete-quote"
                      >
                        {deleteMutation.isPending ? "삭제 중..." : "견적서 삭제"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => generateQuoteMutation.mutate()}
                      disabled={generateQuoteMutation.isPending || (isTax && autoQuote.baseMonthlyFee === 0)}
                      data-testid="button-generate-quote"
                    >
                      {generateQuoteMutation.isPending ? "생성 중..." : "견적서 생성"}
                    </Button>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center py-4">
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
