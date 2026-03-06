import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { NoteRequest, Folder } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  FileText,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  FolderIcon,
  FolderOpen,
  MoreVertical,
  Pencil,
  FolderPlus,
  FolderInput,
  LogOut,
  Download,
  ChevronRight,
  Sparkles,
  X,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="default" className="bg-emerald-600 dark:bg-emerald-500">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Ready
        </Badge>
      );
    case "generating":
      return (
        <Badge variant="secondary">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Generating
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 mr-1" />
          Error
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
  }
}

function NoteCard({ note, folders }: { note: NoteRequest; folders: Folder[] }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/notes/${note.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({ title: "Notes deleted" });
    },
  });

  const moveMutation = useMutation({
    mutationFn: async (folderId: number | null) => {
      await apiRequest("PATCH", `/api/notes/${note.id}/folder`, { folderId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({ title: "Notes moved" });
    },
  });

  return (
    <Card
      className="hover-elevate cursor-pointer transition-all duration-200 group"
      data-testid={`card-note-${note.id}`}
      onClick={() => {
        if (note.status === "completed") {
          navigate(`/notes/${note.id}`);
        }
      }}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
              <h3
                className="font-semibold text-base truncate"
                data-testid={`text-subject-${note.id}`}
              >
                {note.subject}
              </h3>
              <StatusBadge status={note.status} />
            </div>
            <p
              className="text-sm text-muted-foreground line-clamp-2 mb-3"
              data-testid={`text-description-${note.id}`}
            >
              {note.description}
            </p>
            <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                {note.pageCount} {note.pageCount === 1 ? "page" : "pages"}
              </span>
              {note.resources && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Resources included
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {format(new Date(note.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {folders.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    data-testid={`button-move-${note.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FolderInput className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                  {note.folderId && (
                    <DropdownMenuItem
                      onClick={() => moveMutation.mutate(null)}
                      data-testid={`button-move-unfiled-${note.id}`}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Remove from folder
                    </DropdownMenuItem>
                  )}
                  {folders
                    .filter((f) => f.id !== note.folderId)
                    .map((f) => (
                      <DropdownMenuItem
                        key={f.id}
                        onClick={() => moveMutation.mutate(f.id)}
                        data-testid={`button-move-to-${f.id}-${note.id}`}
                      >
                        <FolderIcon className="w-4 h-4 mr-2" />
                        {f.name}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {note.status === "completed" && (
              <Button
                size="icon"
                variant="ghost"
                data-testid={`button-view-${note.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/notes/${note.id}`);
                }}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              data-testid={`button-delete-${note.id}`}
              onClick={(e) => {
                e.stopPropagation();
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NotesListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function countFolderItems(folderId: number, notes: NoteRequest[], allFolders: Folder[]): { noteCount: number; folderCount: number } {
  const directNotes = notes.filter((n) => n.folderId === folderId).length;
  const childFolders = allFolders.filter((f) => f.parentId === folderId);
  let totalNotes = directNotes;
  let totalFolders = childFolders.length;
  for (const child of childFolders) {
    const sub = countFolderItems(child.id, notes, allFolders);
    totalNotes += sub.noteCount;
    totalFolders += sub.folderCount;
  }
  return { noteCount: totalNotes, folderCount: totalFolders };
}

function FolderTile({
  folder,
  notes,
  allFolders,
  onOpen,
  onRename,
  onDelete,
}: {
  folder: Folder;
  notes: NoteRequest[];
  allFolders: Folder[];
  onOpen: (id: number) => void;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number) => void;
}) {
  const { noteCount, folderCount } = countFolderItems(folder.id, notes, allFolders);

  return (
    <Card
      className="hover-elevate cursor-pointer transition-all duration-200 group"
      data-testid={`folder-tile-${folder.id}`}
      onClick={() => onOpen(folder.id)}
    >
      <CardContent className="px-2.5 py-1.5">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <FolderIcon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-medium text-xs truncate" data-testid={`text-folder-name-${folder.id}`}>
              {folder.name}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {noteCount}
            </span>
          </div>
          <div className="flex items-center shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  data-testid={`button-folder-menu-${folder.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={() => onRename(folder.id, folder.name)}
                  data-testid={`button-rename-folder-${folder.id}`}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(folder.id)}
                  className="text-destructive"
                  data-testid={`button-delete-folder-${folder.id}`}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AiWelcomeTip() {
  const [dismissed, setDismissed] = useState(false);
  const [tipDismissedBefore, setTipDismissedBefore] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("noteninja-tip-dismissed");
    if (stored) setTipDismissedBefore(true);
  }, []);

  const { data: tipData, isLoading } = useQuery<{ tip: string }>({
    queryKey: ["/api/ai-tip"],
    staleTime: 1000 * 60 * 30,
    enabled: !tipDismissedBefore,
  });

  if (dismissed || tipDismissedBefore) return null;

  return (
    <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4" data-testid="ai-welcome-tip">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-primary mb-1" data-testid="text-tip-label">Study Tip</p>
          {isLoading ? (
            <Skeleton className="h-4 w-full" />
          ) : (
            <p className="text-sm text-foreground/80" data-testid="text-tip-content">
              {tipData?.tip || "Create notes on any subject and the AI will generate comprehensive study material with diagrams and practice guides tailored to your grade level!"}
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setDismissed(true);
            sessionStorage.setItem("noteninja-tip-dismissed", "true");
          }}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          data-testid="button-dismiss-tip"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameDialog, setRenameDialog] = useState<{ id: number; name: string } | null>(null);
  const [renameName, setRenameName] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);

  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
  });

  const { data: notes, isLoading: notesLoading } = useQuery<NoteRequest[]>({
    queryKey: ["/api/notes"],
    refetchInterval: (query) => {
      const data = query.state.data as NoteRequest[] | undefined;
      if (data?.some((n) => n.status === "generating" || n.status === "pending")) {
        return 3000;
      }
      return false;
    },
  });

  const { data: folders, isLoading: foldersLoading } = useQuery<Folder[]>({
    queryKey: ["/api/folders"],
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const body: { name: string; parentId?: number } = { name };
      if (currentFolderId) body.parentId = currentFolderId;
      const res = await apiRequest("POST", "/api/folders", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      setShowNewFolder(false);
      setNewFolderName("");
      toast({ title: "Folder created" });
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await apiRequest("PATCH", `/api/folders/${id}`, { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      setRenameDialog(null);
      toast({ title: "Folder renamed" });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/folders/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      if (currentFolderId === deletedId) {
        setCurrentFolderId(null);
      }
      toast({ title: "Folder deleted", description: "Notes have been moved out of the folder." });
    },
  });

  const isLoading = notesLoading || foldersLoading;
  const allFolders = folders || [];
  const unfiledNotes = (notes || []).filter((n) => !n.folderId);
  const hasAnyNotes = notes && notes.length > 0;

  const currentFolder = currentFolderId ? allFolders.find((f) => f.id === currentFolderId) : null;
  const childFoldersOfCurrent = allFolders.filter((f) =>
    currentFolderId ? f.parentId === currentFolderId : !f.parentId
  );
  const notesInCurrentFolder = currentFolderId
    ? (notes || []).filter((n) => n.folderId === currentFolderId)
    : unfiledNotes;

  const getBreadcrumbs = (): Folder[] => {
    const crumbs: Folder[] = [];
    let fId = currentFolderId;
    while (fId) {
      const f = allFolders.find((folder) => folder.id === fId);
      if (f) {
        crumbs.unshift(f);
        fId = f.parentId;
      } else {
        break;
      }
    }
    return crumbs;
  };
  const breadcrumbs = getBreadcrumbs();

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User"
    : "User";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div className="flex items-center gap-3">
              {user?.profileImageUrl && (
                <img
                  src={user.profileImageUrl}
                  alt=""
                  className="w-9 h-9 rounded-full ring-1 ring-border"
                  data-testid="img-user-avatar"
                />
              )}
              <div>
                <p className="text-sm text-muted-foreground" data-testid="text-welcome">
                  Welcome back, <span className="font-medium text-foreground">{displayName}</span>
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          </div>
          <div className="flex items-end justify-between gap-4 flex-wrap mb-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
                My Notes
              </h1>
              <p className="text-muted-foreground mt-1">
                AI-powered study notes for any subject
              </p>
            </div>
            <div className="flex items-center gap-2">
              {adminCheck?.isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin")}
                  data-testid="button-admin"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => navigate("/downloads")}
                data-testid="button-downloads"
              >
                <Download className="w-4 h-4 mr-2" />
                Downloads
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowNewFolder(true)}
                data-testid="button-new-folder"
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                New Folder
              </Button>
              <Button
                onClick={() => navigate("/create")}
                data-testid="button-create-notes"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Notes
              </Button>
            </div>
          </div>
        </div>

        <AiWelcomeTip />

        {showNewFolder && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newFolderName.trim()) createFolderMutation.mutate(newFolderName.trim());
                }}
                className="flex items-center gap-3"
              >
                <FolderPlus className="w-5 h-5 text-muted-foreground shrink-0" />
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  autoFocus
                  data-testid="input-new-folder-name"
                />
                <Button
                  type="submit"
                  disabled={!newFolderName.trim() || createFolderMutation.isPending}
                  data-testid="button-create-folder"
                >
                  {createFolderMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}
                  data-testid="button-cancel-folder"
                >
                  Cancel
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {currentFolderId && (
          <div className="flex items-center justify-between gap-2 mb-4" data-testid="breadcrumb-nav">
            <div className="flex items-center gap-1.5 text-sm flex-wrap">
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setCurrentFolderId(null)}
                data-testid="button-breadcrumb-home"
              >
                My Notes
              </button>
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.id} className="flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  {i === breadcrumbs.length - 1 ? (
                    <span className="font-medium" data-testid={`text-breadcrumb-current-${crumb.id}`}>{crumb.name}</span>
                  ) : (
                    <button
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setCurrentFolderId(crumb.id)}
                      data-testid={`button-breadcrumb-${crumb.id}`}
                    >
                      {crumb.name}
                    </button>
                  )}
                </span>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentFolderId(currentFolder?.parentId ?? null)}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
          </div>
        )}

        {isLoading ? (
          <NotesListSkeleton />
        ) : !hasAnyNotes && allFolders.length === 0 ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-1">No notes yet</h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                Create your first set of AI-generated study notes by clicking the button below.
              </p>
              <Button
                onClick={() => navigate("/create")}
                data-testid="button-create-first"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Notes
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {childFoldersOfCurrent.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5" data-testid="folder-tiles-grid">
                {childFoldersOfCurrent.map((folder) => (
                  <FolderTile
                    key={folder.id}
                    folder={folder}
                    notes={notes || []}
                    allFolders={allFolders}
                    onOpen={(id) => setCurrentFolderId(id)}
                    onRename={(id, name) => {
                      setRenameDialog({ id, name });
                      setRenameName(name);
                    }}
                    onDelete={(id) => deleteFolderMutation.mutate(id)}
                  />
                ))}
              </div>
            )}

            {notesInCurrentFolder.length > 0 && (
              <div className="space-y-3">
                {childFoldersOfCurrent.length > 0 && notesInCurrentFolder.length > 0 && (
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>{currentFolderId ? "Notes" : "Unfiled Notes"}</span>
                    <Badge variant="secondary" className="text-xs">
                      {notesInCurrentFolder.length}
                    </Badge>
                  </div>
                )}
                {notesInCurrentFolder.map((note) => (
                  <NoteCard key={note.id} note={note} folders={allFolders} />
                ))}
              </div>
            )}

            {childFoldersOfCurrent.length === 0 && notesInCurrentFolder.length === 0 && currentFolderId && (
              <Card>
                <CardContent className="py-12 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <FolderOpen className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">This folder is empty</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!renameDialog} onOpenChange={(open) => !open && setRenameDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (renameDialog && renameName.trim()) {
                renameFolderMutation.mutate({ id: renameDialog.id, name: renameName.trim() });
              }
            }}
          >
            <Input
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              placeholder="Folder name"
              autoFocus
              data-testid="input-rename-folder"
            />
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRenameDialog(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!renameName.trim() || renameFolderMutation.isPending}
                data-testid="button-confirm-rename"
              >
                {renameFolderMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Rename"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
