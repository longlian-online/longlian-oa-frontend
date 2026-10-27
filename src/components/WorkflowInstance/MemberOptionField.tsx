import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { listMemberOptions } from "@/api/member";
import { Input } from "@/components/ui/input";
import { useApiQuery } from "@/hooks/queries/useApiQuery";
import type { MemberOption } from "@/types/member";

interface MemberOptionFieldProps {
  id: string;
  listId: string;
  value: string;
  onChange: (userId: string) => void;
}

function memberLabel(member: MemberOption): string {
  return member.nickname || "未命名组员";
}

function placeMemberList(anchor: HTMLElement, list: HTMLElement): void {
  const rect = anchor.getBoundingClientRect();
  list.style.position = "fixed";
  list.style.top = `${rect.bottom + 4}px`;
  list.style.left = `${rect.left}px`;
  list.style.width = `${rect.width}px`;
}

function FloatingMemberList({
  anchor,
  listId,
  children,
}: {
  anchor: HTMLInputElement | null;
  listId: string;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!anchor || !list) return;
    const place = () => placeMemberList(anchor, list);
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor, children]);

  return createPortal(
    <div
      ref={listRef}
      id={listId}
      role="listbox"
      aria-label="组员"
      className="fixed z-[80] max-h-60 overflow-y-auto overscroll-contain rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
    >
      {children}
    </div>,
    document.body,
  );
}

export default function MemberOptionField({ id, listId, value, onChange }: MemberOptionFieldProps) {
  const [memberQuery, setMemberQuery] = useState("");
  const [memberListOpen, setMemberListOpen] = useState(false);
  const memberInputRef = useRef<HTMLInputElement>(null);
  const membersQuery = useApiQuery({
    key: ["memberOptions"],
    queryFn: () => listMemberOptions(),
    staleTime: 0,
  });
  const candidates = membersQuery.data ?? [];
  const selectedMember = candidates.find((candidate) => candidate.userId === value) ?? null;
  const normalizedQuery = memberQuery.trim().toLocaleLowerCase();
  const visibleMembers = candidates.filter((candidate) =>
    memberLabel(candidate).toLocaleLowerCase().includes(normalizedQuery),
  );

  return (
    <div className="flex flex-col gap-2 text-sm text-foreground">
      <label id={`${id}-label`} onClick={() => memberInputRef.current?.focus()}>
        组员
      </label>
      {membersQuery.isLoading ? (
        <p className="text-muted-foreground">正在加载组员...</p>
      ) : membersQuery.isError ? (
        <p role="alert" className="text-destructive">
          组员列表加载失败
        </p>
      ) : candidates.length === 0 ? (
        <p className="text-muted-foreground">当前组织没有可选组员</p>
      ) : (
        <div>
          <Input
            ref={memberInputRef}
            id={id}
            role="combobox"
            aria-labelledby={`${id}-label`}
            aria-expanded={memberListOpen}
            aria-controls={listId}
            aria-autocomplete="list"
            placeholder="搜索组员昵称"
            value={memberListOpen ? memberQuery : selectedMember ? memberLabel(selectedMember) : ""}
            onClick={() => {
              setMemberQuery("");
              setMemberListOpen(true);
            }}
            onChange={(event) => {
              setMemberQuery(event.target.value);
              setMemberListOpen(true);
            }}
            onBlur={() => setMemberListOpen(false)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                setMemberQuery("");
                setMemberListOpen(true);
              }
              if (event.key === "Escape") setMemberListOpen(false);
            }}
          />
          {memberListOpen && (
            <FloatingMemberList anchor={memberInputRef.current} listId={listId}>
              {visibleMembers.length === 0 ? (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">没有匹配的组员</p>
              ) : (
                visibleMembers.map((member) => (
                  <button
                    key={member.userId}
                    type="button"
                    role="option"
                    aria-selected={member.userId === value}
                    className="flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(member.userId);
                      setMemberQuery("");
                      setMemberListOpen(false);
                    }}
                  >
                    {memberLabel(member)}
                  </button>
                ))
              )}
            </FloatingMemberList>
          )}
        </div>
      )}
    </div>
  );
}
