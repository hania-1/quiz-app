"use client"; // Enables client-side rendering for this component

import { useState, useEffect } from "react"; // Import useState and useEffect hooks from React
import { Button } from "@/components/ui/button"; // Import custom Button component
import ClipLoader from "react-spinners/ClipLoader";

// Define the Answer type
type Answer = {
  text: string;
  isCorrect: boolean;
};

// Define the Question type
type Question = {
  question: string;
  answers: Answer[];
  hint: string; // Add a hint property
};

// Define the structure of a question item returned from the API
interface ApiQuestion {
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

// Define the QuizState type
type QuizState = {
  currentQuestion: number;
  score: number;
  showResults: boolean;
  questions: Question[];
  isLoading: boolean;
  feedback: string; // Feedback message for hints
  hintsUsed: number; // Count of hints used
  totalHints: number; // Total hints available
  timer: number; // Time remaining for the current question
  timerInterval: NodeJS.Timeout | null; // Timer interval
};

export default function QuizApp() {
  // State to manage the quiz
  const [state, setState] = useState<QuizState>({
    currentQuestion: 0,
    score: 0,
    showResults: false,
    questions: [],
    isLoading: true,
    feedback: "",
    hintsUsed: 0,
    totalHints: 3,
    timer: 10,
    timerInterval: null,
  });

  // Function to reset the quiz
  const resetQuiz = (): void => {
    setState({
      currentQuestion: 0,
      score: 0,
      showResults: false,
      questions: state.questions,
      isLoading: false,
      feedback: "",
      hintsUsed: 0,
      totalHints: 3,
      timer: 10,
      timerInterval: null,
    });
  };

  // useEffect to fetch quiz questions from API when the component mounts
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(
          "https://opentdb.com/api.php?amount=10&type=multiple"
        );
        const data = await response.json();

        // Map API response to the Question type
        const questions = data.results.map((item: ApiQuestion) => {
          const incorrectAnswers = item.incorrect_answers.map(
            (answer: string) => ({
              text: answer,
              isCorrect: false,
            })
          );
          const correctAnswer = {
            text: item.correct_answer,
            isCorrect: true,
          };
          return {
            question: item.question,
            answers: [...incorrectAnswers, correctAnswer].sort(
              () => Math.random() - 0.5
            ),
            hint: `Consider the keywords in the question to find the right answer!`, // Add a specific hint
          };
        });
        setState((prevState) => ({
          ...prevState,
          questions,
          isLoading: false,
        }));
      } catch (error) {
        console.error("Failed to fetch questions:", error);
      }
    };

    fetchQuestions();
  }, []);

  // useEffect to handle the timer for each question
  useEffect(() => {
    if (state.timer > 0 && !state.showResults) {
      const interval = setInterval(() => {
        setState((prevState) => ({ ...prevState, timer: prevState.timer - 1 }));
      }, 1000);
      setState((prevState) => ({ ...prevState, timerInterval: interval }));

      return () => clearInterval(interval); // Clear interval on cleanup
    } else if (state.timer === 0 && !state.showResults) {
      // If time runs out, show correct answer
      const currentQuestion = state.questions[state.currentQuestion];

      if (currentQuestion) { // Check if currentQuestion is defined
        setState((prevState) => ({
          ...prevState,
          feedback: `Time's up! The correct answer was: ${currentQuestion.answers.find(a => a.isCorrect)?.text}`,
          timer: 10, // Reset timer for the next question
          currentQuestion: prevState.currentQuestion + 1, // Move to the next question
        }));
      }
    }
  }, [state.timer, state.showResults, state.currentQuestion, state.questions]);

  // Function to handle answer click
  const handleAnswerClick = (isCorrect: boolean): void => {
    const currentQuestion = state.questions[state.currentQuestion];

    if (currentQuestion) { // Check if currentQuestion is defined
      if (isCorrect) {
        setState((prevState) => ({ ...prevState, score: prevState.score + 1 }));
        setState((prevState) => ({
          ...prevState,
          feedback: "Correct answer!",
        }));
      } else {
        setState((prevState) => ({
          ...prevState,
          feedback: `Incorrect! The correct answer was: ${currentQuestion.answers.find(a => a.isCorrect)?.text}`,
        }));
      }

      const nextQuestion = state.currentQuestion + 1;
      if (nextQuestion < state.questions.length) {
        setState((prevState) => ({
          ...prevState,
          currentQuestion: nextQuestion,
          feedback: "", // Clear feedback for the next question
          timer: 10, // Reset timer for the next question
        }));
      } else {
        setState((prevState) => ({ ...prevState, showResults: true }));
      }
    }
  };

  // Function to request a hint
  const requestHint = (): void => {
    if (state.hintsUsed < state.totalHints) {
      const currentHint = state.questions[state.currentQuestion]?.hint; // Get the specific hint for the current question
      if (currentHint) { // Ensure the hint is defined
        setState((prevState) => ({
          ...prevState,
          feedback: currentHint, // Provide the hint
          hintsUsed: prevState.hintsUsed + 1,
        }));
      }
    } else {
      setState((prevState) => ({
        ...prevState,
        feedback: "No more hints available!",
      }));
    }
  };

  // Show loading spinner if the questions are still loading
  if (state.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <ClipLoader />
        <p>Loading quiz questions, please wait...</p>
      </div>
    );
  }

  // Show message if no questions are available
  if (state.questions.length === 0) {
    return <div>No questions available.</div>;
  }

  // Get the current question
  const currentQuestion = state.questions[state.currentQuestion];

  // JSX return statement rendering the Quiz UI
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground bg-teal-900">
      {state.showResults ? (
        // Show results if the quiz is finished
        <div className="bg-card p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4">Results</h2>
          <p className="text-lg mb-4">
            You scored {state.score} out of {state.questions.length} ({((state.score / state.questions.length) * 100).toFixed(2)}%)
          </p>
          <Button onClick={resetQuiz} className="w-full">
            Try Again
          </Button>
        </div>
      ) : (
        // Show current question and answers if the quiz is in progress
        <div className="bg-card p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4">
            Question {state.currentQuestion + 1}/{state.questions.length}
          </h2>
          {currentQuestion ? ( // Check if currentQuestion is defined
            <p
              className="text-lg mb-4"
              dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
            />
          ) : (
            <p className="text-lg mb-4">No more questions available.</p>
          )}
          <div className="mt-4">
            <p className="text-lg text-green-500">Time Remaining: {state.timer} seconds</p>
            <p className="text-lg text-yellow-500">Score: {state.score}</p> {/* Display Score */}
            <p className="text-lg text-muted-foreground">Hints Used: {state.hintsUsed}/{state.totalHints}</p> {/* Display Hints Used */}
          </div>
          <div className="grid gap-4">
            {currentQuestion?.answers.map((answer, index) => (
              <Button
                key={index}
                onClick={() => handleAnswerClick(answer.isCorrect)}
                className="w-full hover:scale-105 hover:shadow-lg hover:bg-gray-400"
              >
                {answer.text}
              </Button>
            ))}
          </div>
          <div className="mt-4 text-right hover:cursor-pointer">
            <Button onClick={requestHint} className="mr-2">
              Request Hint
            </Button>
          </div>
          {state.feedback && <p className="mt-2 text-lg text-red-500">{state.feedback}</p>} {/* Display feedback */}
        </div>
      )}
    </div>
  );
}
