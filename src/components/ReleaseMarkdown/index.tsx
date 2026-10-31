import type { ReactElement, ReactNode } from "react";

const INLINE =
  /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g;

export default function ReleaseMarkdown({ text }: { text?: string | null }): ReactElement | null {
  const blocks = parseBlocks(text ?? "");
  if (blocks.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 text-sm leading-6">
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; text: string }
  | { type: "quote"; text: string };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") {
      index += 1;
      continue;
    }
    if (line.startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", text: quote.join("\n") });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }
    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() !== "" && !blockStart(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }
  return blocks;
}

function blockStart(line: string): boolean {
  return (
    line.startsWith("```") ||
    /^(#{1,3})\s+/.test(line) ||
    /^>\s?/.test(line) ||
    /^[-*]\s+/.test(line) ||
    /^\d+\.\s+/.test(line)
  );
}

function renderBlock(block: Block, index: number): ReactElement {
  if (block.type === "heading") {
    const className = block.level === 1 ? "text-base font-semibold" : "text-sm font-semibold";
    return (
      <p key={index} className={className}>
        {renderInline(block.text, `${index}`)}
      </p>
    );
  }
  if (block.type === "list") {
    const ListTag = block.ordered ? "ol" : "ul";
    return (
      <ListTag
        key={index}
        className={block.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}
      >
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{renderInline(item, `${index}-${itemIndex}`)}</li>
        ))}
      </ListTag>
    );
  }
  if (block.type === "code") {
    return (
      <pre key={index} className="overflow-x-auto rounded-lg bg-muted p-3">
        <code>{block.text}</code>
      </pre>
    );
  }
  if (block.type === "quote") {
    return (
      <blockquote key={index} className="border-l-2 pl-3 text-muted-foreground">
        {renderInline(block.text, `${index}`)}
      </blockquote>
    );
  }
  return <p key={index}>{renderInline(block.text, `${index}`)}</p>;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let count = 0;
  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    const key = `${keyPrefix}-${count}`;
    if (match[0].startsWith("!")) {
      if (match[1]) nodes.push(match[1]);
    } else if (match[3] !== undefined) {
      const href = safeUrl(match[4] ?? "");
      nodes.push(
        href ? (
          <a key={key} href={href} target="_blank" rel="noreferrer">
            {match[3]}
          </a>
        ) : (
          match[0]
        ),
      );
    } else if (match[5] !== undefined) {
      nodes.push(<strong key={key}>{match[5]}</strong>);
    } else if (match[6] !== undefined) {
      nodes.push(<em key={key}>{match[6]}</em>);
    } else if (match[7] !== undefined) {
      nodes.push(
        <code key={key} className="rounded bg-muted px-1">
          {match[7]}
        </code>,
      );
    }
    last = start + match[0].length;
    count += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function safeUrl(value: string): string | null {
  const url = value.trim();
  if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) return url;
  return null;
}
