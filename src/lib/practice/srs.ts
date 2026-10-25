import { createEmptyCard, fsrs, Rating, type Card, type CardInput, type Grade } from "ts-fsrs";

/** A ts-fsrs card as stored in localStorage (dates as ISO strings). */
export type StoredCard = {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string;
};

const scheduler = fsrs({ enable_fuzz: true });

export { Rating };
export type { Grade };

/** Schedules the next review of a word after an answer or a flashcard rating. */
export function review(card: StoredCard | undefined, grade: Grade, now = new Date()): StoredCard {
  // A stored card is a CardInput with ISO dates, which ts-fsrs accepts.
  const input = card ? (card as unknown as CardInput) : createEmptyCard(now);
  return toStored(scheduler.next(input, now, grade).card);
}

/** A card never reviewed yet, due straight away (a word the learner saved). */
export function newCard(now = new Date()): StoredCard {
  return toStored(createEmptyCard(now));
}

function toStored(next: Card): StoredCard {
  return {
    due: next.due.toISOString(),
    stability: next.stability,
    difficulty: next.difficulty,
    elapsed_days: next.elapsed_days,
    scheduled_days: next.scheduled_days,
    learning_steps: next.learning_steps,
    reps: next.reps,
    lapses: next.lapses,
    state: next.state,
    ...(next.last_review ? { last_review: next.last_review.toISOString() } : {}),
  };
}

export function dueIds(cards: Record<string, StoredCard>, now = new Date()) {
  return Object.entries(cards)
    .filter(([, c]) => new Date(c.due) <= now)
    .sort((a, b) => a[1].due.localeCompare(b[1].due))
    .map(([id]) => id);
}

/** Whole days from today (local) until a card is due; 0 = due today or overdue. */
export function daysUntil(due: string, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(due);
  const dueDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(0, Math.round((dueDay.getTime() - start.getTime()) / 86_400_000));
}
