import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type FSRS } from 'ts-fsrs';

export type ReviewCard = Card;

const cache = new Map<number, FSRS>();
/** FSRS scheduler for a target retention. Learning steps are off: one card = one level, reviewed in days. */
export function scheduler(retention: number): FSRS {
  let f = cache.get(retention);
  if (!f) {
    f = fsrs(
      generatorParameters({
        request_retention: retention,
        enable_fuzz: false,
        learning_steps: [],
        relearning_steps: [],
      }),
    );
    cache.set(retention, f);
  }
  return f;
}

/** Grade from a test score: 100 % → Good, ≥ 70 % → Hard, else Again (03 §4; tests have no in-item retries). */
export function gradeFor(score: number): Rating.Good | Rating.Hard | Rating.Again {
  return score >= 1 - 1e-9 ? Rating.Good : score >= 0.7 - 1e-9 ? Rating.Hard : Rating.Again;
}

/** First clear creates the card: ≥ 90 % counts as Good, otherwise Hard. */
export function firstCard(at: number, score: number, retention: number): ReviewCard {
  const now = new Date(at);
  return scheduler(retention).next(createEmptyCard(now), now, score >= 0.9 - 1e-9 ? Rating.Good : Rating.Hard).card;
}

export function reviewCard(card: ReviewCard, at: number, score: number, retention: number): ReviewCard {
  return scheduler(retention).next(card, new Date(at), gradeFor(score)).card;
}
