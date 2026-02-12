import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Users, CheckCircle, CalendarDays, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { formatDate, formatDateTime, getStatusColor } from "@/lib/format";
import type { DashboardStats, NotionConsultationRequest, NotionConsultationSchedule } from "@shared/schema";

function StatCard({ title, value, icon: Icon, color, loading }: {
  title: string;
  value: number;
  icon: typeof FileText;
  color: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-medium">{title}</span>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-2xl font-bold" data-testid={`text-stat-${title}`}>{value}</span>
            )}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentRequests, isLoading: requestsLoading } = useQuery<NotionConsultationRequest[]>({
    queryKey: ["/api/requests", "recent"],
  });

  const { data: todaySchedules, isLoading: schedulesLoading } = useQuery<NotionConsultationSchedule[]>({
    queryKey: ["/api/schedules", "today"],
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-page-title">대시보드</h1>
        <p className="text-sm text-muted-foreground mt-1">경리아웃소싱 상담 관리 현황을 한눈에 확인하세요.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="신규접수"
          value={stats?.newRequests ?? 0}
          icon={FileText}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          loading={statsLoading}
        />
        <StatCard
          title="상담중"
          value={stats?.inProgress ?? 0}
          icon={Users}
          color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          loading={statsLoading}
        />
        <StatCard
          title="완료"
          value={stats?.completed ?? 0}
          icon={CheckCircle}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          loading={statsLoading}
        />
        <StatCard
          title="오늘 예정 상담"
          value={stats?.todaySchedules ?? 0}
          icon={CalendarDays}
          color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base font-semibold">최근 접수</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/requests" data-testid="link-view-all-requests">
                전체 보기
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {requestsLoading ? (
              <div className="flex flex-col gap-2 px-4 pb-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : !recentRequests || recentRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">접수된 상담 신청이 없습니다.</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentRequests.slice(0, 5).map((req) => (
                  <Link
                    key={req.id}
                    href={`/requests/${req.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover-elevate"
                    data-testid={`link-request-${req.id}`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium truncate">{req.companyContact}</span>
                      <span className="text-xs text-muted-foreground">{req.industry} · {formatDate(req.submittedAt)}</span>
                    </div>
                    <Badge variant="secondary" className={`shrink-0 ${getStatusColor(req.consultationStatus)}`}>
                      {req.consultationStatus}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base font-semibold">오늘의 일정</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/schedules" data-testid="link-view-all-schedules">
                전체 보기
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {schedulesLoading ? (
              <div className="flex flex-col gap-2 px-4 pb-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : !todaySchedules || todaySchedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <CalendarDays className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">오늘 예정된 상담이 없습니다.</p>
              </div>
            ) : (
              <div className="divide-y">
                {todaySchedules.map((sch) => (
                  <Link
                    key={sch.id}
                    href={`/schedules/${sch.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover-elevate"
                    data-testid={`link-schedule-${sch.id}`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium truncate">{sch.title}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(sch.scheduledAt)}</span>
                    </div>
                    <Badge variant="secondary" className={`shrink-0 ${getStatusColor(sch.progressStatus)}`}>
                      {sch.progressStatus}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
