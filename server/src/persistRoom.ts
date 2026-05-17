/**
 * SQLite WAL + один ряд checkpoint для полного JSON состояния комнаты.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import Database from "better-sqlite3";

const SAVE_DEBOUNCE_MS = 4000;

export class RoomPersistence {
  readonly db: Database.Database;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(dbPath: string) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS room_checkpoint (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        payload TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  static defaultDbPath(): string {
    const raw = process.env.SQLITE_PATH;
    if (raw?.trim()) return path.resolve(raw.trim());
    return path.join(process.cwd(), "data", "game.db");
  }

  loadCheckpointRaw(): string | null {
    const row = this.db.prepare("SELECT payload FROM room_checkpoint WHERE id = 1").get() as
      | { payload: string }
      | undefined;
    return row?.payload ?? null;
  }

  /** Есть ли строка и непустой payload (без валидации JSON). */
  hasCheckpoint(): boolean {
    const row = this.db.prepare("SELECT payload FROM room_checkpoint WHERE id = 1").get() as
      | { payload: string }
      | undefined;
    return !!row?.payload?.trim();
  }

  saveCheckpointNow(serialized: string): void {
    const stmt = this.db.prepare(
      `INSERT INTO room_checkpoint (id, payload, updated_at) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
    );
    stmt.run(serialized, Date.now());
  }

  /** Отложенная запись (не каждый тик). */
  scheduleSave(getPayload: () => string): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.saveCheckpointNow(getPayload());
    }, SAVE_DEBOUNCE_MS);
  }

  cancelDebouncedSave(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  saveImmediate(serialized: string): void {
    this.cancelDebouncedSave();
    this.saveCheckpointNow(serialized);
  }

  close(): void {
    this.cancelDebouncedSave();
    this.db.close();
  }
}
