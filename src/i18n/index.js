import ja from "./locales/ja.js";
import en from "./locales/en.js";
import zh from "./locales/zh.js";
import ko from "./locales/ko.js";

export const DEFAULT_LOCALE = "en";
export const LOCALE_STORAGE_KEY = "keycap-maker:locale";
export const LOCALE_OPTIONS = Object.freeze([
  { value: "ja", labelKey: "language.options.ja" },
  { value: "en", labelKey: "language.options.en" },
  { value: "zh", labelKey: "language.options.zh" },
  { value: "ko", labelKey: "language.options.ko" },
]);

const MESSAGES = Object.freeze({
  ja,
  en,
  zh,
  ko,
});

export function normalizeLocale(value) {
  return Object.hasOwn(MESSAGES, value) ? value : DEFAULT_LOCALE;
}

export function getInitialLocale() {
  try {
    return normalizeLocale(window.localStorage?.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function setLocalePreference(locale) {
  const nextLocale = normalizeLocale(locale);
  try {
    window.localStorage?.setItem(LOCALE_STORAGE_KEY, nextLocale);
  } catch {}

  return nextLocale;
}

function resolveMessage(locale, key) {
  const dictionary = MESSAGES[normalizeLocale(locale)] ?? MESSAGES[DEFAULT_LOCALE];
  const fallbackDictionary = MESSAGES[DEFAULT_LOCALE];
  const path = String(key ?? "").split(".");

  const findValue = (source) => path.reduce((current, segment) => {
    if (current == null || typeof current !== "object") {
      return undefined;
    }

    return current[segment];
  }, source);

  return findValue(dictionary) ?? findValue(fallbackDictionary);
}

function interpolate(message, values) {
  return String(message).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => (
    Object.hasOwn(values, key) ? String(values[key]) : match
  ));
}

export function translate(locale, key, values = {}, fallback = key) {
  const message = resolveMessage(locale, key);
  if (message == null) {
    return fallback;
  }

  if (Array.isArray(message)) {
    return message.map((item) => interpolate(item, values));
  }

  if (typeof message === "string" || typeof message === "number") {
    return interpolate(message, values);
  }

  return fallback;
}
