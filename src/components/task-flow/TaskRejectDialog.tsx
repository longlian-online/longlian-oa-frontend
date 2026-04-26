import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TaskRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskName: string;
  onReject: (reason: string) => Promise<void>;
}

export function TaskRejectDialog({
  open,
  onOpenChange,
  taskName,
  onReject,
}: TaskRejectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;

    try {
      setLoading(true);
      await onReject(reason);
      setReason("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to reject:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>打回任务: {taskName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">
              打回理由 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="请输入打回理由，帮助执行人理解问题..."
              rows={4}
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="flex-1"
              disabled={loading || !reason.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                "确认打回"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
