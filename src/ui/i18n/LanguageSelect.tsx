import { useId } from 'react';
import { isLocale, LOCALE_NAMES, LOCALES } from './i18n';
import { useI18n } from './useI18n';

/** Seletor de idioma do cabeçalho (F4.6): a escolha fica neste navegador, não no link. */
export function LanguageSelect() {
  const { t, locale, setLocale } = useI18n();
  const id = useId();
  return (
    <div className="language">
      <label htmlFor={id}>{t('language.label')}</label>
      <select
        id={id}
        value={locale}
        data-testid="language"
        onChange={(e) => {
          if (isLocale(e.target.value)) setLocale(e.target.value);
        }}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
