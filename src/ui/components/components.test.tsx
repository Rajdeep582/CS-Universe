import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GemButton, LevelMedallion, ProgressBar, ProgressRing, StarRating } from './index';

afterEach(cleanup);

describe('UI kit accessibility', () => {
  it('StarRating announces stars and tier', () => {
    render(<StarRating stars={2} />);
    expect(screen.getByRole('img', { name: '2 of 3 stars — Excellent' })).toBeTruthy();
  });
  it('ProgressBar exposes a clamped value', () => {
    render(<ProgressBar value={1.7} label="XP" />);
    const bar = screen.getByRole('progressbar', { name: 'XP' });
    expect(bar.getAttribute('aria-valuenow')).toBe('100');
  });
  it('ProgressRing exposes its value', () => {
    render(<ProgressRing value={0.4} color="#000" label="Goal" />);
    expect(screen.getByRole('progressbar', { name: 'Goal' }).getAttribute('aria-valuenow')).toBe('40');
  });
  it('LevelMedallion names level number and state', () => {
    render(
      <>
        <LevelMedallion state="locked" number={4} />
        <LevelMedallion state="available" number={null} />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Level 4, locked' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Bonus level, available' })).toBeTruthy();
  });
  it('GemButton is a real button and honours disabled', () => {
    render(<GemButton disabled>PLAY</GemButton>);
    const b = screen.getByRole('button', { name: 'PLAY' }) as HTMLButtonElement;
    expect(b.disabled).toBe(true);
    expect(b.type).toBe('button');
  });
});
