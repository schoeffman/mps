import cron from "node-cron";
import { db } from "../db/index.js";
import { scheduleAssignments, schedules, workHistory } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

function getMondayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export async function snapshotWorkHistory() {
  const today = new Date().toISOString().slice(0, 10);
  const monday = getMondayOfWeek(today);

  const rows = await db
    .select({
      userId: scheduleAssignments.userId,
      projectId: scheduleAssignments.projectId,
      scheduleId: scheduleAssignments.scheduleId,
      ownerId: schedules.ownerId,
    })
    .from(scheduleAssignments)
    .innerJoin(schedules, eq(scheduleAssignments.scheduleId, schedules.id))
    .where(eq(scheduleAssignments.weekStart, monday));

  if (rows.length === 0) {
    console.log(`[work-history] No assignments found for week of ${monday}`);
    return;
  }

  const result = await db
    .insert(workHistory)
    .values(
      rows.map((r) => ({
        userId: r.userId,
        projectId: r.projectId,
        scheduleId: r.scheduleId,
        date: today,
        ownerId: r.ownerId,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: workHistory.id });

  console.log(`[work-history] Inserted ${result.length} entries for ${today}`);
}

export function startWorkHistoryCron() {
  // Run daily at 11 PM
  cron.schedule("0 23 * * *", async () => {
    try {
      await snapshotWorkHistory();
    } catch (err) {
      console.error("[work-history] Snapshot failed:", err);
    }
  });
  console.log("[work-history] Cron job registered (daily at 11 PM)");
}
