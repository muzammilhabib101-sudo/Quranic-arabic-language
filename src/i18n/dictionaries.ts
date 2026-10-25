import "server-only";
import type { Locale } from "./config";
import en from "./messages/en.json";
import urJson from "./messages/ur.json";

export type Dictionary = typeof en;

// Typing ur.json against en.json makes a missing Urdu key a build error.
const ur: Dictionary = urJson;

const dictionaries: Record<Locale, Dictionary> = { ur, en };

export const getDictionary = async (locale: Locale) => dictionaries[locale];
