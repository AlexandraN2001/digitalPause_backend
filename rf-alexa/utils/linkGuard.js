import { pool } from "../db.js";

export async function assertParentOwnsChild(parentId, childId) {
  const q = await pool.query(
    `SELECT 1 FROM parent_child_link WHERE parent_id = $1 AND child_id = $2`,
    [parentId, childId]
  );
  return q.rowCount > 0;
}
