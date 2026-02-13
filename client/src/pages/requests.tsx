import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, FileText, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { formatDate, getStatusColor, getServiceTypeLabel, getServiceTypeColor } from "@/lib/format";
import type { NotionConsultationRequest } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function Requests() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [businessTypeFilter, setBusinessTypeFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");

  const requestsQuery = useQuery<NotionConsultationRequest[]>({
    queryKey: ["/api/requests"],
  });
  const { data: requests, isLoading, isError, error, refetch } = requestsQuery;

  const filtered = (requests || []).filter((req) => {
    const matchSearch = !searchTerm || req.companyContact.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || req.consultationStatus === statusFilter;
    const matchType = businessTypeFilter === "all" || req.businessType === businessTypeFilter;
    const matchService = serviceTypeFilter === "all" || req.serviceType === serviceTypeFilter;
    return matchSearch && matchStatus && matchType && matchService;
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-bold" data-testid="text-page-title">상담 신청 목록</h1>
        <p className="text-sm text-muted-foreground mt-0.5">고객의 상담 신청을 조회하고 관리합니다.</p>
      </div>

      {isError && (
        <Alert variant="destructive" data-testid="alert-notion-error-requests">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Notion 연동 오류</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>{(error as Error)?.message || "상담 신청 목록을 불러오지 못했습니다."}</p>
            <div>
              <Button size="sm" variant="outline" onClick={() => refetch()} data-testid="button-retry-notion-requests">
                다시 시도
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="회사명/담당자/연락처 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card"
            data-testid="input-search"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-service-filter">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="서비스" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 서비스</SelectItem>
              <SelectItem value="accounting">경리아웃소싱</SelectItem>
              <SelectItem value="tax">일반 세무기장</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="신규접수">신규접수</SelectItem>
              <SelectItem value="상담중">상담중</SelectItem>
              <SelectItem value="완료">완료</SelectItem>
            </SelectContent>
          </Select>
          <Select value={businessTypeFilter} onValueChange={setBusinessTypeFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-type-filter">
              <SelectValue placeholder="사업자 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 유형</SelectItem>
              <SelectItem value="개인사업자">개인사업자</SelectItem>
              <SelectItem value="법인사업자">법인사업자</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">상담 신청이 없습니다.</p>
            <p className="text-xs text-muted-foreground mt-1">검색 조건을 변경해 보세요.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((req) => (
            <Link key={req.id} href={`/requests/${req.id}`}>
              <Card className="hover-elevate cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate" data-testid={`text-company-${req.id}`}>
                          {req.companyContact}
                        </span>
                        <Badge variant="secondary" className={`text-[10px] shrink-0 ${getServiceTypeColor(req.serviceType)}`}>
                          {getServiceTypeLabel(req.serviceType)}
                        </Badge>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {req.businessType}
                        </Badge>
                        {req.submissionComplete ? (
                          <Badge variant="secondary" className="text-xs shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            접수완료
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs shrink-0 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                            미완료
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{req.industry}</span>
                        <span className="text-xs text-muted-foreground">{req.annualRevenue}</span>
                        {req.monthlyVolume && (
                          <span className="text-xs text-muted-foreground">{req.monthlyVolume}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge variant="secondary" className={getStatusColor(req.consultationStatus)}>
                        {req.consultationStatus}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(req.submittedAt)}</span>
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
