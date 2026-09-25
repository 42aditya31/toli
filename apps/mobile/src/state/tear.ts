// The tear overlay is shown above every screen (screens/tear-overlay); callers push one here.
import type { TearOverlayProps } from '@toli/design-system';
import { create } from 'zustand';

type Tear = Omit<TearOverlayProps, 'speed'>;

export const useTear = create<{ tear: Tear | null; play: (t: Tear) => void; done: () => void }>(
  (set, get) => ({
    tear: null,
    play: (tear) => set({ tear }),
    done: () => {
      const t = get().tear;
      set({ tear: null });
      t?.onDone();
    },
  }),
);
