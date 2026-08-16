"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@perfume-aura/ui/components/button";

const questions = [
  { key: "mood", prompt: "How should it feel?", options: ["Quiet", "Magnetic", "Radiant"] },
  { key: "intensity", prompt: "How much presence?", options: ["Close", "Balanced", "Commanding"] },
  { key: "occasion", prompt: "Where will it live?", options: ["Every day", "Evening", "Occasion"] },
] as const;

export function ScentFinder() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const complete = questions.every((question) => answers[question.key]);

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-8">
        {questions.map((question, questionIndex) => (
          <fieldset key={question.key} className="border-t border-black/20 pt-5">
            <legend className="font-display text-2xl">
              <span className="mr-3 text-sm text-[#79633e]">0{questionIndex + 1}</span>
              {question.prompt}
            </legend>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {question.options.map((option) => (
                <label key={option} className="cursor-pointer">
                  <input
                    type="radio"
                    name={question.key}
                    value={option}
                    checked={answers[question.key] === option}
                    onChange={() => setAnswers((current) => ({ ...current, [question.key]: option }))}
                    className="peer sr-only"
                  />
                  <span className="grid min-h-12 place-items-center border border-black/25 px-4 text-sm font-medium peer-checked:bg-[var(--aura-ink)] peer-checked:text-[var(--aura-ivory)] peer-focus-visible:ring-3 peer-focus-visible:ring-[color:rgb(190_141_63_/_40%)]">
                    {option}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <aside className="border border-black/20 bg-[#fbf8f2] p-6 lg:sticky lg:top-28 lg:self-start">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#79633e]">Your result</p>
        <h2 className="mt-3 font-display text-3xl">{complete ? "Profile captured." : "Choose one from each row."}</h2>
        <p className="mt-4 text-sm leading-6 text-[#5f584f]">
          {complete
            ? "Recommendations will appear when enough scent profile details are available."
            : "Choose one answer from each row to complete your scent direction."}
        </p>
        <Button render={<Link href="/shop" />} nativeButton={false} className="mt-6 min-h-12 w-full rounded-none" disabled={!complete}>
          Explore the collection
        </Button>
      </aside>
    </div>
  );
}
