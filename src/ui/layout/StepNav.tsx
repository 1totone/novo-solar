import { useEffect, useRef, useState } from 'react';
import type { MessageKey } from '../i18n/i18n';
import { useI18n } from '../i18n/useI18n';

/** Passos da coluna, na ordem, com o título de cada um (os mesmos dos painéis). */
const STEPS: readonly [number, MessageKey][] = [
  [1, 'site.heading'],
  [2, 'facade.heading'],
  [3, 'protection.heading'],
  [4, 'data.heading'],
  [5, 'outputs.heading'],
  [6, 'geometry.heading'],
  [7, 'effect.heading'],
];

/** Painel do passo `n`, achado pelo número no título. */
function stepPanel(n: number): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>('.steps .step-panel .step-n')) {
    if (el.textContent === String(n)) return el.closest<HTMLElement>('.step-panel');
  }
  return null;
}

/** Altura do que fica fixo no alto da tela e cobriria o passo: a carta no celular, esta barra no
 * computador (no celular, a barra fica no pé da tela). */
function topCover(): number {
  const wide = window.matchMedia?.('(min-width: 52rem)').matches ?? true;
  const el = document.querySelector<HTMLElement>(wide ? '.step-nav' : '.chart-section');
  if (!el || getComputedStyle(el).position !== 'sticky') return 0;
  // A altura, e não a posição de agora: antes de rolar, a área ainda não grudou no alto.
  return el.offsetHeight + (parseFloat(getComputedStyle(el).top) || 0);
}

/**
 * Atalho entre passos (decisão 0040): uma barra com os números dos passos, que só aparece com um
 * passo avançado aberto, quando a página fica longa. No computador, fica fixa no alto da coluna
 * dos passos; no celular, no pé da tela. Cada número rola até o passo e põe o foco no título.
 */
export function StepNav() {
  const { t } = useI18n();
  const [current, setCurrent] = useState(1);
  // Passo escolhido na barra: fica marcado enquanto a página não sai de onde o atalho a deixou
  // (o último passo pode não chegar ao alto da tela no fim da página).
  const pinned = useRef<{ n: number; y: number } | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (pinned.current && Math.abs(window.scrollY - pinned.current.y) < 4) {
        setCurrent(pinned.current.n);
        return;
      }
      pinned.current = null;
      const line = topCover() + 24;
      let found = 1;
      for (const [n] of STEPS) {
        const panel = stepPanel(n);
        if (panel && panel.getBoundingClientRect().top <= line) found = n;
      }
      setCurrent(found);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const go = (n: number) => {
    const panel = stepPanel(n);
    if (!panel) return;
    const top = panel.getBoundingClientRect().top + window.scrollY - topCover() - 8;
    window.scrollTo({ top: Math.max(0, top) });
    pinned.current = { n, y: window.scrollY };
    // Nos passos recolhidos (6 e 7), o foco vai para o resumo, que abre e fecha o passo.
    const heading = panel.querySelector<HTMLElement>('h2');
    const summary = heading?.closest<HTMLElement>('summary') ?? null;
    if (!summary && heading) heading.tabIndex = -1;
    (summary ?? heading)?.focus({ preventScroll: true });
    setCurrent(n);
  };

  return (
    <nav className="step-nav" aria-label={t('stepNav.label')} data-testid="step-nav">
      <span className="step-nav-title" aria-hidden="true">
        {t('stepNav.title')}
      </span>
      <ol>
        {STEPS.map(([n, key]) => (
          <li key={n}>
            <button
              type="button"
              className="step-nav-n"
              aria-label={t('stepNav.go', { n, name: t(key) })}
              title={t(key)}
              aria-current={current === n ? 'step' : undefined}
              data-testid={`step-nav-${n}`}
              onClick={() => go(n)}
            >
              {n}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
