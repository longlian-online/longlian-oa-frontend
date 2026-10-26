import { Input } from "@/components/ui/input";

interface InviteExpiryFieldProps {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

function currentMinute(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function InviteExpiryField({
  value,
  disabled = false,
  onChange,
}: InviteExpiryFieldProps): React.JSX.Element {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-foreground">到期时间</span>
      <Input
        type="datetime-local"
        lang="zh-CN"
        value={value}
        min={currentMinute()}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="text-muted-foreground">邀请码在该时间后失效。</span>
    </label>
  );
}
