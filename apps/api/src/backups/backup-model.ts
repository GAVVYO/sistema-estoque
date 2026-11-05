import { open, rename } from 'node:fs/promises';
import { constants } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';

export async function syncBackupArchive(path: string) {
  // Windows FlushFileBuffers requires a writable handle. Do not truncate it.
  const mode = process.platform === 'win32' ? constants.O_RDWR : constants.O_RDONLY;
  const file = await open(path, mode | constants.O_NOFOLLOW);
  try { await file.sync(); } finally { await file.close(); }
}

// Windows scanners/readers can briefly deny replacement of an existing file.
// Keep the old metadata intact and retry only these transient rename failures.
export async function replaceBackupMetadata(source: string, destination: string, replace = rename, platform = process.platform) {
  for (let attempt = 0; ; attempt++) {
    try { await replace(source, destination); return; }
    catch (error) {
      if (platform !== 'win32' || attempt >= 5 || !['EPERM', 'EACCES', 'EBUSY'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
      await delay(50 * (attempt + 1));
    }
  }
}

export const scheduleSchema = z.object({
  enabled: z.boolean(), frequency: z.enum(['WEEKLY', 'MONTHLY']),
  weekday: z.number().int().min(0).max(6), hour: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});
export type BackupSchedule = z.infer<typeof scheduleSchema>;
export const recordSchema = z.object({
  id: z.string().uuid(), status: z.enum(['RUNNING', 'READY', 'FAILED']),
  source: z.enum(['MANUAL', 'AUTOMATIC']), startedAt: z.string().datetime(), finishedAt: z.string().datetime().nullable(),
  author: z.string(), period: z.string().nullable(), bytes: z.number().nonnegative(), sha256: z.string(),
  error: z.string().nullable(),
});
export type BackupRecord = z.infer<typeof recordSchema>;
export const backupIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function scheduleWindow(now: Date, timeZone: string, schedule: BackupSchedule) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(part => [part.type, part.value]));
  const date = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  const [hours, minutes] = schedule.hour.split(':').map(Number);
  const minuteOfDay = Number(parts.hour) * 60 + Number(parts.minute);
  if (schedule.frequency === 'WEEKLY') {
    const elapsed = (date.getUTCDay() - schedule.weekday + 7) % 7;
    date.setUTCDate(date.getUTCDate() - elapsed);
    return { period: `WEEKLY:${date.toISOString().slice(0, 10)}`, due: elapsed > 0 || minuteOfDay >= hours * 60 + minutes };
  }
  return { period: `MONTHLY:${parts.year}-${parts.month}`, due: Number(parts.day) > 1 || minuteOfDay >= hours * 60 + minutes };
}
