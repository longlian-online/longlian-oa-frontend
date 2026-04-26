import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MetaFieldSchema } from "@/types/planning";

interface TaskSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskName: string;
  metaSchema?: string;
  onSubmit: (metadata: Record<string, unknown>) => Promise<void>;
}

export function TaskSubmitDialog({
  open,
  onOpenChange,
  taskName,
  metaSchema,
  onSubmit,
}: TaskSubmitDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  // 解析 metaSchema
  const fields: MetaFieldSchema[] = (() => {
    if (!metaSchema) return [];
    try {
      return JSON.parse(metaSchema) as MetaFieldSchema[];
    } catch {
      return [];
    }
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      await onSubmit({
        values: formData,
      });
      setFormData({});
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit:", error);
    } finally {
      setLoading(false);
    }
  }

  function renderField(field: MetaFieldSchema) {
    const value = (formData[field.name] as string) || "";

    switch (field.fieldType) {
      case "textarea":
        return (
          <Textarea
            placeholder={`请输入${field.name}`}
            rows={4}
            value={value}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData({ ...formData, [field.name]: e.target.value })
            }
            required={field.required}
          />
        );
      case "file":
        return (
          <div className="border-input bg-background flex h-24 items-center justify-center rounded-md border border-dashed">
            <span className="text-muted-foreground text-sm">文件上传功能待实现（TODO）</span>
          </div>
        );
      default:
        return (
          <Input
            placeholder={`请输入${field.name}`}
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, [field.name]: e.target.value })
            }
            required={field.required}
          />
        );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>提交任务: {taskName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">该任务无需提交额外信息</p>
          ) : (
            fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label>
                  {field.name}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {renderField(field)}
              </div>
            ))
          )}
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
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                "确认提交"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
