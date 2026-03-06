import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FolderOpen, FileText, ArrowRight, Zap, Shield, ClipboardList, HelpCircle, GraduationCap, Download, Image, Swords } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">NoteNinja</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild data-testid="button-login-nav">
              <a href="/api/login">Log in</a>
            </Button>
            <Button asChild data-testid="button-signup-nav">
              <a href="/api/login">Get Started</a>
            </Button>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge variant="secondary" className="text-xs px-3 py-1 font-medium" data-testid="badge-tagline">
              Be Sneaky Smart
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight" data-testid="text-hero-title">
              Study Like a{" "}
              <span className="text-primary">Ninja</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              NoteNinja turns any topic into killer study notes, quizzes, and study guides — instantly. Just tell it what you need, pick your grade level, and let the AI do the heavy lifting. Your secret weapon for acing any test.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <Button size="lg" asChild className="shadow-lg text-base" data-testid="button-get-started">
                <a href="/api/login">
                  Start Studying Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground pt-2">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-500" />
                100% free
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                No credit card needed
              </span>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl blur-3xl" />
              <Card className="relative ring-1 ring-black/5 dark:ring-white/10 hover:scale-[1.02] transition-transform duration-300" data-testid="card-hero-example">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                      <Sparkles className="w-5 h-5" />
                      <span className="font-medium text-sm">AI Generated Notes</span>
                    </div>
                    <Badge variant="default" className="bg-emerald-600 text-xs">Ready</Badge>
                  </div>
                  <h3 className="font-bold text-lg">Greatest Soccer Players of All Time</h3>
                  <div className="space-y-2.5 text-sm text-muted-foreground">
                    <div>
                      <p className="font-semibold text-foreground text-xs mb-0.5">Lionel Messi</p>
                      <p className="text-xs leading-relaxed">Argentine forward widely regarded as the greatest of all time. 8x Ballon d'Or winner, 2022 FIFA World Cup champion. Known for his extraordinary dribbling, vision, and goal-scoring ability...</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-xs mb-0.5">Cristiano Ronaldo</p>
                      <p className="text-xs leading-relaxed">Portuguese forward with 5 Ballon d'Or awards and 5 UEFA Champions League titles. Record international goalscorer with incredible athleticism and work ethic...</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-xs mb-0.5">Pel&eacute;</p>
                      <p className="text-xs leading-relaxed">Brazilian legend and 3x World Cup winner (1958, 1962, 1970). Scored over 1,000 career goals. Revolutionized the sport with creativity and flair...</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-xs mb-0.5">Diego Maradona</p>
                      <p className="text-xs leading-relaxed">Argentine icon who led his country to the 1986 World Cup. Famous for the "Hand of God" and "Goal of the Century" in the same match...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      5 pages
                    </span>
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      Middle School
                    </span>
                    <span className="flex items-center gap-1">
                      <Image className="w-3 h-3" />
                      Diagrams included
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative mt-3 ring-1 ring-black/5 dark:ring-white/10" data-testid="card-hero-tools">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                      <ClipboardList className="w-3.5 h-3.5" />
                      Create Study Guide
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Create Quiz
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-muted-foreground text-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                      Adjust with AI
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-muted-foreground text-xs">
                      <Download className="w-3.5 h-3.5" />
                      Export
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 border-t bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Your secret weapons for studying
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Everything you need to crush your next test
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-background/50 hover:bg-background transition-colors duration-200">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">AI-Powered Notes</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Generate up to 250 pages of detailed study notes with diagrams and charts on any subject. Like having a tutor that never sleeps.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background/50 hover:bg-background transition-colors duration-200">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Study Guide Generator</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Turn any notes into a practice study guide with questions and answer keys. Perfect for the night before a big test.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background/50 hover:bg-background transition-colors duration-200">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Quiz Generator</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Create real quizzes with multiple choice, true/false, fill-in-the-blank, and short answer — plus answer keys to check yourself.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background/50 hover:bg-background transition-colors duration-200">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Matches Your Level</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Pick your grade level and the AI writes notes you can actually understand — no confusing college-level stuff unless you want it.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background/50 hover:bg-background transition-colors duration-200">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Add Your Resources</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Paste in your teacher's study guide or practice test and the AI uses it to make your notes even better.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background/50 hover:bg-background transition-colors duration-200">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Folders & Free Packs</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Keep everything organized in folders. Grab free content packs on Math, Science, History, CS, and more.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 border-t">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4" />
            <span>NoteNinja</span>
          </div>
          <p>&copy; {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
