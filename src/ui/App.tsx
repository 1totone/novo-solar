import { useState } from 'react';
import { SunChart } from './chart/SunChart';
import { useI18n } from './i18n/useI18n';
import { SitePanel, type LoadedFile } from './SitePanel';
import { FacadePanel } from './protractor/FacadePanel';
import { ProtectionPanel } from './protractor/ProtectionPanel';
import { ProtractorOverlay } from './protractor/ProtractorOverlay';
import { protractorFromHash } from './state/protractorHash';
import { hashForSite, siteFromHash } from './state/siteHash';
import { useHashState } from './state/useHashState';

const OLD_VERSION_URL = 'https://labeee.ufsc.br/downloads/softwares/analysis-sol-ar';
const ROADMAP_URL = 'https://github.com/1totone/novo-solar/blob/main/docs/ROADMAP.md';

export function App() {
  const { t, formatNumber } = useI18n();
  const [hashState, setHashState] = useHashState();
  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null);
  const aboutOpen = hashState.painel === 'sobre';
  const selected = siteFromHash(hashState);
  const site = selected.site;
  const protractor = protractorFromHash(hashState);

  return (
    <div className="page">
      <header className="header">
        <h1>{t('app.name')}</h1>
        <p className="tagline">{t('app.tagline')}</p>
      </header>

      <main>
        <div className="workspace">
          <div className="steps">
            <SitePanel
              selected={selected}
              loadedFile={selected.kind === 'file' ? loadedFile : null}
              onSelect={(next, file) => {
                setLoadedFile(file);
                setHashState(hashForSite(next));
              }}
            />
            <FacadePanel
              state={protractor}
              rawOrientation={hashState.o ?? ''}
              onChange={setHashState}
            />
            <ProtectionPanel state={protractor} hash={hashState} onChange={setHashState} />
          </div>
          <section className="chart-section" aria-labelledby="chart-heading">
            <h2 id="chart-heading">{t('chart.heading')}</h2>
            <SunChart
              site={site}
              title={t('chart.title', {
                place: site.name,
                latitude: formatNumber(site.latitude, 2),
                longitude: formatNumber(site.longitude, 2),
                timeZone: formatNumber(site.timeZone),
              })}
              overlay={
                protractor.show ? (
                  <ProtractorOverlay
                    orientation={protractor.orientation}
                    reference={protractor.reference}
                    angles={protractor.angles}
                    sideLabels={{ right: 'd', left: 'e' }}
                  />
                ) : undefined
              }
            />
            <p className="note">{t('chart.note')}</p>
          </section>
        </div>

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
            <li>
              <a href="./wireframes/">{t('status.wireframesLink')}</a>
            </li>
          </ul>
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
