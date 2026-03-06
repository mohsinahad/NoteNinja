import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Users,
  FileText,
  BarChart3,
  TrendingUp,
  Download,
  Activity,
  BookOpen,
  ClipboardList,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Loader2,
  Mail,
  ChevronDown,
  ChevronUp,
  Calendar,
  GraduationCap,
  Palette,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const ADMIN_EMAIL = "ahmedsopori@gmail.com";

interface PeriodData {
  notes: number;
  eventCounts: Array<{ eventType: string; count: number }>;
  topSubjects: Array<{ subject: string; count: number }>;
  gradeDistribution: Array<{ gradeLevel: string | null; count: number }>;
  styleDistribution: Array<{ noteStyle: string; count: number }>;
  packDownloads: Array<{ pack: string; count: number; percent: number }>;
  folderStats: Array<{ name: string; count: number }>;
  dayOfWeekActivity: Array<{ day: string; dayNum: number; count: number }>;
  dailyActivity: Array<{ day: string; count: number }>;
}

interface AnalyticsSummary {
  totalUsers: number;
  week: PeriodData;
  month: PeriodData;
  year: PeriodData;
  allTime: PeriodData;
}

type TimePeriod = "week" | "month" | "year" | "allTime";

const PERIOD_LABELS: Record<TimePeriod, string> = {
  week: "This Week",
  month: "This Month",
  year: "This Year",
  allTime: "All Time",
};

const EVENT_LABELS: Record<string, string> = {
  page_view: "Page Views",
  note_created: "Notes Created",
  study_guide_generated: "Study Guides",
  quiz_generated: "Quizzes",
  note_refined: "Notes Refined",
  pack_download: "Pack Downloads",
};

const EVENT_ICONS: Record<string, { icon: any; color: string }> = {
  note_created: { icon: FileText, color: "text-blue-500" },
  study_guide_generated: { icon: ClipboardList, color: "text-green-500" },
  quiz_generated: { icon: HelpCircle, color: "text-purple-500" },
  note_refined: { icon: Sparkles, color: "text-amber-500" },
  pack_download: { icon: Download, color: "text-cyan-500" },
  page_view: { icon: Activity, color: "text-gray-400" },
};

const GRADE_LABELS: Record<string, string> = {
  elementary: "Elementary",
  middle: "Middle School",
  high: "High School",
  college: "College",
  graduate: "Graduate",
};

const DAY_NAMES_ORDERED = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];

