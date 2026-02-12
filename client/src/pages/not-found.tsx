import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-3">
            <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
            <h1 className="text-lg font-bold">페이지를 찾을 수 없습니다</h1>
            <p className="text-sm text-muted-foreground">
              요청하신 페이지가 존재하지 않습니다.
            </p>
            <Button variant="outline" size="sm" asChild className="mt-2">
              <Link href="/">대시보드로 이동</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
