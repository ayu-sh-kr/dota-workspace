import markdownit from 'markdown-it';
import highlightjs from 'markdown-it-highlightjs';
import 'highlight.js/styles/github-dark.css';

/** Single shared instance — creating markdownit + plugins is not cheap */
const md = markdownit({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
}).use(highlightjs, { auto: true, code: true });

export class MarkdownService {
  static renderMarkdown(content: string): string {
    return md.render(content);
  }
}