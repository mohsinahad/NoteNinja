import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { NoteRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { renderSafeMarkdown } from "@/lib/markdown";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  Printer,
  Copy,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
  Send,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";

function NotesSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-64 bg-muted rounded"></div>
      <div className="h-4 w-full bg-muted rounded"></div>
      <div className="h-4 w-3/4 bg-muted rounded"></div>
      <Card>
        <CardContent className="p-8 space-y-4">
          <div className="h-4 w-full bg-muted rounded"></div>
          <div className="h-4 w-full bg-muted rounded"></div>
          <div className="h-4 w-2/3 bg-muted rounded"></div>
          <div className="h-4 w-full bg-muted rounded"></div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExportButtons({ note }: { note: NoteRequest }) {
  const { toast } = useToast();

  const handleCopy = () => {
    if (!note.generatedContent) return;
    navigator.clipboard.writeText(note.generatedContent);
    toast({ title: "Copied!", description: "Notes copied to clipboard." });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadText = () => {
    if (!note.generatedContent) return;
    const blob = new Blob([note.generatedContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.subject.replace(/\s+/g, "_")}_notes.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap print:hidden">
      <Button variant="outline" size="sm" onClick={handleCopy} data-testid="button-copy">
        <Copy className="w-3.5 h-3.5 mr-1.5" />
        Copy
      </Button>
      <Button variant="outline" size="sm" onClick={handleDownloadText} data-testid="button-download">
        <Download className="w-3.5 h-3.5 mr-1.5" />
        Text
      </Button>
      <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print">
        <Printer className="w-3.5 h-3.5 mr-1.5" />
        Print/PDF
      </Button>
    </div>
  );
}

function FollowUpAI({ noteId }: { noteId: number }) {
  const { toast } = useToast();
  const [instruction, setInstruction] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", `/api/notes/${noteId}/refine`, { instruction: text });
      return res.json();
    },
    onSuccess: () => {
      setInstruction("");
      queryClient.invalidateQueries({ queryKey: ["/api/notes", noteId.toString()] });
      toast({ title: "Notes updated!", description: "The AI has refined your study notes." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to refine notes", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3 print:hidden">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Refine with AI</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3 print:hidden">
          Ask the AI to change the tone, add more detail on a specific sub-topic, or simplify complex sections.
        </p>
        <div className="flex gap-2 print:hidden">
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g., 'Make it simpler for a 6th grader' or 'Add more detail about photosynthesis'"
            className="min-h-[80px] text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && instruction.trim()) {
                e.preventDefault();
                mutation.mutate(instruction);
              }
            }}
          />
          <Button
            size="icon"
            className="h-auto px-3"
            disabled={!instruction.trim() || mutation.isPending}
            onClick={() => mutation.mutate(instruction)}
            data-testid="button-refine-notes"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuizQuestion {
  type: "multiple_choice" | "true_false" | "short_answer";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  keywords?: string[];
}

function QuizGenerator({ noteId, subject }: { noteId: string; subject: string }) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [shortAnswer, setShortAnswer] = useState("");
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Array<{ selected: number | string; correct: boolean }>>([]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/notes/${noteId}/quiz`);
      return res.json();
    },
    onSuccess: (data: { questions: QuizQuestion[] }) => {
      setQuestions(data.questions);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setShortAnswer("");
      setAnswered(false);
      setScore(0);
      setFinished(false);
      setAnsweredQuestions([]);
      toast({ title: "Quiz ready!", description: `${data.questions.length} questions generated.` });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to generate quiz", description: err.message, variant: "destructive" });
    },
  });

  const handleSelect = (optionIndex: number) => {
    if (answered) return;
    setSelectedAnswer(optionIndex);
  };

  const handleSubmit = () => {
    const current = questions[currentIndex];
    let isCorrect = false;
    let selected: number | string = -1;

    if (current.type === "short_answer") {
      selected = shortAnswer;
      const text = shortAnswer.toLowerCase();
      const keywords = current.keywords || [];
      const matches = keywords.filter(k => text.includes(k.toLowerCase()));
      isCorrect = matches.length >= Math.min(2, keywords.length);
    } else {
      if (selectedAnswer === null) return;
      selected = selectedAnswer;
      isCorrect = selectedAnswer === current.correctIndex;
    }

    setAnswered(true);
    if (isCorrect) setScore(s => s + 1);
    setAnsweredQuestions(prev => [...prev, { selected, correct: isCorrect }]);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
      setShortAnswer("");
      setAnswered(false);
    }
  };

  const resetQuiz = () => {
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShortAnswer("");
    setAnswered(false);
    setScore(0);
    setFinished(false);
    setAnsweredQuestions([]);
  };

  const current = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + (answered ? 1 : 0)) / questions.length) * 100 : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3 print:hidden">
          <HelpCircle className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Interactive Quiz</span>
        </div>

        {questions.length === 0 && !finished ? (
          <>
            <p className="text-xs text-muted-foreground mb-3 print:hidden">
              Test yourself with an interactive quiz. Answer multiple choice, true/false, and short answer questions with AI grading.
            </p>
            <Button
              className="print:hidden"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              data-testid="button-generate-quiz"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                <>
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Start Quiz
                </>
              )}
            </Button>
          </>
        ) : finished ? (
          <div className="space-y-6" data-testid="quiz-results">
            <div className="text-center py-6">
              <div className="text-5xl font-bold text-primary mb-2" data-testid="text-quiz-score">
                {score}/{questions.length}
              </div>
              <p className="text-lg text-muted-foreground mb-1">
                {score === questions.length ? "Perfect score!" : score >= questions.length * 0.8 ? "Great job!" : score >= questions.length * 0.6 ? "Good effort!" : "Keep studying!"}
              </p>
              <p className="text-sm text-muted-foreground">
                You got {Math.round((score / questions.length) * 100)}% correct
              </p>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              <p className="text-sm font-medium">Review:</p>
              {questions.map((q, i) => {
                const result = answeredQuestions[i];
                return (
                  <div key={i} className={`p-3 rounded-lg border text-sm ${result?.correct ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"}`} data-testid={`quiz-review-${i}`}>
                    <div className="flex items-start gap-2">
                      <span className={`text-xs font-bold mt-0.5 ${result?.correct ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {result?.correct ? "✓" : "✗"}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-xs mb-1">Q{i + 1}: {q.question}</p>
                        <p className="text-xs text-muted-foreground">
                          {q.type === "short_answer" ? `Your answer: ${result?.selected}` : `Your answer: ${q.options[Number(result?.selected ?? 0)]} — Correct: ${q.options[q.correctIndex]}`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={resetQuiz} data-testid="button-regenerate-quiz">
                <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                New Quiz
              </Button>
            </div>
          </div>
        ) : current ? (
          <div className="space-y-4" data-testid="quiz-active">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span data-testid="text-quiz-running-score">Score: {score}/{currentIndex + (answered ? 1 : 0)}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
                data-testid="quiz-progress-bar"
              />
            </div>

            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px]">
                {current.type === "multiple_choice" ? "Multiple Choice" : current.type === "true_false" ? "True / False" : "Short Answer"}
              </Badge>
            </div>

            <p className="text-sm font-medium leading-relaxed" data-testid="text-quiz-question">
              {current.question}
            </p>

            {current.type === "short_answer" ? (
              <div className="space-y-2">
                <Textarea
                  value={shortAnswer}
                  onChange={(e) => setShortAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  disabled={answered}
                  className="min-h-[100px] text-sm"
                />
              </div>
            ) : (
              <div className="space-y-2">
                {current.options.map((option, i) => {
                  let className = "w-full text-left p-3 rounded-lg border text-sm transition-all ";
                  if (answered) {
                    if (i === current.correctIndex) {
                      className += "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-medium";
                    } else if (i === selectedAnswer && i !== current.correctIndex) {
                      className += "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300";
                    } else {
                      className += "border-muted bg-muted/30 text-muted-foreground opacity-50";
                    }
                  } else if (i === selectedAnswer) {
                    className += "border-primary bg-primary/10 text-primary ring-2 ring-primary/20";
                  } else {
                    className += "border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer";
                  }

                  return (
                    <button
                      key={i}
                      className={className}
                      onClick={() => handleSelect(i)}
                      disabled={answered}
                      data-testid={`quiz-option-${i}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium shrink-0">
                          {current.type === "multiple_choice" ? String.fromCharCode(65 + i) : (i === 0 ? "T" : "F")}
                        </span>
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {answered && (
              <div className={`p-3 rounded-lg text-sm ${selectedAnswer === current.correctIndex || (current.type === "short_answer" && answeredQuestions[currentIndex]?.correct) ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"}`} data-testid="quiz-feedback">
                <p className={`font-medium mb-1 ${selectedAnswer === current.correctIndex || (current.type === "short_answer" && answeredQuestions[currentIndex]?.correct) ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
                  {selectedAnswer === current.correctIndex || (current.type === "short_answer" && answeredQuestions[currentIndex]?.correct) ? "Correct!" : "Incorrect"}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-quiz-explanation">
                  {current.explanation}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 print:hidden">
              {!answered ? (
                <Button
                  onClick={handleSubmit}
                  disabled={current.type === "short_answer" ? !shortAnswer.trim() : selectedAnswer === null}
                  size="sm"
                  data-testid="button-submit-answer"
                >
                  Check Answer
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  size="sm"
                  data-testid="button-next-question"
                >
                  {currentIndex + 1 >= questions.length ? "See Results" : "Next Question"}
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function ViewNotes() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/notes/:id");
  const noteId = params?.id;

  const { data: note, isLoading } = useQuery<NoteRequest>({
    queryKey: ["/api/notes", noteId],
    enabled: !!noteId,
    refetchInterval: (query) => {
      const data = query.state.data as NoteRequest | undefined;
      if (data && (data.status === "generating" || data.status === "pending")) {
        return 3000;
      }
      return false;
    },
  });

  if (!match) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Notes
          </Button>
        </div>

        {isLoading ? (
          <NotesSkeleton />
        ) : !note ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-1">Notes not found</h2>
              <p className="text-muted-foreground text-sm mb-4">
                The notes you're looking for don't exist or have been deleted.
              </p>
              <Button onClick={() => navigate("/")} data-testid="button-go-home">
                Go Back
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <BookOpen className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight" data-testid="text-note-subject">
                  {note.subject}
                </h1>
                {note.status === "completed" ? (
                  <Badge variant="default" className="bg-emerald-600 dark:bg-emerald-500" data-testid="badge-status-completed">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Ready
                  </Badge>
                ) : note.status === "generating" ? (
                  <Badge variant="secondary" data-testid="badge-status-generating">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Generating
                  </Badge>
                ) : note.status === "error" ? (
                  <Badge variant="destructive" data-testid="badge-status-error">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Error
                  </Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground text-sm" data-testid="text-note-description">
                {note.description}
              </p>
              <div className="flex items-center gap-4 flex-wrap mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1" data-testid="text-note-pages">
                  <FileText className="w-3.5 h-3.5" />
                  {note.pageCount} {note.pageCount === 1 ? "page" : "pages"}
                </span>
                {note.resources && (
                  <span className="flex items-center gap-1" data-testid="text-resources-included">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Resources incorporated
                  </span>
                )}
                <span className="flex items-center gap-1" data-testid="text-note-date">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
            </div>

            {note.status === "generating" || note.status === "pending" ? (
              <Card>
                <CardContent className="py-16 flex flex-col items-center text-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                  <h2 className="text-lg font-semibold mb-1">Generating your notes...</h2>
                  <p className="text-muted-foreground text-sm max-w-md">
                    The AI is creating comprehensive study notes. This may take a minute depending on the number of pages.
                  </p>
                </CardContent>
              </Card>
            ) : note.status === "error" ? (
              <Card>
                <CardContent className="py-16 flex flex-col items-center text-center">
                  <AlertCircle className="w-10 h-10 text-destructive mb-4" />
                  <h2 className="text-lg font-semibold mb-1">Generation failed</h2>
                  <p className="text-muted-foreground text-sm max-w-md">
                    Something went wrong while generating your notes. Please try again.
                  </p>
                </CardContent>
              </Card>
            ) : note.generatedContent ? (
              <div className="space-y-4">
                <Card className="print:shadow-none print:border-0">
                  <CardContent className="p-6 md:p-8">
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none
                        prose-headings:font-semibold prose-headings:tracking-tight
                        prose-h1:text-xl prose-h1:mb-4 prose-h1:mt-8 first:prose-h1:mt-0
                        prose-h2:text-lg prose-h2:mb-3 prose-h2:mt-6
                        prose-h3:text-base prose-h3:mb-2 prose-h3:mt-4
                        prose-p:leading-relaxed prose-p:mb-3
                        prose-li:leading-relaxed
                        prose-ul:my-2 prose-ol:my-2
                        prose-strong:text-foreground
                        prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground
                        prose-img:rounded-lg prose-img:shadow-md prose-img:my-4 prose-img:max-w-sm prose-img:mx-auto prose-img:block"
                      data-testid="text-note-content"
                      dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(note.generatedContent) }}
                    />
                  </CardContent>
                </Card>

                <ExportButtons note={note} />

                <div className="grid md:grid-cols-2 gap-6 mb-8 print:hidden">
                  <QuizGenerator noteId={noteId!} subject={note.subject} />
                  <FollowUpAI noteId={noteId!} />
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
