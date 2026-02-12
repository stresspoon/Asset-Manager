import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt } from "lucide-react";
import { Link } from "wouter";
import { formatDate, formatCurrency, getTierColor, getTierLabel } from "@/lib/format";
import type { Quote } from "@shared/schema";

export default function Quotes() {
  const { data: quotes, isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-bold" data-testid="text-page-title">견적서 관리</h1>
        <p className="text-sm text-muted-foreground mt-0.5">생성된 견적서를 조회하고 관리합니다.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-md" />
          ))}
        </div>
      ) : !quotes || quotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Receipt className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">생성된 견적서가 없습니다.</p>
            <p className="text-xs text-muted-foreground mt-1">상담 신청 상세 페이지에서 견적을 산출할 수 있습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {quotes.map((quote) => (
            <Link key={quote.id} href={`/quotes/${quote.id}`}>
              <Card className="hover-elevate cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold truncate block" data-testid={`text-quote-title-${quote.id}`}>
                        {quote.title}
                      </span>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <Badge className={`shrink-0 ${getTierColor(quote.recommendedTier)}`}>
                          {getTierLabel(quote.recommendedTier)}
                        </Badge>
                        {quote.onestopDiscount && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            원스톱 할인
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-sm font-bold" data-testid={`text-quote-fee-${quote.id}`}>
                        {formatCurrency(quote.finalMonthlyFee)}
                      </span>
                      <span className="text-xs text-muted-foreground">/월</span>
                      <span className="text-xs text-muted-foreground">{formatDate(quote.createdAt ? new Date(quote.createdAt).toISOString() : "")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
