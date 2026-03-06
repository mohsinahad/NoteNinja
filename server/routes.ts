import { setupAuth } from "./replit_integrations/auth";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertNoteRequestSchema, insertFolderSchema } from "@shared/schema";
import { setupGmail, sendWeeklyEmail } from "./gmail";

const ADMIN_EMAIL = "ahmedsopori@gmail.com";

async function generateNotes(
  id: number,
  subject: string,
  description: string,
  pageCount: number,
  resources: string | null,
  noteStyle: string,
  gradeLevel: string | null
) {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const content = `# ${subject}

## Overview
${description}

${noteStyle === "bullet" ? `## Key Points
- This is a placeholder note generated without OpenAI
- Subject: **${subject}**
- Pages requested: **${pageCount}**
- Style: **${noteStyle}**
${gradeLevel ? `- Grade level: **${gradeLevel}**` : ""}
${resources ? `- Additional resources provided: ${resources}` : ""}

## Details
- To enable AI-generated notes, add your \`OPENAI_API_KEY\` as a Replit Secret
- The app will then generate comprehensive study notes using GPT-4o
- Notes include Wikipedia context enrichment for accuracy` : `## Summary

This is a placeholder note generated without OpenAI. The subject is **${subject}** with ${pageCount} page(s) requested in **${noteStyle}** format.${gradeLevel ? ` Targeted at **${gradeLevel}** level.` : ""}

${resources ? `Additional resources were provided: ${resources}` : ""}

## Next Steps

To enable AI-generated notes, add your \`OPENAI_API_KEY\` as a Replit Secret. The app will then generate comprehensive study notes using GPT-4o, enriched with Wikipedia context for accuracy.`}
`;

    await storage.updateNoteContent(id, content, "completed");
  } catch (error) {
    console.error("Error generating notes:", error);
    await storage.updateNoteContent(id, "", "error");
  }
}

export async function registerRoutes(app: express.Express): Promise<Server> {
  setupAuth(app);
  setupGmail(app);

  let lastWeeklyEmailSent = "";

  setInterval(async () => {
    try {
      const now = new Date();
      const est = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false, day: "numeric" }).formatToParts(now);
      const estHours = Number(est.find(p => p.type === "hour")?.value);
      const day = now.getDay();

      const weekKey = `${now.getFullYear()}-W${Math.floor(now.getDate() / 7)}`;
      if (day === 0 && estHours >= 23 && lastWeeklyEmailSent !== weekKey) {
        console.log("Scheduling weekly email for Sunday 11 PM EST");
        await sendWeeklyEmail();
        lastWeeklyEmailSent = weekKey;
      }
    } catch (err) {
      console.error("Scheduler error:", err);
    }
  }, 10 * 60 * 1000);

  app.use((req, res, next) => {
    if (req.isAuthenticated()) {
      storage.trackEvent("page_view", req.path, req.sessionID).catch(() => {});
    }
    next();
  });

  app.get("/api/notes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const notes = await storage.getAllNoteRequests(req.user.id);
    res.json(notes);
  });

  app.get("/api/notes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const note = await storage.getNoteRequest(parseInt(req.params.id));
    if (!note || note.userId !== req.user.id) return res.sendStatus(404);
    res.json(note);
  });

  app.post("/api/notes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const result = insertNoteRequestSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json(result.error);

    const note = await storage.createNoteRequest({
      ...result.data,
      userId: req.user.id,
    });

    generateNotes(
      note.id,
      note.subject,
      note.description,
      note.pageCount,
      note.resources,
      note.noteStyle,
      note.gradeLevel
    );

    storage.trackEvent("note_created", JSON.stringify({ subject: note.subject }), req.sessionID).catch(() => {});
    res.status(201).json(note);
  });

  app.delete("/api/notes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const note = await storage.getNoteRequest(parseInt(req.params.id));
    if (!note || note.userId !== req.user.id) return res.sendStatus(404);
    await storage.deleteNoteRequest(note.id);
    res.sendStatus(204);
  });

  app.patch("/api/notes/:id/folder", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const note = await storage.getNoteRequest(parseInt(req.params.id));
    if (!note || note.userId !== req.user.id) return res.sendStatus(404);

    const folderId = req.body.folderId === null ? null : parseInt(req.body.folderId);
    if (folderId !== null) {
      const folder = await storage.getFolder(folderId);
      if (!folder || folder.userId !== req.user.id) return res.status(400).json({ error: "Invalid folder" });
    }

    const updated = await storage.updateNoteFolder(note.id, folderId);
    res.json(updated);
  });

  app.post("/api/notes/:id/refine", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const note = await storage.getNoteRequest(parseInt(req.params.id));
    if (!note || note.userId !== req.user.id) return res.sendStatus(404);

    const { instruction } = req.body;
    if (!instruction) return res.status(400).json({ error: "Instruction required" });

    const refined = `${note.generatedContent}\n\n---\n\n**Refinement requested:** ${instruction}\n\n_Note: AI refinement is disabled. Add OPENAI_API_KEY as a Replit Secret to enable._`;
    const updated = await storage.updateNoteContent(note.id, refined, "completed");
    storage.trackEvent("note_refined", JSON.stringify({ subject: note.subject }), req.sessionID).catch(() => {});
    res.json(updated);
  });

  app.post("/api/notes/:id/quiz", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const note = await storage.getNoteRequest(parseInt(req.params.id));
    if (!note || note.userId !== req.user.id) return res.sendStatus(404);

    if (note.status !== "completed" || !note.generatedContent) {
      return res.status(400).json({ error: "Notes must be completed before generating a quiz" });
    }

    const questions = [
      {
        type: "multiple_choice",
        question: `What is the main subject of these notes?`,
        options: [note.subject, "Mathematics", "History", "Science"],
        correctIndex: 0,
        explanation: `The notes are about ${note.subject}.`,
        keywords: [],
      },
      {
        type: "true_false",
        question: `These notes were generated with AI assistance.`,
        options: ["True", "False"],
        correctIndex: 0,
        explanation: "The notes are generated by the Note Ninja app (placeholder mode).",
        keywords: [],
      },
      {
        type: "short_answer",
        question: `Describe the main topic covered in these notes.`,
        options: [],
        correctIndex: -1,
        explanation: `The notes cover ${note.subject}: ${note.description}`,
        keywords: [note.subject.toLowerCase().split(" ")[0]],
      },
    ];

    storage.trackEvent("quiz_generated", JSON.stringify({ subject: note.subject }), req.sessionID).catch(() => {});
    res.json({ questions });
  });

  app.get("/api/folders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const folders = await storage.getAllFolders(req.user.id);
    res.json(folders);
  });

  app.post("/api/folders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const result = insertFolderSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json(result.error);

    const folder = await storage.createFolder({
      ...result.data,
      userId: req.user.id,
    });
    res.status(201).json(folder);
  });

  app.patch("/api/folders/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const folder = await storage.getFolder(parseInt(req.params.id));
    if (!folder || folder.userId !== req.user.id) return res.sendStatus(404);

    const updated = await storage.updateFolder(folder.id, req.body.name);
    res.json(updated);
  });

  app.delete("/api/folders/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const folder = await storage.getFolder(parseInt(req.params.id));
    if (!folder || folder.userId !== req.user.id) return res.sendStatus(404);

    await storage.deleteFolder(folder.id);
    res.sendStatus(204);
  });

  app.get("/api/admin/check", (req, res) => {
    if (!req.isAuthenticated()) return res.json({ isAdmin: false });
    res.json({ isAdmin: req.user.email === ADMIN_EMAIL });
  });

  app.get("/api/admin/analytics", async (req, res) => {
    if (!req.isAuthenticated() || req.user.email !== ADMIN_EMAIL) return res.sendStatus(403);
    const summary = await storage.getAnalyticsSummary();
    res.json(summary);
  });

  app.post("/api/admin/send-weekly-email", async (req, res) => {
    if (!req.isAuthenticated() || req.user.email !== ADMIN_EMAIL) return res.sendStatus(403);
    await sendWeeklyEmail();
    res.json({ success: true });
  });

  app.post("/api/admin/seed-example", async (req, res) => {
    if (!req.isAuthenticated() || req.user.email !== ADMIN_EMAIL) return res.sendStatus(403);
    await storage.seedExampleAnalytics();
    res.json({ success: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
