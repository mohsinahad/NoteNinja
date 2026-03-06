import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { insertNoteRequestSchema } from "@shared/schema";
import type { Folder } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Loader2, Sparkles, FileText, BookOpen, Paperclip, FolderIcon, List, AlignJustify, GraduationCap } from "lucide-react";

const formSchema = insertNoteRequestSchema.extend({
  subject: z.string().min(1, "Subject is required").max(200),
  description: z.string().min(10, "Please describe what the notes should cover (at least 10 characters)").max(2000),
  pageCount: z.coerce.number().min(1, "At least 1 page").max(250, "Maximum 250 pages"),
  noteStyle: z.enum(["bullet", "compact"]).default("bullet"),
  gradeLevel: z.string().nullable().optional(),
  resources: z.string().max(10000).nullable().optional(),
  folderId: z.coerce.number().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateNotes() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: folders } = useQuery<Folder[]>({
    queryKey: ["/api/folders"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      description: "",
      pageCount: 3,
      noteStyle: "bullet",
      gradeLevel: null,
      resources: "",
      folderId: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await apiRequest("POST", "/api/notes", {
        ...values,
        gradeLevel: values.gradeLevel || null,
        resources: values.resources || null,
        folderId: values.folderId || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({ title: "Notes are being generated!", description: "This may take a moment." });
      navigate("/");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create notes", description: err.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  const pageCount = form.watch("pageCount");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Notes
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-create-title">
            Create New Notes
          </h1>
          <p className="text-muted-foreground mt-1">
            Describe your subject and let AI generate comprehensive study notes
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Subject
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Organic Chemistry, World War II, Machine Learning"
                          data-testid="input-subject"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The topic or subject for your notes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Description
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what you want the notes to cover. For example: 'Cover the main reactions in organic chemistry including substitution, elimination, and addition reactions. Focus on reaction mechanisms and how to identify them.'"
                          className="min-h-[120px] resize-y"
                          data-testid="input-description"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Be specific about what topics, concepts, or areas you want covered
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pageCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Number of Pages
                        </span>
                        <span className="text-sm font-medium text-primary" data-testid="text-page-count">
                          {pageCount} {pageCount === 1 ? "page" : "pages"}
                        </span>
                      </FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          <Slider
                            min={1}
                            max={250}
                            step={1}
                            value={[field.value]}
                            onValueChange={(v) => field.onChange(v[0])}
                            className="flex-1"
                            data-testid="slider-pages"
                          />
                          <Input
                            type="number"
                            min={1}
                            max={250}
                            value={field.value}
                            onChange={(e) => {
                              const v = parseInt(e.target.value);
                              if (!isNaN(v) && v >= 1 && v <= 250) field.onChange(v);
                            }}
                            className="w-20"
                            data-testid="input-page-count"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        More pages means more detailed and comprehensive notes (1-250)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="noteStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <List className="w-4 h-4" />
                        Note Style
                      </FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => field.onChange("bullet")}
                            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                              field.value === "bullet"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/30"
                            }`}
                            data-testid="button-style-bullet"
                          >
                            <List className={`w-6 h-6 ${field.value === "bullet" ? "text-primary" : "text-muted-foreground"}`} />
                            <span className={`text-sm font-medium ${field.value === "bullet" ? "text-primary" : "text-foreground"}`}>
                              Bullet Points
                            </span>
                            <span className="text-xs text-muted-foreground text-center">
                              Organized bullets, easy to scan
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => field.onChange("compact")}
                            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                              field.value === "compact"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/30"
                            }`}
                            data-testid="button-style-compact"
                          >
                            <AlignJustify className={`w-6 h-6 ${field.value === "compact" ? "text-primary" : "text-muted-foreground"}`} />
                            <span className={`text-sm font-medium ${field.value === "compact" ? "text-primary" : "text-foreground"}`}>
                              Tightly Packed
                            </span>
                            <span className="text-xs text-muted-foreground text-center">
                              Dense paragraphs, more detail
                            </span>
                          </button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Choose how your notes are formatted
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gradeLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        Grade Level
                        <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                      </FormLabel>
                      <Select
                        value={field.value || "none"}
                        onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-grade-level">
                            <SelectValue placeholder="Any level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none" data-testid="select-grade-none">Any level</SelectItem>
                          <SelectItem value="elementary" data-testid="select-grade-elementary">Elementary School (K-5)</SelectItem>
                          <SelectItem value="middle" data-testid="select-grade-middle">Middle School (6-8)</SelectItem>
                          <SelectItem value="high" data-testid="select-grade-high">High School (9-12)</SelectItem>
                          <SelectItem value="college" data-testid="select-grade-college">College / University</SelectItem>
                          <SelectItem value="graduate" data-testid="select-grade-graduate">Graduate / Professional</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The AI will adjust vocabulary and complexity to match your grade level
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {folders && folders.length > 0 && (
                  <FormField
                    control={form.control}
                    name="folderId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <FolderIcon className="w-4 h-4" />
                          Folder
                          <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                        </FormLabel>
                        <Select
                          value={field.value ? String(field.value) : "none"}
                          onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-folder">
                              <SelectValue placeholder="No folder" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none" data-testid="select-folder-none">No folder</SelectItem>
                            {folders.map((f) => (
                              <SelectItem key={f.id} value={String(f.id)} data-testid={`select-folder-${f.id}`}>
                                {f.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Organize this note into a folder
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="resources"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4" />
                        Resources
                        <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Paste any resources here — practice tests, study guides, textbook excerpts, lecture notes, or any other reference material. The AI will analyze them and incorporate the relevant knowledge into your notes."
                          className="min-h-[160px] resize-y"
                          data-testid="input-resources"
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        The AI will use these resources to identify important topics and enrich your notes — the content won't appear directly
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={createMutation.isPending}
              data-testid="button-generate"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Notes...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Notes
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
