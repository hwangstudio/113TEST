
export interface Question {
  q: string;
  a: string[];
  c: number;
}

export interface QuestionBank {
  [category: string]: Question[];
}

export interface ScoreResults {
  correctCount: number;
  answeredCount: number;
  totalCount: number;
  accuracy: number;
}

export type ViewType = 'menu' | 'quiz' | 'import' | 'export';
