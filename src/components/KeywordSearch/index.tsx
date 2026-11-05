import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface KeywordSearchProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}

export default function KeywordSearch({
  value,
  placeholder,
  onChange,
  onSearch,
}: KeywordSearchProps) {
  return (
    <>
      <div className="relative w-64 max-w-full">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          placeholder={placeholder}
          className="pl-9"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSearch();
          }}
        />
      </div>
      <Button type="button" variant="outline" onClick={onSearch}>
        搜索
      </Button>
    </>
  );
}
