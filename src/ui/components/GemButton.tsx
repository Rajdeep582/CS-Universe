import { forwardRef, type ReactNode } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { clsx } from 'clsx';

export type GemVariant = 'go' | 'rose' | 'gold' | 'sky' | 'glass';

interface Props extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: ReactNode;
  variant?: GemVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconAfter?: ReactNode;
}

/** Bevelled "gem" call-to-action: hover lift, press-in, spring physics (disabled under reduced motion). */
export const GemButton = forwardRef<HTMLButtonElement, Props>(function GemButton(
  { variant = 'go', size = 'md', icon, iconAfter, className, children, type = 'button', ...rest },
  ref,
) {
  const still = useReducedMotion() || rest.disabled;
  return (
    <motion.button
      ref={ref}
      type={type}
      className={clsx('gem', `gem-${variant}`, `gem-${size}`, className)}
      {...(still ? {} : { whileHover: { y: -2, scale: 1.015 }, whileTap: { y: 3, scale: 0.985 } })}
      transition={{ type: 'spring', stiffness: 520, damping: 26 }}
      {...rest}
    >
      {icon}
      {children}
      {iconAfter}
    </motion.button>
  );
});
