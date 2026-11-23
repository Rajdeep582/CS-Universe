import type { ReactNode } from 'react';

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="whitespace-nowrap rounded-[7px] border border-line bg-[rgb(11_36_71/.06)] px-1.5 py-0.5 font-sans text-[11px] font-bold text-ink-2">
      {children}
    </kbd>
  );
}
