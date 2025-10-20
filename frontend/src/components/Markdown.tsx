"use client";

import React from "react";
import styles from "./Markdown.module.css";

type MarkdownProps = {
  children: string;
  className?: string;
};

function escapeHtml(input: string) {
  return input
    .replaceAll(/&/g, "&amp;")
    .replaceAll(/</g, "&lt;")
    .replaceAll(/>/g, "&gt;");
}

function sanitizeUrl(url: string) {
  const trimmed = url.trim();
  if (/^(https?:|mailto:|\/)/i.test(trimmed)) return trimmed;
  return "#";
}

function inlineToHtml(text: string) {
  // Order matters: code, links, bold, italic
  let result = text;

  // inline code `code`
  result = result.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);

  // links [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const safe = sanitizeUrl(url);
    const escLabel = label;
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${escLabel}</a>`;
  });

  // bold **text**
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // italic *text*
  result = result.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");

  return result;
}

function blockToHtml(src: string) {
  // Handle fenced code blocks first
  let text = src;
  const fences: string[] = [];
  text = text.replace(/```([\s\S]*?)```/g, (_, code) => {
    const idx = fences.push(`<pre><code>${code}</code></pre>`) - 1;
    return `§§FENCE_${idx}§§`;
  });

  // Split into blocks by blank lines
  const blocks = text.split(/\n\s*\n/);
  const htmlBlocks = blocks.map((block) => {
    const escaped = escapeHtml(block.trim());
    if (!escaped) return "";

    // Headings
    if (/^###\s+/.test(escaped)) return `<h3>${inlineToHtml(escaped.replace(/^###\s+/, ""))}</h3>`;
    if (/^##\s+/.test(escaped)) return `<h2>${inlineToHtml(escaped.replace(/^##\s+/, ""))}</h2>`;
    if (/^#\s+/.test(escaped)) return `<h1>${inlineToHtml(escaped.replace(/^#\s+/, ""))}</h1>`;

    // Ordered list
    if (/^(\d+\.)\s+/.test(escaped)) {
      const items = escaped
        .split(/\n/)
        .map((line) => line.replace(/^\d+\.\s+/, "").trim())
        .filter(Boolean)
        .map((line) => `<li>${inlineToHtml(line)}</li>`) 
        .join("");
      return `<ol>${items}</ol>`;
    }

    // Unordered list
    if (/^([*-])\s+/.test(escaped)) {
      const items = escaped
        .split(/\n/)
        .map((line) => line.replace(/^([*-])\s+/, "").trim())
        .filter(Boolean)
        .map((line) => `<li>${inlineToHtml(line)}</li>`) 
        .join("");
      return `<ul>${items}</ul>`;
    }

    // Paragraph
    return `<p>${inlineToHtml(escaped)}</p>`;
  });

  let html = htmlBlocks.join("\n");
  // Restore fenced code blocks (they were already escaped)
  html = html.replace(/§§FENCE_(\d+)§§/g, (_, idx) => fences[Number(idx)] ?? "");
  return html;
}

export function Markdown({ children, className }: MarkdownProps) {
  const html = React.useMemo(() => blockToHtml(children || ""), [children]);
  return (
    <div
      className={`${styles.markdown} ${className ?? ""}`}
      // children already escaped before injecting tags
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default Markdown;

