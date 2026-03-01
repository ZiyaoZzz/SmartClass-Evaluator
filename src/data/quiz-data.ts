export type QuizQuestion = {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctAnswerIndex: number;
};

export const QUIZ_DATA: QuizQuestion[] = [
  {
    id: "q1",
    question:
      "What is the time complexity of a binary search on a sorted array of n elements?",
    options: [
      "O(n)",
      "O(log n)",
      "O(n²)",
      "O(1)",
    ],
    correctAnswerIndex: 1,
  },
  {
    id: "q2",
    question:
      "Which data structure uses LIFO (Last In, First Out) ordering?",
    options: [
      "Queue",
      "Stack",
      "Array",
      "Linked List",
    ],
    correctAnswerIndex: 1,
  },
  {
    id: "q3",
    question:
      "In React, which hook is used to perform side effects in function components?",
    options: [
      "useState",
      "useEffect",
      "useContext",
      "useMemo",
    ],
    correctAnswerIndex: 1,
  },
  {
    id: "q4",
    question:
      "What does HTTP stand for?",
    options: [
      "HyperText Transfer Protocol",
      "High Transfer Text Protocol",
      "Hyperlink Transfer Protocol",
      "Host To Text Protocol",
    ],
    correctAnswerIndex: 0,
  },
  {
    id: "q5",
    question:
      "Which of the following is not a primitive type in JavaScript?",
    options: [
      "string",
      "number",
      "object",
      "boolean",
    ],
    correctAnswerIndex: 2,
  },
];
