import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TestType = "full" | "fill_blank" | "passage_recall" | "email_writing";

export interface FillBlankQ {
  question: string;
  answer: string;
  accepted_answers?: string[];
  difficulty: string;
  category: string;
}

export interface PassageQ {
  passage: string;
  topic: string;
  key_points: string[];
}

export interface EmailQ {
  situation: string;
  task: string;
  requirements: string[];
  recipient_role: string;
}

interface ExamState {
  attemptId: string | null;
  testType: TestType;
  fillBlankQs: FillBlankQ[];
  fillBlankAnswers: {
    question: string;
    correct: string;
    accepted_answers?: string[];
    user: string;
    is_correct: boolean;
    category: string;
    difficulty: string;
  }[];
  passageQs: PassageQ[];
  passageAnswers: { passage_index: number; recall: string; score: number; evaluation: any }[];
  emailQ: EmailQ | null;
  emailAnswer: { text: string; score: number; evaluation: any } | null;
  warnings: number;
  setAttemptId: (id: string) => void;
  setTestType: (t: TestType) => void;
  setFillBlankQs: (qs: FillBlankQ[]) => void;
  addFillBlankAnswer: (a: ExamState["fillBlankAnswers"][number]) => void;
  setPassageQs: (qs: PassageQ[]) => void;
  addPassageAnswer: (a: ExamState["passageAnswers"][number]) => void;
  setEmailQ: (q: EmailQ) => void;
  setEmailAnswer: (a: { text: string; score: number; evaluation: any }) => void;
  addWarning: () => void;
  reset: () => void;
}

export const useExamStore = create<ExamState>()(
  persist(
    (set) => ({
      attemptId: null,
      testType: "full",
      fillBlankQs: [],
      fillBlankAnswers: [],
      passageQs: [],
      passageAnswers: [],
      emailQ: null,
      emailAnswer: null,
      warnings: 0,
      setAttemptId: (id) => set({ attemptId: id }),
      setTestType: (t) => set({ testType: t }),
      setFillBlankQs: (qs) => set({ fillBlankQs: qs }),
      addFillBlankAnswer: (a) => set((s) => ({ fillBlankAnswers: [...s.fillBlankAnswers, a] })),
      setPassageQs: (qs) => set({ passageQs: qs }),
      addPassageAnswer: (a) => set((s) => ({ passageAnswers: [...s.passageAnswers, a] })),
      setEmailQ: (q) => set({ emailQ: q }),
      setEmailAnswer: (a) => set({ emailAnswer: a }),
      addWarning: () => set((s) => ({ warnings: s.warnings + 1 })),
      reset: () =>
        set({
          attemptId: null,
          testType: "full",
          fillBlankQs: [],
          fillBlankAnswers: [],
          passageQs: [],
          passageAnswers: [],
          emailQ: null,
          emailAnswer: null,
          warnings: 0,
        }),
    }),
    { name: "tcs-nqt-exam" }
  )
);
  