function BarChartSimple({ data, labelKey, valueKey, color = "bg-primary", labelMap }: {
  data: Array<any>;
  labelKey: string;
  valueKey: string;
  color?: string;
  labelMap?: Record<string, string>;
}) {
  const maxVal = Math.max(...data.map(d => Number(d[valueKey])), 1);
  return (
    <div className="space-y-2">
      {data.map((item, i) => {
        const val = Number(item[valueKey]);
        const percent = Math.max((val / maxVal) * 100, 2);
        const label = labelMap ? (labelMap[item[labelKey]] || item[labelKey] || "Unset") : item[labelKey];
        return (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium truncate mr-2">{label}</span>
              <span className="text-muted-foreground">{val}</span>
            </div>
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full ${color} rounded-full transition-all duration-500`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExpandableCard({ title, icon: Icon, summary, children, testId }: {
  title: string;
  icon?: any;
  summary?: string;
  children: React.ReactNode;
  testId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="overflow-hidden border-muted/60 shadow-sm" data-testid={testId}>
      <CardHeader
        className="p-4 cursor-pointer hover:bg-muted/30 transition-colors flex flex-row items-center justify-between space-y-0"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {Icon && <div className="p-2 bg-primary/5 rounded-lg"><Icon className="w-4 h-4 text-primary" /></div>}
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {summary && !expanded && <p className="text-[10px] text-muted-foreground mt-0.5">{summary}</p>}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </CardHeader>
      {expanded && (
        <CardContent className="p-4 pt-0 border-t border-muted/40 bg-muted/5 animate-in slide-in-from-top-2 duration-200">
          <div className="pt-4">
            {children}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function PeriodSection({ data, period }: { data: PeriodData; period: TimePeriod }) {
  const totalActivity = data.eventCounts.reduce((s, e) => s + e.count, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Notes</p>
            <p className="text-2xl font-bold text-primary">{data.notes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Activity Events</p>
            <p className="text-2xl font-bold">{totalActivity}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Quizzes Taken</p>
            <p className="text-2xl font-bold">{data.eventCounts.find(e => e.eventType === "quiz_generated")?.count || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Pack Downloads</p>
            <p className="text-2xl font-bold">{data.eventCounts.find(e => e.eventType === "pack_download")?.count || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Weekly Activity Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-end justify-between h-40 gap-2">
              {DAY_NAMES_ORDERED.map((day, i) => {
                const dayNum = DOW_ORDER[i];
                const dayData = data.dayOfWeekActivity.find(d => d.dayNum === dayNum);
                const count = dayData ? dayData.count : 0;
                const maxDayVal = Math.max(...data.dayOfWeekActivity.map(d => d.count), 1);
                const height = (count / maxDayVal) * 100;
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full relative flex items-end justify-center h-full">
                      <div
                        className="w-full max-w-[32px] bg-primary/20 group-hover:bg-primary/40 rounded-t transition-all duration-500"
                        style={{ height: `${height}%` }}
                      >
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] py-1 px-2 rounded shadow-sm border whitespace-nowrap z-10">
                          {count} events
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">{day.substring(0, 3)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <ExpandableCard
          title="Activity Timeline"
          icon={Activity}
          summary={`${data.dailyActivity.length} active days`}
          testId={`card-timeline-${period}`}
        >
          <div className="space-y-3">
            {data.dailyActivity.length > 0 ? (
              data.dailyActivity.slice().reverse().map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-muted/40 last:border-0">
                  <span className="font-medium">{d.day}</span>
                  <Badge variant="secondary" className="text-[10px]">{d.count} events</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No activity recorded yet</p>
            )}
          </div>
        </ExpandableCard>

        <ExpandableCard
          title="Activity Breakdown"
          icon={BarChart3}
          summary={`${data.eventCounts.length} event types`}
          testId={`card-breakdown-${period}`}
        >
          {data.eventCounts.length > 0 ? (
            <div className="space-y-4">
              {data.eventCounts.map((event, i) => {
                const label = EVENT_LABELS[event.eventType] || event.eventType;
                const config = EVENT_ICONS[event.eventType] || { icon: Activity, color: "text-primary" };
                const Icon = config.icon;
                const percent = Math.round((event.count / totalActivity) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{label}</span>
                        <span className="text-muted-foreground">{event.count} ({percent}%)</span>
                      </div>
                      <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No events tracked yet</p>
          )}
        </ExpandableCard>

        <ExpandableCard
          title="Most Popular Topics"
          icon={BookOpen}
          summary={`${data.topSubjects.length} subjects`}
          testId={`card-subjects-${period}`}
        >
          {data.topSubjects.length > 0 ? (
            <BarChartSimple data={data.topSubjects.slice(0, 8)} labelKey="subject" valueKey="count" color="bg-blue-500" />
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No notes created yet</p>
          )}
        </ExpandableCard>

        <ExpandableCard
          title="Content Pack Downloads"
          icon={Download}
          summary={`${data.packDownloads.reduce((s, p) => s + p.count, 0)} downloads`}
          testId={`card-packs-${period}`}
        >
          {data.packDownloads.length > 0 ? (
            <div className="space-y-3">
              {data.packDownloads.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm truncate flex-1">{p.pack}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium">{p.count}</span>
                    <span className="text-[10px] text-muted-foreground w-8 text-right">{p.percent}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No pack downloads yet</p>
          )}
        </ExpandableCard>

        <ExpandableCard
          title="Grade Distribution"
          icon={GraduationCap}
          summary={`${data.gradeDistribution.length} levels`}
          testId={`card-grades-${period}`}
        >
          {data.gradeDistribution.length > 0 ? (
            <BarChartSimple
              data={data.gradeDistribution.map(g => ({
                label: GRADE_LABELS[g.gradeLevel || ""] || g.gradeLevel || "Unset",
                count: g.count,
              }))}
              labelKey="label"
              valueKey="count"
              color="bg-emerald-500"
            />
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No grade level data yet</p>
          )}
        </ExpandableCard>

        <ExpandableCard
          title="Folder Usage"
          icon={BookOpen}
          summary={`${data.folderStats.length} folders`}
          testId={`card-folders-${period}`}
        >
          {data.folderStats.length > 0 ? (
            <BarChartSimple
              data={data.folderStats}
              labelKey="name"
              valueKey="count"
              color="bg-indigo-500"
            />
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No folders created yet</p>
          )}
        </ExpandableCard>

        <ExpandableCard
          title="Note Style Distribution"
          icon={Palette}
          summary={`${data.styleDistribution.length} styles`}
          testId={`card-styles-${period}`}
        >
          {data.styleDistribution.length > 0 ? (
            <BarChartSimple
              data={data.styleDistribution.map(s => ({
                label: s.noteStyle === "bullet" ? "Bullet Points" : s.noteStyle === "compact" ? "Packed Paragraphs" : s.noteStyle,
                count: s.count,
              }))}
              labelKey="label"
              valueKey="count"
              color="bg-violet-500"
            />
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No style data yet</p>
          )}
        </ExpandableCard>
      </div>
    </div>
  );
}

export default function Admin() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TimePeriod>("week");

  const { data: summary, isLoading, refetch } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/admin/analytics"],
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/seed-example");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Example data seeded", description: "The dashboard is now populated with sample data." });
      refetch();
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/send-weekly-email");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email report sent", description: "The weekly analytics report has been sent to admin." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send email", description: err.message, variant: "destructive" });
    },
  });

  if (user?.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 flex flex-col items-center text-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <h2 className="text-xl font-bold mb-2">Admin Access Only</h2>
            <p className="text-muted-foreground text-sm mb-6">
              This area is restricted to administrators.
            </p>
            <Button onClick={() => navigate("/")} variant="outline">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Monitor NoteNinja platform activity</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendEmailMutation.mutate()}
              disabled={sendEmailMutation.isPending}
            >
              {sendEmailMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Send Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              {seedMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Seed Data
            </Button>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : summary ? (
          <div className="space-y-8">
            <div className="flex items-center gap-4 border-b pb-1 overflow-x-auto print:hidden">
              {(Object.keys(PERIOD_LABELS) as TimePeriod[]).map(period => (
                <button
                  key={period}
                  onClick={() => setActiveTab(period)}
                  className={`pb-3 px-1 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    activeTab === period
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {PERIOD_LABELS[period]}
                </button>
              ))}
            </div>

            <PeriodSection data={summary[activeTab]} period={activeTab} />
          </div>
        ) : (
          <Card>
            <CardContent className="py-20 text-center">
              <p className="text-muted-foreground">Failed to load analytics data.</p>
              <Button onClick={() => refetch()} variant="link">Try again</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
