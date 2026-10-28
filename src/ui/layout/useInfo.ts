import { useId, useState } from 'react';

/** Estado de um texto de explicação, aberto e fechado por um botão "i" (decisão 0050). */
export interface Info {
  id: string;
  open: boolean;
  toggle: () => void;
}

export function useInfo(initial = false): Info {
  const id = `info${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [open, setOpen] = useState(initial);
  return { id, open, toggle: () => setOpen((o) => !o) };
}
