import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, List, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { formatDateTime, getStatusColor } from "@/lib/format";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { NotionConsultationSchedule } from "@shared/schema";

function CalendarView({ schedules }: { schedules: NotionConsultationSchedule[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(i);

  const getSchedulesForDay = (day: number) => {
    return schedules.filter((s) => {
      const d = new Date(s.scheduledAt);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" onClick={prevMonth} data-testid="button-prev-month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-base font-semibold" data-testid="text-calendar-month">
            {year}년 {month + 1}월
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={nextMonth} data-testid="button-next-month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
          {weekDays.map((d) => (
            <div key={d} className="bg-muted/50 p-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {days.map((day, idx) => {
            const daySchedules = day ? getSchedulesForDay(day) : [];
            return (
              <div
                key={idx}
                className={`bg-card min-h-[80px] sm:min-h-[100px] p-1.5 ${
                  !day ? "bg-muted/20" : ""
                } ${day && isToday(day) ? "ring-1 ring-primary/50 ring-inset" : ""}`}
              >
                {day && (
                  <>
                    <span className={`text-xs font-medium ${isToday(day) ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      {day}
                    </span>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {daySchedules.slice(0, 3).map((s) => (
                        <Link key={s.id} href={`/schedules/${s.id}`}>
                          <div
                            className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer ${getStatusColor(s.progressStatus)}`}
                            data-testid={`cal-event-${s.id}`}
                          >
                            {new Date(s.scheduledAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} {s.title}
                          </div>
                        </Link>
                      ))}
                      {daySchedules.length > 3 && (
                        <span className="text-[10px] text-muted-foreground px-1">+{daySchedules.length - 3}건</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Schedules() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const { data: schedules, isLoading } = useQuery<NotionConsultationSchedule[]>({
    queryKey: ["/api/schedules"],
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/schedules/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "일정 상태가 변경되었습니다." });
    },
    onError: () => {
      toast({ title: "상태 변경에 실패했습니다.", variant: "destructive" });
    },
  });

  const filtered = (schedules || []).filter((s) => {
    return statusFilter === "all" || s.progressStatus === statusFilter;
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-page-title">상담 일정 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">상담 일정을 캘린더 또는 목록으로 확인합니다.</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px]" data-testid="select-schedule-status">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="예약됨">예약됨</SelectItem>
            <SelectItem value="상담중">상담중</SelectItem>
            <SelectItem value="완료">완료</SelectItem>
            <SelectItem value="취소">취소</SelectItem>
            <SelectItem value="노쇼">노쇼</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="calendar">
          <TabsList>
            <TabsTrigger value="calendar" data-testid="tab-calendar">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
              캘린더
            </TabsTrigger>
            <TabsTrigger value="list" data-testid="tab-list">
              <List className="h-3.5 w-3.5 mr-1.5" />
              목록
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-4">
            <CalendarView schedules={filtered} />
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CalendarDays className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">일정이 없습니다.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {filtered
                  .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
                  .map((schedule) => (
                    <Card key={schedule.id} className="hover-elevate">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <Link href={`/schedules/${schedule.id}`} className="flex-1 min-w-0 cursor-pointer">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold truncate" data-testid={`text-schedule-title-${schedule.id}`}>
                                {schedule.title}
                              </span>
                              <Badge variant="secondary" className={`shrink-0 ${getStatusColor(schedule.progressStatus)}`}>
                                {schedule.progressStatus}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{formatDateTime(schedule.scheduledAt)}</span>
                            </div>
                            {schedule.memo && (
                              <p className="text-xs text-muted-foreground mt-1.5 truncate">{schedule.memo}</p>
                            )}
                          </Link>
                          <Select
                            value={schedule.progressStatus}
                            onValueChange={(val) => statusMutation.mutate({ id: schedule.id, status: val })}
                          >
                            <SelectTrigger className="w-[100px] shrink-0" data-testid={`select-schedule-status-${schedule.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="예약됨">예약됨</SelectItem>
                              <SelectItem value="상담중">상담중</SelectItem>
                              <SelectItem value="완료">완료</SelectItem>
                              <SelectItem value="취소">취소</SelectItem>
                              <SelectItem value="노쇼">노쇼</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
