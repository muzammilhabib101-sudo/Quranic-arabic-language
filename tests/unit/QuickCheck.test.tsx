import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import QuickCheck from "@/components/player/QuickCheck";
import en from "@/i18n/messages/en.json";

const t = en.player;
const questions = [
  { id: "q1", prompt: "What does بِ mean?", arabic: null, options: [{ text: "with" }, { text: "from" }], answer: 0, explanation: "بِ means with." },
  { id: "q2", prompt: "What does اسم mean?", arabic: null, options: [{ text: "day" }, { text: "name" }], answer: 1, explanation: "اسم means name." },
];

afterEach(cleanup);

describe("QuickCheck", () => {
  it("explains a wrong answer and asks the question again at the end", () => {
    const onDone = vi.fn();
    render(<QuickCheck lang="en" questions={questions} onDone={onDone} t={t} />);

    fireEvent.click(screen.getByRole("button", { name: "from" }));
    const status = screen.getByRole("status");
    expect(status.textContent).toContain(t.notQuite);
    expect(status.textContent).toContain("بِ means with.");
    expect(screen.getByText(/Question 1 of 3/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: new RegExp(t.nextQuestion) }));
    fireEvent.click(screen.getByRole("button", { name: "name" }));
    expect(screen.getByRole("status").textContent).toContain(t.correct);

    fireEvent.click(screen.getByRole("button", { name: new RegExp(t.nextQuestion) }));
    expect(screen.getByText(new RegExp(t.again))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "with" }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(t.finish) }));

    // Only first-try answers count; the repeat neither adds nor takes away.
    expect(onDone).toHaveBeenCalledWith(1);
  });

  it("ignores a second click once a question is answered", () => {
    render(<QuickCheck lang="en" questions={questions.slice(0, 1)} onDone={() => {}} t={t} />);
    fireEvent.click(screen.getByRole("button", { name: "with" }));
    fireEvent.click(screen.getByRole("button", { name: "from" }));
    expect(screen.getByRole("status").textContent).toContain(t.correct);
  });
});
