import { Loader2 } from "lucide-react";

export default function CenteredLoading({ message }: { message: string }) {
  return (
    <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" />
      {message}
    </div>
  );
}
