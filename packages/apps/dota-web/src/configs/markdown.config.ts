import {MDService, type MarkdownSetup} from "@ayu-sh-kr/dota-md";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import lua from "highlight.js/lib/languages/lua";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import shell from "highlight.js/lib/languages/shell";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import highlightjs from "markdown-it-highlightjs/core";
import "highlight.js/styles/github-dark.css";

/**
 * Languages used by the site's Markdown fences. Aliases such as `ts`, `html`, `sh`, and
 * `text` come from these grammars. Register a grammar here before using a new fence language.
 */
const LANGUAGES = {bash, css, javascript, json, kotlin, lua, plaintext, python, shell, typescript, xml};

Object.entries(LANGUAGES).forEach(([name, language]) => hljs.registerLanguage(name, language));

/**
 * The site's Markdown setup, applied to `MDService` when this module first loads.
 * Highlights fenced code with the trimmed highlight.js above, so only the registered grammars
 * are bundled; unlabeled fences are auto-detected among them, and code gets the `hljs` class
 * that the highlight.js theme styles.
 */
export const markdownSetup: MarkdownSetup = {
  plugins: [[highlightjs, {hljs, auto: true, code: true}]],
};

MDService.configure(markdownSetup);

/**
 * `MDService` with the site's setup applied. Import it from here rather than from
 * `@ayu-sh-kr/dota-md` so highlight.js and its theme load only with the routes that render Markdown.
 */
export {MDService};
