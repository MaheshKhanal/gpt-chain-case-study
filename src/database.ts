import { Pool } from 'pg';
import { Job } from './types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export class Database {
  static async createJob(eventId: string, inputText: string): Promise<Job> {
    const query = `
      INSERT INTO jobs (event_id, status, input_text)
      VALUES ($1, 'pending', $2)
      RETURNING *
    `;
    const result = await pool.query(query, [eventId, inputText]);
    return result.rows[0];
  }

  static async getJobByEventId(eventId: string): Promise<Job | null> {
    const query = 'SELECT * FROM jobs WHERE event_id = $1';
    const result = await pool.query(query, [eventId]);
    return result.rows[0] || null;
  }

  static async updateJobStatus(eventId: string, status: Job['status']): Promise<void> {
    const query = `
      UPDATE jobs 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE event_id = $2
    `;
    await pool.query(query, [status, eventId]);
  }

  static async updateJobResult(eventId: string, summary: string, checklist: string): Promise<void> {
    const query = `
      UPDATE jobs 
      SET status = 'completed', summary = $1, checklist = $2, updated_at = CURRENT_TIMESTAMP 
      WHERE event_id = $3
    `;
    await pool.query(query, [summary, checklist, eventId]);
  }

  static async updateJobError(eventId: string, errorMessage: string): Promise<void> {
    const query = `
      UPDATE jobs 
      SET status = 'failed', error_message = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE event_id = $2
    `;
    await pool.query(query, [errorMessage, eventId]);
  }

  static async close(): Promise<void> {
    await pool.end();
  }
}

export { pool };