export type SurveyQuestion = {
  id: number;
  title: string;
  options: string[];
};

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 0,
    title: 'Which AI area do you explore most?',
    options: ['LLMs', 'Computer vision', 'Robotics'],
  },
  {
    id: 1,
    title: 'How often do you use AI tools?',
    options: ['Daily', 'Weekly', 'Monthly', 'Rarely'],
  },
  {
    id: 2,
    title: 'What is your biggest AI concern?',
    options: ['Privacy', 'Jobs and economy'],
  },
  {
    id: 3,
    title: 'Which deployment do you prefer?',
    options: ['Cloud', 'On-device', 'Hybrid'],
  },
  {
    id: 4,
    title: 'How much do you trust AI outputs?',
    options: ['A lot', 'Somewhat', 'Not much', 'It depends'],
  },
];

