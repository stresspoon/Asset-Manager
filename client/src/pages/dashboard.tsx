import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Users, CheckCircle, CalendarDays, ArrowRight, TrendingUp, BookOpen, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { formatDate, formatDateTime, getStatusColor, getServiceTypeLabel, getServiceTypeColor } from "@/lib/format";
import type { DashboardStats, NotionConsultationRequest, NotionConsultationSchedule } from "@shared/schema";

const statConfigs = [
  {
    key: "newRequests" as const,
    title: "신규접수",
    icon: FileText,
    gradient: "from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700",
    iconBg: "bg-blue-400/30",
  },
  {
    key: "inProgress" as const,
    title: "상담중",
    icon: Users,
    gradient: "from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600",
    iconBg: "bg-amber-400/30",
  },
  {
    key: "completed" as const,
    title: "완료",
    icon: CheckCircle,
    gradient: "from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600",
    iconBg: "bg-emerald-400/30",
  },
  {
    key: "todaySchedules" as const,
    title: "오늘 예정",
    icon: CalendarDays,
    gradient: "from-violet-500 to-purple-500 dark:from-violet-600 dark:to-purple-600",
    iconBg: "bg-violet-400/30",
  },
];

function StatCard({ title, value, icon: Icon, gradient, iconBg, loading }: {
  title: string;
  value: number;
  icon: typeof FileText;
  gradient: string;
  iconBg: string;
  loading: boolean;
}) {
  return (
    <div className={`rounded-md bg-gradient-to-br ${gradient} p-4 text-white`} data-testid={`card-stat-${title}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-white/80" data-testid={`text-stat-label-${title}`}>{title}</span>
          {loading ? (
            <div className="h-8 w-12 rounded bg-white/20 animate-pulse" />
          ) : (
            <span className="text-2xl font-bold" data-testid={`text-stat-${title}`}>{value}</span>
          )}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${iconBg}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
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
      <div className="rounded-md bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 dark:from-indigo-800 dark:via-blue-800 dark:to-cyan-700 p-6 text-white">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold" data-testid="text-page-title">
              상담 관리 대시보드
            </h1>
            <p className="text-sm text-white/80 max-w-lg">
              천지세무법인 경리아웃소싱 / 세무기장 상담 현황을 한눈에 확인하고 효율적으로 관리하세요.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-white/60" />
              <span className="text-sm text-white/70 font-medium" data-testid="text-total-count">
                총 {stats ? stats.newRequests + stats.inProgress + stats.completed : 0}건 관리 중
              </span>
            </div>
            {stats && (stats.accountingRequests > 0 || stats.taxRequests > 0) && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/60 flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  경리아웃소싱 {stats.accountingRequests}건
                </span>
                <span className="text-xs text-white/60 flex items-center gap-1">
                  <Calculator className="h-3 w-3" />
                  세무기장 {stats.taxRequests}건
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statConfigs.map((config) => (
          <StatCard
            key={config.key}
            title={config.title}
            value={stats?.[config.key] ?? 0}
            icon={config.icon}
            gradient={config.gradient}
            iconBg={config.iconBg}
            loading={statsLoading}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-sm font-semibold">최근 접수</CardTitle>
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{req.companyContact}</span>
                        <Badge variant="secondary" className={`text-[10px] ${getServiceTypeColor(req.serviceType)}`}>
                          {getServiceTypeLabel(req.serviceType)}
                        </Badge>
                      </div>
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
            <CardTitle className="text-sm font-semibold">오늘의 일정</CardTitle>
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
