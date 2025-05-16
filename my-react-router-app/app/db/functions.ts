import type { Client, Transaction } from "@libsql/client";
import { askGeminiForQuestions } from "~/chatbot/gemini";
import type { IRatingRow, IRatingActivity } from "~/chatbot/types";

// there are 3 tables - rating table, user table, activity table
// TODO: add index to speed up queries
const createUserTable = `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    created_at INTEGER DEFAULT (cast(unixepoch() as int))
)`;

const createActivityTable = `CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity TEXT NOT NULL UNIQUE,
    created_at INTEGER DEFAULT (cast(unixepoch() as int))
)`;

const createRatingTable = `CREATE TABLE IF NOT EXISTS ratings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    activity_id INTEGER NOT NULL,
                    topic TEXT,
                    question TEXT,
                    rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
                    created_at INTEGER DEFAULT (cast(unixepoch() as int)),
                    updated_at INTEGER DEFAULT (cast(unixepoch() as int)),
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (activity_id) REFERENCES activities(id),
                    UNIQUE(user_id, activity_id, topic, question)
                  )`;

export async function insertUser(db: Client, email: string) {
  try {
    await db.batch(
      [
        {
          sql: createUserTable,
          args: [],
        },
        {
          sql: createActivityTable,
          args: [],
        },
        {
          sql: createRatingTable,
          args: [],
        },
        {
          sql: `INSERT INTO users (email) VALUES (?) ON CONFLICT(email) DO NOTHING`,
          args: [email],
        },
      ],
      "write"
    );

    const result = await db.execute({
      sql: `SELECT id FROM users WHERE email = ?`,
      args: [email],
    });

    const userId = result.rows[0]?.id;
    return userId;
  } catch (error) {
    console.error("Error syncing cal:", error);
  }
}

// TODO: this shld be used by cron eventually
// use transaction const transaction = await db.transaction("write");
export async function insertActivitiesAndRatings(
  db: Client,
  activities: string[],
  userId: number
) {
  const toReturnArr = [];
  const transaction = await db.transaction("write");

  try {
    for (const act of activities) {
      const batchStatements = [];

      // cannot use db.batch because activityId is not returned
      // cannot get returning id from insert, in case activity alr exists
      const { rowsAffected } = await transaction.execute({
        sql: `INSERT INTO activities (activity) VALUES (?) ON CONFLICT(activity) DO NOTHING`,
        args: [act],
      });
      if (rowsAffected === 0) continue; // the questions are alr in the db

      // convert bigInt to Number. However, this assumes that: the ID is NOT larger than Number.MAX_SAFE_INTEGER (~9 quadrillion). else, precision will be lost.
      // But unless you're inserting billions of rows, you're fine.
      const result = await db.execute({
        sql: `SELECT id FROM activities WHERE activity = ?`,
        args: [act],
      });

      const activityId = Number(result.rows[0]?.id);
      toReturnArr.push(activityId);

      // call gemini here to get questions
      const geminiResults = await askGeminiForQuestions(act);
      for (const { topic, question } of geminiResults) {
        batchStatements.push({
          sql: `INSERT INTO ratings (user_id, topic, question, activity_id, rating) VALUES (?, ?, ?, ?, 0) ON CONFLICT(user_id, activity_id, topic, question) DO NOTHING`,
          args: [userId, topic, question, activityId],
        });
      }

      // batch is faster than inserting one at a time
      // since dont need ratingId
      await transaction.batch(batchStatements);
    }

    // success
    await transaction.commit();
    console.log("Activities and ratings inserted:", toReturnArr);
    return toReturnArr;
  } catch (error) {
    // failure
    await transaction.rollback();
    console.error("Activities and ratings FAILED to insert:", error);
    return [];
  }
}

// used for prompting
export async function getAllQuestionsFromRatingTable(
  db: Client,
  userId: number
) {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM ratings WHERE user_id = ?",
      args: [userId],
    });

    const rows = result.rows;
    const resultRows: IRatingRow[] = rows.map((r) => ({
      id: Number(r.id),
      user_id: Number(r.user_id),
      activity_id: Number(r.activity_id),
      topic: `${r.topic}`,
      question: `${r.question}`,
      rating: Number(r.rating),
    }));
    return resultRows
  } catch (error) {
    console.error("Error getting questions from rating table:", error);
    return [];
  }
}

export async function updateRating(
  db: Client,
  rating: number,
  ratingId: number // id field in rating table
) {
  try {
    await db.execute({
      sql: `UPDATE ratings SET rating = ? WHERE id = ?`,
      args: [rating, ratingId],
    });
    console.log("Rating inserted successfully");
  } catch (error) {
    console.error("Error inserting rating:", error);
  }
}

// used for analytics
export async function getAllRatings(db: Client) {
  try {
    const result = await db.execute({
      sql: `
      SELECT 
      ratings.id,
      ratings.user_id,
      ratings.activity_id,
      ratings.topic,
      ratings.question,
      ratings.rating,
      activities.activity AS activity_name
    FROM ratings
    JOIN activities ON ratings.activity_id = activities.id`,
      args: [],
    });

    const rows = result.rows;
    const resultRows: IRatingActivity[] = rows.map((r) => ({
      id: Number(r.id),
      user_id: Number(r.user_id),
      activity_id: Number(r.activity_id),
      topic: `${r.topic}`,
      question: `${r.question}`,
      rating: Number(r.rating),
      activity: `${r.activity_name}`,
    }));
    return resultRows;
  } catch (error) {
    console.error("Error getting ratings from rating table:", error);
    return [];
  }
}
