export function toCompany(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    // Printed under the company name on every challan.
    address: row.address ?? '',
    phone: row.phone ?? '',
    createdAt: row.created_at ?? null,
  };
}

export const toCompanies = (rows) => rows.map(toCompany);
