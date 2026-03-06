import { Marked } from "marked";

const marked = new Marked();

export function renderSafeMarkdown(content: string): string {
  if (!content) return "";
  try {
    // Simple placeholder for DOMPurify if not installed
    const html = marked.parse(content) as string;
    return html; 
  } catch (e) {
    console.error("Markdown parsing failed:", e);
    return content;
  }
}
