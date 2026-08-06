/** Maps a users row to the shape the client consumes. Secrets never cross this line. */
export function toUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    email: row.email,
    name: row.name,
    picture: row.picture ?? null,
    username: row.username ?? null,
    role: row.role,
    status: row.status,
    lastAccessAt: row.last_access_at ?? null,
    createdAt: row.created_at ?? null,
    hasPin: Boolean(row.pin_hash),
  };
}

export const toUsers = (rows) => rows.map(toUser);
