import type { Lang } from '../i18n';
import type { LocalizedContent } from '../content';
import { DE_CONTENT } from './content-de';
import { ES_CONTENT } from './content-es';
import { IT_CONTENT } from './content-it';
import { RU_CONTENT } from './content-ru';

/** Built-in translations of the About page, FAQ, blog posts and car texts (editable in Admin). */
export const DEFAULT_TRANSLATIONS: Partial<Record<Lang, LocalizedContent>> = {
  it: IT_CONTENT,
  ru: RU_CONTENT,
  es: ES_CONTENT,
  de: DE_CONTENT,
};
