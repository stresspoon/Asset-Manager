import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Receipt, AlertCircle } from "lucide-react";
import { formatCurrency, formatDate, getTierColor, getTierLabel } from "@/lib/format";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Quote } from "@shared/schema";
import { useState, useEffect } from "react";

export default function QuoteDetail() {
  const [, params] = useRoute("/quotes/:id");
  const quoteId = params?.id;
  const { toast } = useToast();

  const { data: quote, isLoading } = useQuery<Quote>({
    queryKey: ["/api/quotes", quoteId],
    enabled: !!quoteId,
  });

  const [tier, setTier] = useState("");
  const [baseFee, setBaseFee] = useState(0);
  const [onestop, setOnestop] = useState(false);
  const [discountRate, setDiscountRate] = useState(0);
  const [additionalNotes, setAdditionalNotes] = useState("");

  useEffect(() => {
    if (quote) {
      setTier(quote.recommendedTier);
      setBaseFee(quote.baseMonthlyFee);
      setOnestop(quote.onestopDiscount || false);
      setDiscountRate(quote.discountRate || 0);
      setAdditionalNotes(quote.additionalNotes || "");
    }
  }, [quote]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const finalFee = Math.round(baseFee * (1 - discountRate / 100));
      await apiRequest("PATCH", `/api/quotes/${quoteId}`, {
        recommendedTier: tier,
        baseMonthlyFee: baseFee,
        onestopDiscount: onestop,
        discountRate,
        finalMonthlyFee: finalFee,
        additionalNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "견적서가 수정되었습니다." });
    },
    onError: () => {
      toast({ title: "견적서 수정에 실패했습니다.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (onestop) {
      setDiscountRate(30);
    } else {
      setDiscountRate(0);
    }
  }, [onestop]);

  const finalFee = Math.round(baseFee * (1 - discountRate / 100));

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">견적서를 찾을 수 없습니다.</p>
        <Button variant="ghost" size="sm" className="mt-3" asChild>
          <Link href="/quotes">목록으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/quotes" data-testid="button-back-quotes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate" data-testid="text-quote-detail-title">{quote.title}</h1>
          <span className="text-xs text-muted-foreground">{formatDate(quote.createdAt ? new Date(quote.createdAt).toISOString() : "")} 산출</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              견적 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">서비스 등급</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger data-testid="select-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LITE">LITE (실속형)</SelectItem>
                  <SelectItem value="BASIC">BASIC (일반형)</SelectItem>
                  <SelectItem value="PREMIUM">PREMIUM (고급형)</SelectItem>
                  <SelectItem value="LUXURY">LUXURY (명품형)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">월 기본료 (원)</Label>
              <Input
                type="number"
                value={baseFee}
                onChange={(e) => setBaseFee(Number(e.target.value))}
                data-testid="input-base-fee"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="onestop-edit" className="text-xs text-muted-foreground font-medium cursor-pointer">
                원스톱 할인 적용
              </Label>
              <Switch
                id="onestop-edit"
                checked={onestop}
                onCheckedChange={setOnestop}
                data-testid="switch-onestop-edit"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">할인율 (%)</Label>
              <Input
                type="number"
                value={discountRate}
                onChange={(e) => setDiscountRate(Number(e.target.value))}
                min={0}
                max={100}
                data-testid="input-discount-rate"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">최종 월 요금</span>
              <span className="text-lg font-bold" data-testid="text-final-fee-edit">
                {formatCurrency(finalFee)}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">추가 옵션 설명</Label>
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="카드 수 추가, 플랫폼 정산 등 별도 안내..."
                className="resize-none min-h-[100px] text-sm"
                data-testid="textarea-additional-notes"
              />
            </div>

            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              data-testid="button-save-quote"
            >
              {updateMutation.isPending ? "저장 중..." : "견적서 수정"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">산출 요약</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground font-medium">추천 등급</span>
              <Badge className={getTierColor(tier)}>{getTierLabel(tier)}</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground font-medium">기본료</span>
              <span className="text-sm">{formatCurrency(baseFee)}</span>
            </div>
            {discountRate > 0 && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground font-medium">할인</span>
                <span className="text-sm text-emerald-600 dark:text-emerald-400">-{discountRate}%</span>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">최종 월 요금</span>
              <span className="text-lg font-bold">{formatCurrency(finalFee)}</span>
            </div>
            {quote.calculationBasis && (
              <>
                <Separator />
                <div className="rounded-md bg-muted/50 p-3">
                  <span className="text-[11px] text-muted-foreground font-medium block mb-1 uppercase tracking-wide">산출 근거</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">{quote.calculationBasis}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
