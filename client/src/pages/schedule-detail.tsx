import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CalendarDays, StickyNote, AlertCircle } from "lucide-react";
import { formatDateTime, getStatusColor } from "@/lib/format";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { NotionConsultationSchedule } from "@shared/schema";
import { useState, useEffect } from "react";

export default function ScheduleDetail() {
  const [, params] = useRoute("/schedules/:id");
  const scheduleId = params?.id;
  const { toast } = useToast();
  const [notes, setNotes] = useState("");

  const { data: schedule, isLoading } = useQuery<NotionConsultationSchedule>({
    queryKey: ["/api/schedules", scheduleId],
    enabled: !!scheduleId,
  });

  useEffect(() => {
    if (schedule?.consultationNotes) {
      setNotes(schedule.consultationNotes);
    }
  }, [schedule?.consultationNotes]);

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await apiRequest("PATCH", `/api/schedules/${scheduleId}/status`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "상태가 변경되었습니다." });
    },
    onError: () => {
      toast({ title: "상태 변경에 실패했습니다.", variant: "destructive" });
    },
  });

  const notesMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/schedules/${scheduleId}/notes`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({ title: "메모가 저장되었습니다." });
    },
    onError: () => {
      toast({ title: "메모 저장에 실패했습니다.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">일정을 찾을 수 없습니다.</p>
        <Button variant="ghost" size="sm" className="mt-3" asChild>
          <Link href="/schedules">목록으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/schedules" data-testid="button-back-schedules">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate" data-testid="text-schedule-detail-title">{schedule.title}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="secondary" className={getStatusColor(schedule.progressStatus)}>
              {schedule.progressStatus}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatDateTime(schedule.scheduledAt)}</span>
          </div>
        </div>
        <Select
          value={schedule.progressStatus}
          onValueChange={(val) => statusMutation.mutate(val)}
        >
          <SelectTrigger className="w-[100px]" data-testid="select-schedule-status-detail">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              일정 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground font-medium">예약 일시</span>
              <span className="text-sm">{formatDateTime(schedule.scheduledAt)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground font-medium">메모</span>
              <span className="text-sm">{schedule.memo || "-"}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground font-medium">견적 산출 여부</span>
              <span className="text-sm">{schedule.quoteGenerated ? "완료" : "미완료"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              상담 내용 메모
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="상담 내용, 고객 요구사항, 특이사항, 후속 조치 등을 기록하세요..."
              className="min-h-[200px] resize-none text-sm"
              data-testid="textarea-consultation-notes"
            />
            <Button
              size="sm"
              onClick={() => notesMutation.mutate()}
              disabled={notesMutation.isPending}
              data-testid="button-save-notes"
            >
              {notesMutation.isPending ? "저장 중..." : "메모 저장"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
