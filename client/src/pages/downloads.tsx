import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Download,
  Calculator,
  Loader2,
  FolderOpen,
  FileText,
  CheckCircle2,
  Globe,
  Trophy,
  FlaskConical,
  BookOpen,
  Code,
} from "lucide-react";

interface ContentPack {
  id: string;
  title: string;
  description: string;
  icon: string;
  noteCount: number;
  rootFolderName: string;
  grades: {
    name: string;
    subjects: {
      name: string;
      topics: { title: string; description: string; pages: number }[];
    }[];
  }[];
}

function getPackIcon(icon: string, size: string = "w-5 h-5") {
  const cls = `${size} text-primary`;
  switch (icon) {
    case "calculator":
      return <Calculator className={cls} />;
    case "globe":
      return <Globe className={cls} />;
    case "trophy":
      return <Trophy className={cls} />;
    case "flask":
      return <FlaskConical className={cls} />;
    case "book":
      return <BookOpen className={cls} />;
    case "code":
      return <Code className={cls} />;
    default:
      return <FileText className={cls} />;
  }
}

export default function Downloads() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: packs, isLoading } = useQuery<ContentPack[]>({
    queryKey: ["/api/content-packs"],
  });

  const downloadMutation = useMutation({
    mutationFn: async (packId: string) => {
      const res = await apiRequest("POST", `/api/content-packs/${packId}/download`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      toast({
        title: "Download started!",
        description: data.message,
        duration: 8000,
      });
      navigate("/");
    },
    onError: (error: any) => {
      toast({
        title: "Download failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-3"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Notes
          </Button>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Free Downloads
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pre-made note packs — AI generates all the notes for you
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="packs-grid">
            {packs?.map((pack) => (
              <Card
                key={pack.id}
                className="hover-elevate transition-all duration-200 group"
                data-testid={`card-pack-${pack.id}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {getPackIcon(pack.icon)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm leading-tight truncate" data-testid={`text-pack-title-${pack.id}`}>
                        {pack.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">
                          {pack.noteCount} notes
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          Free
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2" data-testid={`text-pack-description-${pack.id}`}>
                    {pack.description}
                  </p>
                  <div className="text-[11px] text-muted-foreground mb-2.5 line-clamp-2">
                    {pack.grades.map((g) => g.name).join(" · ")}
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => downloadMutation.mutate(pack.id)}
                    disabled={downloadMutation.isPending}
                    data-testid={`button-download-${pack.id}`}
                  >
                    {downloadMutation.isPending ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3 mr-1" />
                    )}
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}

            {packs && packs.length === 0 && (
              <div className="col-span-full">
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No content packs available yet. Check back soon!</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
