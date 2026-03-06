import { setupAuth } from "./replit_integrations/auth";
import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertNoteRequestSchema, insertFolderSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import { setupGmail, sendWeeklyEmail } from "./gmail";

// In Replit, the OpenAI integration provides the key via environment variables.
// If it's missing, we'll try to use a placeholder to at least let the server start
// so the user can see the UI and fix the integration if needed.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "integration_key_missing",
});

const ADMIN_EMAIL = "ahmedsopori@gmail.com";

async function searchWikipediaContext(query: string): Promise<string> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=0&srlimit=1&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const pageTitle = searchData.query?.search?.[0]?.title;

    if (!pageTitle) return "";

    const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&titles=${encodeURIComponent(pageTitle)}&exintro&explaintext&format=json&origin=*`;
    const contentRes = await fetch(contentUrl);
    const contentData = await contentRes.json();
    const pages = contentData.query?.pages || {};
    const extract = Object.values(pages)[0] as any;
    return extract?.extract || "";
  } catch (e) {
    console.error("Wikipedia context search failed:", e);
    return "";
  }
}

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
    const wordsPerPage = 500;
    const totalWords = pageCount * wordsPerPage;

    const isBullet = noteStyle === "bullet";

    const wikiContext = await searchWikipediaContext(`${subject} ${description.split(" ").slice(0, 8).join(" ")}`);

    const gradeLevelMap: Record<string, string> = {
      elementary: "elementary school (grades K-5). Use simple, age-appropriate vocabulary. Explain concepts in easy-to-understand terms with relatable examples. Avoid jargon and complex sentence structures.",
      middle: "middle school (grades 6-8). Use clear, accessible vocabulary appropriate for young teens. Define technical terms when first introduced. Include relatable examples.",
      high: "high school (grades 9-12). Use standard academic vocabulary. Introduce and define technical terms. Balance clarity with appropriate complexity.",
      college: "college/university level. Use full academic vocabulary and technical terminology. Assume foundational knowledge in the subject area.",
      graduate: "graduate/professional level. Use advanced academic and specialized vocabulary freely. Assume strong prior knowledge and discuss nuances, edge cases, and advanced concepts.",
    };

    const gradeLevelInstructions = gradeLevel && gradeLevelMap[gradeLevel]
      ? `\n\nGRADE LEVEL: These notes are for a student at the ${gradeLevelMap[gradeLevel]}`
      : "";

    const styleInstructions = isBullet
      ? `FORMAT: BULLET-POINT NOTES
- Structure content primarily using bullet points and sub-bullets
- Use headers (##, ###) to organize sections
- Each bullet should capture one key idea, definition, or fact
- Use **bold** for key terms and important concepts
- Use numbered lists for steps, sequences, or ranked items
- Keep bullets concise but informative — not full paragraphs
- Use sub-bullets (indented) for supporting details, examples, or clarifications
- Make notes easy to scan and review quickly`
      : `FORMAT: TIGHTLY PACKED PARAGRAPH NOTES
- Write in dense, information-rich paragraphs — not bullet points
- Use headers (##, ###) to organize sections
- Each paragraph should flow naturally and cover a topic thoroughly
- Use **bold** for key terms and important concepts within paragraphs
- Write in a clear, academic style with full sentences
- Pack as much useful information as possible into each paragraph
- Minimize whitespace — content should be dense and continuous
- Include examples and explanations woven into the text naturally`;

    const extraInstructions = `

VISUALS:
- Use markdown tables for comparisons, data, and structured information
- Create ASCII/text-based diagrams using code blocks (\`\`\`) for processes, cycles, hierarchies, structures, and relationships
- Label every diagram clearly with a title line above it
- Add a brief caption below each diagram
- AI MUST NOT include any images or image tags.`;

    let systemPrompt = `You are an expert academic note-taker and study guide creator. Your job is to create comprehensive, well-organized study notes that fill REAL pages.

CRITICAL QUALITY REQUIREMENT:
- You MUST be thorough and cover ALL important aspects of the topic — do not skip key concepts, details, or sub-topics.
- If the topic is a competition event (e.g., Science Olympiad, Academic Decathlon), cover ALL the specific content that appears in that event, including rules, key concepts, formulas, classifications, identification tips, and common test question topics.
- If the topic involves specific items (chemicals, species, historical events, people, etc.), provide SPECIFIC names, properties, dates, facts — not generic summaries.
- Include specific examples, formulas, definitions, classifications, comparisons, and real data.
- Do NOT write vague or generic notes. Every bullet or paragraph should contain specific, testable information.

CRITICAL LENGTH REQUIREMENT:
- You MUST write approximately ${totalWords} words total (${pageCount} full page(s) worth of content).
- Each "page" means a FULL page in Google Docs or Microsoft Word (12pt font, standard margins, single-spaced) — approximately 500 words per page.
- ${pageCount === 1 ? "For 1 page, write a full page of detailed content — around 500 words with multiple sections." : `For ${pageCount} pages, write ${totalWords}+ words with extensive detail across many sections and subsections.`}
- Every section should have thorough coverage.

${styleInstructions}${gradeLevelInstructions}${extraInstructions}`;

    let userPrompt = `Create comprehensive study notes for the following:

Subject: ${subject}

Description of what to cover: ${description}

IMPORTANT: Write exactly ${pageCount} FULL page(s) of content (approximately ${totalWords} words total). Each page should fill an entire page when pasted into Google Docs or Microsoft Word (12pt font, standard margins, single-spaced).

Be thorough and specific — include ALL key details, names, formulas, classifications, and facts. Do not write generic summaries. Every point should contain concrete, testable information that a student would need to know.`;

    if (wikiContext) {
      userPrompt += `

REFERENCE INFORMATION (use this to ensure accuracy and completeness — incorporate relevant details into your notes):

${wikiContext}`;
    }

    if (resources) {
      userPrompt += `

ADDITIONAL RESOURCES (incorporate this specific information):
${resources}`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 8192,
    });

    const content = response.choices[0]?.message?.content || "";
    await storage.updateNoteContent(id, content, "completed");
  } catch (error) {
    console.error("Error generating notes:", error);
    await storage.updateNoteContent(id, "", "error");
  }
}

