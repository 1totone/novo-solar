import { useEffect, useRef } from 'react';
import { onRovingKeyDown } from '../a11y/roving';
import { EXERCISE_IDS, exerciseHref } from '../didactic/exercises';
import { TUTORIAL_HREF } from '../didactic/tutorial';
import { useI18n } from '../i18n/useI18n';
import {
  EXAMPLE_IDS,
  exampleHref,
  HELP_SECTIONS,
  type ExampleId,
  type HelpContent,
  type HelpItem,
  type HelpSection,
} from './content';
import { useHelpContent } from './useHelpContent';

function ItemList({ items }: { items: HelpItem[] }) {
  return (
    <dl className="help-items">
      {items.map((item) => (
        <div key={item.title}>
          <dt>{item.title}</dt>
          <dd>{item.text}</dd>
        </div>
      ))}
    </dl>
  );
}

function Guide({
  content,
  tutorial,
}: {
  content: HelpContent['guide'];
  tutorial: HelpContent['tutorial'];
}) {
  const { t } = useI18n();
  return (
    <>
      <p>{content.intro}</p>
      <h3>{tutorial.title}</h3>
      <p>{tutorial.intro}</p>
      <p>
        <a className="btn primary" href={TUTORIAL_HREF} target="_blank" rel="noopener">
          {t('tutorial.start')}
        </a>
      </p>
      <h3>{t('help.guide.steps')}</h3>
      <ItemList items={content.steps} />
      <h3>{t('help.guide.advanced')}</h3>
      <ItemList items={content.advanced} />
      <h3>{t('help.guide.tabs')}</h3>
      <ItemList items={content.tabs} />
      <h3>{t('help.guide.tips')}</h3>
      <ul>
        {content.tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </>
  );
}

function Examples({
  content,
  current,
}: {
  content: HelpContent['examples'];
  current: ExampleId | null;
}) {
  const { t } = useI18n();
  const refs = useRef<Partial<Record<ExampleId, HTMLElement | null>>>({});
  // Aberta a partir do cartão de um exemplo, a ajuda mostra esse exemplo.
  useEffect(() => {
    if (current) refs.current[current]?.scrollIntoView({ block: 'start' });
  }, [current]);
  return (
    <>
      <p>{content.intro}</p>
      {EXAMPLE_IDS.map((id) => {
        const e = content.items[id];
        return (
          <article
            key={id}
            className="help-example"
            aria-labelledby={`help-example-${id}`}
            data-testid={`help-example-${id}`}
            ref={(el) => {
              refs.current[id] = el;
            }}
          >
            <h3 id={`help-example-${id}`}>{e.title}</h3>
            <p>{e.problem}</p>
            <p>
              <a className="btn primary" href={exampleHref(id)} target="_blank" rel="noopener">
                {t('help.example.open')}
              </a>
            </p>
            <h4>{t('help.example.steps')}</h4>
            <ol>
              {e.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <h4>{t('help.example.lesson')}</h4>
            <p>{e.lesson}</p>
          </article>
        );
      })}
      <p className="note">{content.source}</p>
    </>
  );
}

function Exercises({ content }: { content: HelpContent['exercises'] }) {
  const { t } = useI18n();
  return (
    <>
      <p>{content.intro}</p>
      <h3>{t('exercise.howTo')}</h3>
      <ol>
        {content.howTo.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {EXERCISE_IDS.map((id) => {
        const e = content.items[id];
        return (
          <article
            key={id}
            className="help-example"
            aria-labelledby={`help-exercise-${id}`}
            data-testid={`help-exercise-${id}`}
          >
            <h3 id={`help-exercise-${id}`}>{e.title}</h3>
            <p>{e.statement}</p>
            <p>
              <a className="btn" href={exerciseHref(id)} target="_blank" rel="noopener">
                {t('exercise.open')}
              </a>
            </p>
          </article>
        );
      })}
      <h3>{t('exercise.metric')}</h3>
      <p>{content.metric}</p>
    </>
  );
}

function Glossary({ content }: { content: HelpContent['glossary'] }) {
  return (
    <>
      {content.map((group) => (
        <section key={group.title} aria-label={group.title}>
          <h3>{group.title}</h3>
          <dl className="help-items">
            {group.terms.map((term) => (
              <div key={term.term}>
                <dt>{term.term}</dt>
                <dd>{term.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </>
  );
}

function Faq({ content }: { content: HelpContent['faq'] }) {
  return (
    <div className="help-faq">
      {content.map((item) => (
        <details key={item.question}>
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

function Hypotheses({ content }: { content: HelpContent['hypotheses'] }) {
  return (
    <>
      <p>{content.intro}</p>
      {content.groups.map((group) => (
        <section key={group.title} aria-label={group.title}>
          <h3>{group.title}</h3>
          <ul>
            {group.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

/**
 * Ajuda (F4.8, decisão 0032): diálogo modal com seis partes em abas, aberto pelo botão do cabeçalho
 * ou por um link com ajuda=<parte>. Fecha com Esc, com o botão ou com um clique fora dele.
 */
export function HelpDialog({
  section,
  example,
  onSection,
  onClose,
}: {
  section: HelpSection;
  /** Exemplo aberto no cartão, para mostrar na parte dos exemplos. */
  example: ExampleId | null;
  onSection: (section: HelpSection) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const content = useHelpContent();
  const ref = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // Cada parte começa do topo.
  useEffect(() => {
    if (panel.current) panel.current.scrollTop = 0;
  }, [section]);

  return (
    <dialog
      ref={ref}
      className="help"
      aria-labelledby="help-title"
      data-testid="help"
      onClose={onClose}
      onClick={(e) => {
        // O clique no fundo escurecido chega ao próprio diálogo, fora da caixa interna.
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="help-box">
        <div className="help-head">
          <h2 id="help-title">{t('help.title')}</h2>
          <button type="button" className="btn" onClick={() => ref.current?.close()}>
            {t('help.close')}
          </button>
        </div>
        <div
          className="tabs help-tabs"
          role="tablist"
          aria-label={t('help.sections')}
          onKeyDown={(e) => onRovingKeyDown(e, 'tab')}
        >
          {HELP_SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              id={`help-tab-${s}`}
              aria-selected={section === s}
              aria-controls="help-panel"
              tabIndex={section === s ? 0 : -1}
              onClick={() => onSection(s)}
            >
              {t(`help.section.${s}`)}
            </button>
          ))}
        </div>
        <div
          ref={panel}
          className="help-body"
          role="tabpanel"
          id="help-panel"
          aria-labelledby={`help-tab-${section}`}
          tabIndex={0}
        >
          {section === 'guia' && <Guide content={content.guide} tutorial={content.tutorial} />}
          {section === 'exemplos' && <Examples content={content.examples} current={example} />}
          {section === 'exercicios' && <Exercises content={content.exercises} />}
          {section === 'glossario' && <Glossary content={content.glossary} />}
          {section === 'perguntas' && <Faq content={content.faq} />}
          {section === 'hipoteses' && <Hypotheses content={content.hypotheses} />}
        </div>
      </div>
    </dialog>
  );
}
