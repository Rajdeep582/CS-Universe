/** Achievements that the current features can observe. Content-specific badges ship with their content. */
export interface AchievementDef {
  id: string;
  title: string;
  text: string;
  hidden?: boolean;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'first-light', title: 'First Light', text: 'Study every step of a lesson.' },
  { id: 'hands-on', title: 'Hands On', text: 'Reach a simulation goal.' },
  { id: 'level-up', title: 'Level Up', text: 'Clear your first level.' },
  { id: 'sharp-mind', title: 'Sharp Mind', text: 'Earn ★★ on a level (90 % or more).' },
  { id: 'flawless', title: 'Flawless', text: 'Score 100 % on a level test.' },
  { id: 'second-wind', title: 'Second Wind', text: 'Clear a level after a failed attempt.' },
  { id: 'proved-it', title: 'Proved It', text: 'Clear a level with “Prove it”, before studying it.', hidden: true },
  {
    id: 'long-memory',
    title: 'Long-Term Memory',
    text: 'Master a level with a review at least 3 days after clearing it.',
  },
  { id: 'spaced-10', title: 'Spaced Starter', text: 'Pass 10 reviews.' },
  { id: 'spaced-100', title: 'Spaced Out', text: 'Pass 100 reviews.' },
  { id: 'streak-7', title: 'Seven Days', text: 'Reach a 7-day streak.' },
  { id: 'streak-30', title: 'Thirty Days', text: 'Reach a 30-day streak.' },
  { id: 'byte-sized', title: 'Byte-Sized', text: 'Reach the rank of Byte.' },
  { id: 'night-owl', title: 'Night Owl', text: 'Study after 23:00.', hidden: true },
  { id: 'early-bird', title: 'Early Bird', text: 'Study before 06:00.', hidden: true },
];
export const achievementById = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