async function searchWikipediaImages(query: string): Promise<string[]> {
  return [];
}

export async function registerRoutes(app: express.Express): Promise<Server> {
  // setupAuth expects the express app, not the HTTP server. 
  // It should be called before other routes but after basic middleware.
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
    const notes = await storage.getNotesByUser(req.user.id);
    res.json(notes);
  });

  app.get("/api/notes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const note = await storage.getNote(parseInt(req.params.id));
    if (!note || note.userId !== req.user.id) return res.sendStatus(404);
    res.json(note);
  });

  app.post("/api/notes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const result = insertNoteRequestSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json(result.error);

    const note = await storage.createNote({
      ...result.data,
      userId: req.user.id,
      status: "generating",
      generatedContent: null,
      simpleSummary: null,
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
    const note = await storage.getNote(parseInt(req.params.id));
    if (!note || note.userId !== req.user.id) return res.sendStatus(404);
    await storage.deleteNote(note.id);
    res.sendStatus(204);
  });

  app.patch("/api/notes/:id/folder", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const note = await storage.getNote(parseInt(req.params.id));
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
    const note = await storage.getNote(parseInt(req.params.id));
    if (!note || note.userId !== req.user.id) return res.sendStatus(404);

    const { instruction } = req.body;
    if (!instruction) return res.status(400).json({ error: "Instruction required" });

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert academic note-taker. Refine the following study notes based on the user's instructions. Maintain the markdown format and comprehensive detail. AI MUST NOT include any images or image tags.`,
          },
          {
            role: "user",
            content: `Notes:\n${note.generatedContent}\n\nInstruction: ${instruction}`,
          },
        ],
        max_completion_tokens: 8192,
      });

      const content = response.choices[0]?.message?.content || "";
      const updated = await storage.updateNoteContent(note.id, content, "completed");
      storage.trackEvent("note_refined", JSON.stringify({ subject: note.subject }), req.sessionID).catch(() => {});
      res.json(updated);
    } catch (error) {
      console.error("Refinement error:", error);
      res.status(500).json({ error: "Failed to refine notes" });
    }
  });

  app.post("/api/notes/:id/quiz", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const note = await storage.getNote(parseInt(req.params.id));
    if (!note || note.userId !== req.user.id) return res.sendStatus(404);

    try {
      if (note.status !== "completed" || !note.generatedContent) {
        return res.status(400).json({ error: "Notes must be completed before generating a quiz" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert quiz maker. Given study notes, create an interactive quiz that tests the student's knowledge.

You MUST respond with a valid JSON array of question objects. Do NOT include any text outside the JSON array — no markdown, no explanation, just the JSON array.

Each question object must have these fields:
- "type": one of "multiple_choice", "true_false", "short_answer"
- "question": the question text (string)
- "options": array of answer strings (4 options for multiple_choice, ["True", "False"] for true_false, empty array [] for short_answer)
- "correctIndex": zero-based index of the correct option in the options array (number, -1 for short_answer)
- "explanation": a brief explanation of why the correct answer is right (string)
- "keywords": for short_answer only, an array of 3-5 lowercase keywords that MUST be present in a correct answer (array of strings, empty [] for others)

Generate exactly 15 questions total:
- 7 multiple choice questions (4 options each)
- 4 true/false questions
- 4 short answer questions where the user must type their response

Rules:
- Cover all major topics from the notes
- For short_answer, the explanation should serve as the "model answer" or feedback criteria.
- Vary difficulty — start easier, get harder
- Make wrong options plausible but clearly incorrect
- Explanations should be educational and reference specific facts from the notes
- Questions should be clear and unambiguous`,
          },
          {
            role: "user",
            content: `Create a 15-question interactive quiz based on these study notes:\n\n${note.generatedContent}`,
          },
        ],
        max_completion_tokens: 8192,
      });

      const content = response.choices[0]?.message?.content || "[]";
      let questions;
      try {
        questions = JSON.parse(content.replace(/```json|```/g, "").trim());
      } catch (err) {
        console.error("JSON parse error:", content);
        throw new Error("Failed to parse AI response as JSON");
      }

      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(500).json({ error: "No questions generated" });
      }

      const validated = questions.filter((q: any) =>
        q.question && q.options && Array.isArray(q.options) &&
        (q.type === "short_answer" || (q.options.length >= 2 && typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < q.options.length)) &&
        q.explanation
      );

      storage.trackEvent("quiz_generated", JSON.stringify({ subject: note.subject }), req.sessionID).catch(() => {});
      res.json({ questions: validated });
    } catch (error) {
      console.error("Quiz error:", error);
      res.status(500).json({ error: "Failed to generate quiz" });
    }
  });

  app.get("/api/folders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const folders = await storage.getFoldersByUser(req.user.id);
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
