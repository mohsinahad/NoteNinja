import { sql } from "drizzle-orm";
import { pgTable, text, serial, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  eventData: text("event_data"),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertFolderSchema = createInsertSchema(folders).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type Folder = typeof folders.$inferSelect;

export const noteRequests = pgTable("note_requests", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  pageCount: integer("page_count").notNull(),
  resources: text("resources"),
  noteStyle: text("note_style").notNull().default("bullet"),
  gradeLevel: text("grade_level"),
  generatedContent: text("generated_content"),
  simpleSummary: text("simple_summary"),
  status: text("status").notNull().default("pending"),
  folderId: integer("folder_id"),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertNoteRequestSchema = createInsertSchema(noteRequests).omit({
  id: true,
  generatedContent: true,
  simpleSummary: true,
  status: true,
  userId: true,
  createdAt: true,
}).extend({
  noteStyle: z.enum(["bullet", "compact"]).default("bullet"),
  gradeLevel: z.string().nullable().optional(),
});

export type InsertNoteRequest = z.infer<typeof insertNoteRequestSchema>;
export type NoteRequest = typeof noteRequests.$inferSelect;
