```typescript
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool();

export const createSubmission = async (userId: number, files: Express.Multer.File[]) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO code_review_submissions (user_id, status) VALUES ($1, $2) RETURNING id',
      [userId, 'pending']
    );
    const submissionId = result.rows[0].id;

    const filePromises = files.map(file =>
      client.query(
        'INSERT INTO code_review_files (submission_id, filename, s3_key) VALUES ($1, $2, $3)',
        [submissionId, file.originalname, file.key]
      )
    );
    await Promise.all(filePromises);

    await client.query('COMMIT');
    return { submissionId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Additional business logic...
```