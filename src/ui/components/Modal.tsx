import * as D from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Visually hide the title (still announced to screen readers). */
  hideTitle?: boolean;
  description?: string;
  className?: string;
  children: ReactNode;
}

export function Modal({ open, onOpenChange, title, hideTitle, description, className, children }: Props) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-[radial-gradient(70%_70%_at_50%_40%,rgb(255_255_255/.08),rgb(6_24_60/.55))] backdrop-blur-[3px]" />
        <D.Content
          className={clsx(
            'glass rise fixed left-1/2 top-[12vh] z-50 w-[min(680px,92vw)] -translate-x-1/2 rounded-[32px] p-6',
            className,
          )}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <D.Title className={clsx('font-display text-2xl font-extrabold', hideTitle && 'sr-only')}>{title}</D.Title>
          {description ? (
            <D.Description className="mt-1 text-sm font-semibold text-muted">{description}</D.Description>
          ) : null}
          {children}
          <D.Close
            aria-label="Close"
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-muted hover:bg-[rgb(11_36_71/.06)]"
          >
            <X size={18} />
          </D.Close>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
