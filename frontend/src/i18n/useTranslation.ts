import { useUiStore } from "../stores/uiStore";
import { dictionaries, type Dictionary } from "./dictionaries";

export function useTranslation(): {
  t: Dictionary;
  lang: "en" | "es";
} {
  const language = useUiStore((s) => s.language);
  return { t: dictionaries[language], lang: language };
}
