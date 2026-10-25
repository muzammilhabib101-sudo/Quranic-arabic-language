import { z } from "zod";

/** Urdu always; English may follow later (shown with a note until then). */
export const Text = z.object({ ur: z.string().min(1), en: z.string().min(1).optional() });

export const Role = z.enum(["noun", "verb", "particle"]);

/**
 * A short Arabic fragment typed in the lesson file: a letter, a word part or
 * a pattern such as فَعِيْل — never Quranic verse text, which always comes
 * from content/quran.
 */
const Fragment = z.string().min(1).max(24);

const Part = z.object({ text: Fragment, role: Role, label: Text });

export const LessonWord = z.object({
  /** Word position in the verse (1-based); Arabic, root and audio come from the Quran data. */
  position: z.number().int().positive(),
  meaning: Text,
  parts: z.array(Part).min(1),
  pattern: Fragment.optional(),
  patternMeaning: Text.optional(),
  why: Text,
});

/**
 * One block of the "how the words connect" diagram: either word positions in
 * the verse (Arabic from the Quran data) or a short typed fragment like بِ.
 */
const FlowItem = z
  .object({
    words: z.array(z.number().int().positive()).min(1).max(6).optional(),
    text: Fragment.optional(),
    role: Role,
    label: Text,
  })
  .refine((f) => !!f.words !== !!f.text, { message: "give either words or text" });

export const Exercise = z.object({
  id: z.string().min(1),
  type: z.literal("mcq"),
  prompt: Text,
  /** Arabic shown with the prompt (a fragment, not a verse). */
  arabic: Fragment.optional(),
  options: z
    .array(z.union([z.object({ ar: Fragment }), z.object({ text: Text })]))
    .min(2)
    .max(5),
  answer: z.number().int().nonnegative(),
  explanation: Text,
});

export const LessonContent = z
  .object({
    id: z.string(),
    status: z.enum(["draft", "reviewed"]),
    reviewedBy: z.string().optional(),
    goal: Text,
    concepts: z.array(z.object({ title: Text, body: Text })).min(1).max(4),
    verse: z.object({ surah: z.number().int(), ayah: z.number().int() }),
    words: z.array(LessonWord).min(1),
    connect: z.object({ flow: z.array(FlowItem).min(2), plain: Text }),
    remember: z.object({ rule: Text, points: z.array(Text).length(3) }),
    check: z.array(Exercise).min(3),
  })
  .superRefine((lesson, ctx) => {
    lesson.check.forEach((ex, i) => {
      if (ex.answer >= ex.options.length) {
        ctx.addIssue({ code: "custom", path: ["check", i, "answer"], message: "answer is out of range" });
      }
    });
    const positions = lesson.words.map((w) => w.position);
    if (new Set(positions).size !== positions.length) {
      ctx.addIssue({ code: "custom", path: ["words"], message: "duplicate word positions" });
    }
  });

export type TextT = z.infer<typeof Text>;
export type RoleT = z.infer<typeof Role>;
export type ExerciseT = z.infer<typeof Exercise>;
export type LessonContentT = z.infer<typeof LessonContent>;
