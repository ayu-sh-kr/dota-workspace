import {MDService} from "@ayu-sh-kr/dota-md";
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

/**
 * Languages used by the site's Markdown fences. Aliases such as `ts`, `html`, `sh`, and
 * `text` come from these grammars. Register a grammar here before using a new fence language.
 */
const LANGUAGES = {bash, css, javascript, json, kotlin, lua, plaintext, python, shell, typescript, xml};

/**
 * Installs the site's highlight.js setup on the shared Markdown service.
 * Only the registered grammars are bundled, and unlabeled fences are auto-detected among them.
 * Call it before the application renders so prerendered and hydrated pages highlight alike.
 */
export function configureMarkdown(): void {
  Object.entries(LANGUAGES).forEach(([name, language]) => hljs.registerLanguage(name, language));
  MDService.configure({plugins: [[highlightjs, {hljs, auto: true, code: true}]]});
}
