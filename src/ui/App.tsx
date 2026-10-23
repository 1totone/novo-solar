import { SunChart } from './chart/SunChart';
import { useI18n } from './i18n/useI18n';
import { useHashState } from './state/useHashState';
import { TEST_SITES } from './testSites';

const OLD_VERSION_URL = 'https://labeee.ufsc.br/downloads/softwares/analysis-sol-ar';
const ROADMAP_URL = 'https://github.com/1totone/novo-solar/blob/main/docs/ROADMAP.md';

const PREVIEW_SITE = TEST_SITES[0]!;

export function App() {
  const { t, formatNumber } = useI18n();
  const [hashState, setHashState] = useHashState();
  const aboutOpen = hashState.painel === 'sobre';

  return (
    <div className="page">
      <header className="header">
        <h1>{t('app.name')}</h1>
        <p className="tagline">{t('app.tagline')}</p>
      </header>

      <main>
        <section className="status" aria-labelledby="status-title">
          <h2 id="status-title">{t('status.title')}</h2>
          <p>{t('status.body')}</p>
          <ul className="links">
            <li>
              <a href={OLD_VERSION_URL}>{t('status.oldVersionLink')}</a>
            </li>
            <li>
              <a href={ROADMAP_URL}>{t('status.roadmapLink')}</a>
            </li>
          </ul>
        </section>

        <section className="chart-preview" aria-labelledby="chart-heading">
          <h2 id="chart-heading">{t('chart.sampleHeading')}</h2>
          <p className="note">{t('chart.sampleNote', { place: PREVIEW_SITE.name })}</p>
          <SunChart
            site={PREVIEW_SITE}
            title={t('chart.title', {
              place: PREVIEW_SITE.name,
              latitude: formatNumber(PREVIEW_SITE.latitude, 2),
              longitude: formatNumber(PREVIEW_SITE.longitude, 2),
              timeZone: formatNumber(PREVIEW_SITE.timeZone),
            })}
          />
        </section>

        <button
          type="button"
          className="about-toggle"
          aria-expanded={aboutOpen}
          aria-controls="about"
          onClick={() => setHashState({ painel: aboutOpen ? '' : 'sobre' })}
        >
          {aboutOpen ? t('about.toggleClose') : t('about.toggleOpen')}
        </button>

        {aboutOpen && (
          <section id="about" className="about" aria-labelledby="about-title">
            <h2 id="about-title">{t('about.title')}</h2>
            <h3>{t('about.originalTitle')}</h3>
            <ul>
              <li>{t('about.originalResearch')}</li>
              <li>{t('about.originalProgramming')}</li>
            </ul>
            <h3>{t('about.newTitle')}</h3>
            <ul>
              <li>{t('about.newAuthor')}</li>
              <li>{t('about.newAi')}</li>
              <li>{t('about.newMaintenance')}</li>
            </ul>
            <p>{t('about.license')}</p>
          </section>
        )}
      </main>

      <footer className="footer">
        {t('footer.build', {
          version: __APP_VERSION__,
          label: __BUILD_LABEL__,
          commit: __BUILD_COMMIT__,
        })}
      </footer>
    </div>
  );
}
