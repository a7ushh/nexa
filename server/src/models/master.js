export function toMaster(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    mobile: row.mobile ?? '',
    address: row.address ?? '',
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export const toMasters = (rows) => rows.map(toMaster);
