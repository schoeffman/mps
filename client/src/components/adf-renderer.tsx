import React from "react";

interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  marks?: { type: string; attrs?: Record<string, string> }[];
  attrs?: Record<string, unknown>;
}

function renderNode(node: AdfNode, key: number): React.ReactNode {
  switch (node.type) {
    case "doc":
      return <>{(node.content ?? []).map((c, i) => renderNode(c, i))}</>;
    case "paragraph":
      return <p key={key} className="mb-2 last:mb-0">{(node.content ?? []).map((c, i) => renderNode(c, i))}</p>;
    case "heading": {
      const level = (node.attrs?.level as number) ?? 3;
      const Tag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
      return <Tag key={key} className="font-semibold mb-1">{(node.content ?? []).map((c, i) => renderNode(c, i))}</Tag>;
    }
    case "text": {
      let el: React.ReactNode = node.text ?? "";
      for (const mark of node.marks ?? []) {
        if (mark.type === "strong") el = <strong>{el}</strong>;
        else if (mark.type === "em") el = <em>{el}</em>;
        else if (mark.type === "code") el = <code className="bg-muted px-1 rounded text-xs">{el}</code>;
        else if (mark.type === "link" && mark.attrs?.href)
          el = <a href={mark.attrs.href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{el}</a>;
        else if (mark.type === "strike") el = <s>{el}</s>;
      }
      return <React.Fragment key={key}>{el}</React.Fragment>;
    }
    case "hardBreak":
      return <br key={key} />;
    case "bulletList":
      return <ul key={key} className="list-disc pl-5 mb-2">{(node.content ?? []).map((c, i) => renderNode(c, i))}</ul>;
    case "orderedList":
      return <ol key={key} className="list-decimal pl-5 mb-2">{(node.content ?? []).map((c, i) => renderNode(c, i))}</ol>;
    case "listItem":
      return <li key={key}>{(node.content ?? []).map((c, i) => renderNode(c, i))}</li>;
    case "blockquote":
      return <blockquote key={key} className="border-l-2 border-muted-foreground/30 pl-3 italic mb-2">{(node.content ?? []).map((c, i) => renderNode(c, i))}</blockquote>;
    case "codeBlock":
      return <pre key={key} className="bg-muted p-2 rounded text-xs overflow-x-auto mb-2"><code>{(node.content ?? []).map((c) => c.text ?? "").join("")}</code></pre>;
    case "rule":
      return <hr key={key} className="my-2" />;
    default:
      if (node.content) return <div key={key}>{node.content.map((c, i) => renderNode(c, i))}</div>;
      return null;
  }
}

export function AdfRenderer({ document }: { document: string }) {
  try {
    const doc = JSON.parse(document) as AdfNode;
    return <div className="text-sm">{renderNode(doc, 0)}</div>;
  } catch {
    return <p className="text-sm text-muted-foreground">Unable to render description</p>;
  }
}
