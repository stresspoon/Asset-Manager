export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "decimal",
  }).format(amount) + "원";
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "신규접수":
    case "예약됨":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "상담중":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "완료":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "취소":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "노쇼":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function getTierColor(tier: string): string {
  switch (tier) {
    case "LITE":
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
    case "BASIC":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "PREMIUM":
      return "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300";
    case "LUXURY":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function getTierLabel(tier: string): string {
  switch (tier) {
    case "LITE": return "LITE (실속형)";
    case "BASIC": return "BASIC (일반형)";
    case "PREMIUM": return "PREMIUM (고급형)";
    case "LUXURY": return "LUXURY (명품형)";
    default: return tier;
  }
}
