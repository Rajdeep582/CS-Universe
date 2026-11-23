import * as T from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <T.Provider delayDuration={250}>{children}</T.Provider>;
}

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content sideOffset={8} className="glass-dark z-50 rounded-xl px-3 py-1.5 text-xs font-semibold">
          {content}
          <T.Arrow className="fill-[#0e2248]" />
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
