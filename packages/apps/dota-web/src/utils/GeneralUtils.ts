import {LocalStorageService} from "@dota/service/local-storage.service.ts";
import {applicationEventPublisher} from "@dota/main.ts";

export type PlatformToken = {
  tokens: string[],
  kernel: string,
  os: string,
  architecture: string,
}

export function toggleDark() {
  const value = document.documentElement.classList.toggle("dark");
  document.documentElement.classList.toggle("bg-slate-950");
  return value;
}

export class GeneralUtils {

  static toggleDarkMode() {
    const isDarkMode = document.documentElement.classList.toggle('dark');
    document.documentElement.classList.toggle('bg-slate-950', isDarkMode);
    LocalStorageService.add('theme', isDarkMode ? 'dark' : 'light');
    window.dispatchEvent(new CustomEvent('themeChange', {
      detail: { isDarkMode: GeneralUtils.isDarkMode() }
    }))
  }

  static isDarkMode() {
    return document.documentElement.classList.contains('dark');
  }

  static getBrowserTheme() {
    const theme = LocalStorageService.get('theme');
    if (theme) {
      return theme;
    }

    // Otherwise, check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    // Default to light if no preference is found
    return 'light';
  }

  static setBrowserTheme(theme: string) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.add('bg-slate-950');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.remove('bg-slate-950');
    }
  }

  static scrollToTop(behavior: 'smooth' | 'instant' = 'smooth') {
    window.scrollTo({ top: 0, behavior: behavior });
  }

  static extractParenthesisBlocks(input: string): string[] {
    const regex = /\(([^)]+)\)/g;
    const matches = [];
    let match;
    while ((match = regex.exec(input)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }

  static detectDeviceType(): PlatformToken {
    const userAgentString = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0"
    const userAgent = navigator.userAgent;
    const data = GeneralUtils.extractParenthesisBlocks(userAgent);
    const platformTokens = data[0].split(";");

    console.log(platformTokens)
    return {
      tokens: platformTokens,
      kernel: platformTokens[0],
      os: platformTokens[1],
      architecture: platformTokens[2]
    }
  }

}