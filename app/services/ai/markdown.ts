import MarkdownIt from 'markdown-it';

export interface MarkdownNode {
  type: string; tag: string; content: string; attrs: [string, string][] | null; children: MarkdownNode[];
}
interface TokenLike {
  type: string; tag: string; content: string; nesting: number; attrs: [string, string][] | null;
  children: TokenLike[] | null;
}
const parser = new MarkdownIt({ html: false, linkify: true, breaks: true });
function tree(tokens: TokenLike[]): MarkdownNode[] {
  const root: MarkdownNode[] = [];
  const stack = [root];
  for (const token of tokens) {
    if (token.nesting === -1) { if (stack.length > 1) stack.pop(); continue; }
    const node: MarkdownNode = {
      type: token.type.replace(/_open$/, ''), tag: token.tag, content: token.content,
      attrs: token.attrs?.map(([key, value]) => [key, String(value)]) ?? null,
      children: token.children ? tree(token.children) : [],
    };
    stack[stack.length - 1].push(node);
    if (token.nesting === 1) stack.push(node.children);
  }
  return root;
}
export function parseAnswerMarkdown(content: string): MarkdownNode[] {
  return tree(parser.parse(content, {}) as TokenLike[]);
}
export function safeAnswerLink(url: string): string | null {
  try { const parsed = new URL(url); return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : null; }
  catch { return null; }
}
