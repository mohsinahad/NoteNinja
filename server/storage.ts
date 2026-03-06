import { type NoteRequest, type InsertNoteRequest, noteRequests, type Folder, type InsertFolder, folders, analyticsEvents } from "@shared/schema";
import { db } from "./db";
import { eq, desc, isNull, and, sql, gte, count } from "drizzle-orm";

export interface IStorage {
  createNoteRequest(data: InsertNoteRequest & { userId: string }): Promise<NoteRequest>;
  getNoteRequest(id: number): Promise<NoteRequest | undefined>;
  getAllNoteRequests(userId: string): Promise<NoteRequest[]>;
  updateNoteContent(id: number, content: string, status: string, simpleSummary?: string): Promise<NoteRequest | undefined>;
  updateNoteFolder(id: number, folderId: number | null): Promise<NoteRequest | undefined>;
  deleteNoteRequest(id: number): Promise<void>;
  createFolder(data: InsertFolder & { userId: string }): Promise<Folder>;
  getFolder(id: number): Promise<Folder | undefined>;
  getAllFolders(userId: string): Promise<Folder[]>;
  updateFolder(id: number, name: string): Promise<Folder | undefined>;
  deleteFolder(id: number): Promise<void>;
  deleteFolderRecursive(id: number, userId: string): Promise<void>;
  trackEvent(eventType: string, eventData?: string, sessionId?: string): Promise<void>;
  getAnalyticsSummary(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async createNoteRequest(data: InsertNoteRequest & { userId: string }): Promise<NoteRequest> {
    const [result] = await db.insert(noteRequests).values(data).returning();
    return result;
  }

  async getNoteRequest(id: number): Promise<NoteRequest | undefined> {
    const [result] = await db.select().from(noteRequests).where(eq(noteRequests.id, id));
    return result;
  }

  async getAllNoteRequests(userId: string): Promise<NoteRequest[]> {
    return db.select().from(noteRequests).where(eq(noteRequests.userId, userId)).orderBy(desc(noteRequests.createdAt));
  }

  async updateNoteContent(id: number, content: string, status: string, simpleSummary?: string): Promise<NoteRequest | undefined> {
    const updateData: any = { generatedContent: content, status };
    if (simpleSummary !== undefined) {
      updateData.simpleSummary = simpleSummary;
    }
    const [result] = await db
      .update(noteRequests)
      .set(updateData)
      .where(eq(noteRequests.id, id))
      .returning();
    return result;
  }

  async updateNoteFolder(id: number, folderId: number | null): Promise<NoteRequest | undefined> {
    const [result] = await db
      .update(noteRequests)
      .set({ folderId })
      .where(eq(noteRequests.id, id))
      .returning();
    return result;
  }

  async deleteNoteRequest(id: number): Promise<void> {
    await db.delete(noteRequests).where(eq(noteRequests.id, id));
  }

  async createFolder(data: InsertFolder & { userId: string }): Promise<Folder> {
    const [result] = await db.insert(folders).values(data).returning();
    return result;
  }

  async getFolder(id: number): Promise<Folder | undefined> {
    const [result] = await db.select().from(folders).where(eq(folders.id, id));
    return result;
  }

  async getAllFolders(userId: string): Promise<Folder[]> {
    return db.select().from(folders).where(eq(folders.userId, userId)).orderBy(desc(folders.createdAt));
  }

  async updateFolder(id: number, name: string): Promise<Folder | undefined> {
    const [result] = await db
      .update(folders)
      .set({ name })
      .where(eq(folders.id, id))
      .returning();
    return result;
  }

  async deleteFolder(id: number): Promise<void> {
    await db.update(noteRequests).set({ folderId: null }).where(eq(noteRequests.folderId, id));
    await db.delete(folders).where(eq(folders.id, id));
  }

  async deleteFolderRecursive(id: number, userId: string): Promise<void> {
    const allFolders = await this.getAllFolders(userId);
    const idsToDelete: number[] = [];
    const collectChildren = (parentId: number) => {
      idsToDelete.push(parentId);
      for (const f of allFolders) {
        if (f.parentId === parentId) {
          collectChildren(f.id);
        }
      }
    };
    collectChildren(id);
    for (const fid of idsToDelete) {
      await db.update(noteRequests).set({ folderId: null }).where(eq(noteRequests.folderId, fid));
    }
    for (const fid of idsToDelete.reverse()) {
      await db.delete(folders).where(eq(folders.id, fid));
    }
  }

  async trackEvent(eventType: string, eventData?: string, sessionId?: string): Promise<void> {
    try {
      await db.insert(analyticsEvents).values({
        eventType,
        eventData: eventData || null,
        sessionId: sessionId || null,
      });
    } catch (e) {
      console.error("Failed to track event:", e);
    }
  }

  private async getEventsInRange(since: Date | null) {
    const whereClause = since ? gte(analyticsEvents.createdAt, since) : undefined;
    const noteWhereClause = since ? gte(noteRequests.createdAt, since) : undefined;

    const eventCounts = await db
      .select({ eventType: analyticsEvents.eventType, count: count() })
      .from(analyticsEvents)
      .where(whereClause)
      .groupBy(analyticsEvents.eventType)
      .orderBy(desc(count()));

    const [noteCount] = await db
      .select({ count: count() })
      .from(noteRequests)
      .where(noteWhereClause);

    const topSubjects = await db
      .select({ subject: noteRequests.subject, count: count() })
      .from(noteRequests)
      .where(noteWhereClause)
      .groupBy(noteRequests.subject)
      .orderBy(desc(count()))
      .limit(10);

    const gradeDistribution = await db
      .select({ gradeLevel: noteRequests.gradeLevel, count: count() })
      .from(noteRequests)
      .where(since ? sql`grade_level IS NOT NULL AND created_at >= ${since}` : sql`grade_level IS NOT NULL`)
      .groupBy(noteRequests.gradeLevel)
      .orderBy(desc(count()));

    const styleDistribution = await db
      .select({ noteStyle: noteRequests.noteStyle, count: count() })
      .from(noteRequests)
      .where(noteWhereClause)
      .groupBy(noteRequests.noteStyle)
      .orderBy(desc(count()));

    const packDownloads = await db
      .select({ eventData: analyticsEvents.eventData, count: count() })
      .from(analyticsEvents)
      .where(since
        ? sql`event_type = 'pack_download' AND created_at >= ${since}`
        : eq(analyticsEvents.eventType, "pack_download"))
      .groupBy(analyticsEvents.eventData)
      .orderBy(desc(count()));

    const totalPackDl = packDownloads.reduce((s, p) => s + Number(p.count), 0);

    const folderUsage = await db
      .select({
        folderId: noteRequests.folderId,
        count: count(),
      })
      .from(noteRequests)
      .where(since ? gte(noteRequests.createdAt, since) : undefined)
      .groupBy(noteRequests.folderId);

    const allFolders = await db.select().from(folders);
    const folderStats = allFolders.map(f => {
      const usage = folderUsage.find(u => u.folderId === f.id);
      return {
        name: f.name,
        count: Number(usage?.count || 0),
      };
    }).sort((a, b) => a.count - b.count);

    const dayOfWeekActivity = await db
      .select({
        dayOfWeek: sql<string>`TO_CHAR(created_at, 'Day')`,
        dayNum: sql<number>`EXTRACT(DOW FROM created_at)`,
        count: count(),
      })
      .from(analyticsEvents)
      .where(whereClause)
      .groupBy(sql`TO_CHAR(created_at, 'Day'), EXTRACT(DOW FROM created_at)`)
      .orderBy(sql`EXTRACT(DOW FROM created_at)`);

    const dailyActivity = await db
      .select({ day: sql<string>`TO_CHAR(created_at, 'YYYY-MM-DD')`, count: count() })
      .from(analyticsEvents)
      .where(whereClause)
      .groupBy(sql`TO_CHAR(created_at, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(created_at, 'YYYY-MM-DD')`);

    return {
      notes: Number(noteCount?.count || 0),
      eventCounts,
      topSubjects,
      gradeDistribution,
      styleDistribution,
      packDownloads: packDownloads.map(p => ({
        pack: p.eventData,
        count: Number(p.count),
        percent: totalPackDl > 0 ? Math.round((Number(p.count) / totalPackDl) * 100) : 0,
      })),
      folderStats,
      dayOfWeekActivity: dayOfWeekActivity.map(d => ({
        day: (d.dayOfWeek as string).trim(),
        dayNum: Number(d.dayNum),
        count: Number(d.count),
      })),
      dailyActivity,
    };
  }

  async getAnalyticsSummary(): Promise<any> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const [totalUsers] = await db
      .select({ count: count() })
      .from(sql`users`);

    const [week, month, year, allTime] = await Promise.all([
      this.getEventsInRange(sevenDaysAgo),
      this.getEventsInRange(thirtyDaysAgo),
      this.getEventsInRange(yearAgo),
      this.getEventsInRange(null),
    ]);

    return {
      totalUsers: Number(totalUsers?.count || 0),
      week,
      month,
      year,
      allTime,
    };
  }
}

export const storage = new DatabaseStorage();
