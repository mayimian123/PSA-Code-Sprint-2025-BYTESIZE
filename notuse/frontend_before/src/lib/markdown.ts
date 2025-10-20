export function toSimpleMarkdownHtml(value: string | null | undefined) {
  const safe = (value ?? "").trim();
  if (!safe) {
    return { __html: "" };
  }

  const escaped = safe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const withBold = escaped.replace(/\*\*(.+?)\*\*/gs, "<strong>$1</strong>");
  const withBreaks = withBold.replace(/\n/g, "<br />");

  return { __html: withBreaks };
}
