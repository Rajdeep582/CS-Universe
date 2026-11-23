import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { clsx } from 'clsx';

type Props<T extends ElementType> = {
  as?: T;
  tone?: 'light' | 'dark';
  interactive?: boolean;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

/** Frosted-glass surface used by every card, chip and panel. */
export function GlassPanel<T extends ElementType = 'div'>({
  as,
  tone = 'light',
  interactive,
  className,
  children,
  ...rest
}: Props<T>) {
  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag
      className={clsx(tone === 'dark' ? 'glass-dark' : 'glass', interactive && 'glass-interactive', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
