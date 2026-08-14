import { api } from './client.js';

/** Drops blank filter values so the query string stays clean. */
export function toQuery(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const companies = {
  list: () => api.get('/companies'),
  create: (body) => api.post('/companies', body),
  update: (id, body) => api.put(`/companies/${id}`, body),
  select: (id) => api.post(`/companies/${id}/select`),
};

export const masters = {
  list: () => api.get('/masters'),
  search: (term) => api.get(`/masters/search?q=${encodeURIComponent(term)}`),
  create: (body) => api.post('/masters', body),
  update: (id, body) => api.put(`/masters/${id}`, body),
  remove: (id) => api.delete(`/masters/${id}`),
};

export const grey = {
  list: (filters) => api.get(`/grey${toQuery(filters)}`),
  // `kind` makes the remaining-quantity hint trade-correct: handwork draws on
  // what embroidery gave back, not on the lot total.
  search: (term, kind) => api.get(`/grey/search${toQuery({ q: term, kind })}`),
  history: (id) => api.get(`/grey/${id}/history`),
  flow: (id) => api.get(`/grey/${id}/flow`),
  close: (id) => api.post(`/grey/${id}/close`),
  reopen: (id) => api.delete(`/grey/${id}/close`),
  create: (body) => api.post('/grey', body),
  update: (id, body) => api.put(`/grey/${id}`, body),
  remove: (id) => api.delete(`/grey/${id}`),
  removeMany: (ids) => api.delete('/grey/bulk', { ids }),
};

/** `kind` is 'embroidery' or 'handwork'; the routes are otherwise identical. */
export const challans = (kind) => ({
  listIssues: (filters) => api.get(`/${kind}/issues${toQuery(filters)}`),
  searchIssues: (term) => api.get(`/${kind}/issues/search?q=${encodeURIComponent(term)}`),
  nextIssueNo: () => api.get(`/${kind}/issues/next-no`),
  issueHistory: (id) => api.get(`/${kind}/issues/${id}/history`),
  issueReceipts: (id) => api.get(`/${kind}/issues/${id}/receipts`),
  createIssue: (body) => api.post(`/${kind}/issues`, body),
  updateIssue: (id, body) => api.put(`/${kind}/issues/${id}`, body),
  removeIssue: (id) => api.delete(`/${kind}/issues/${id}`),
  removeIssues: (ids) => api.delete(`/${kind}/issues/bulk`, { ids }),

  listReceives: (filters) => api.get(`/${kind}/receives${toQuery(filters)}`),
  nextReceiveNo: () => api.get(`/${kind}/receives/next-no`),
  receiveHistory: (id) => api.get(`/${kind}/receives/${id}/history`),
  createReceive: (body) => api.post(`/${kind}/receives`, body),
  updateReceive: (id, body) => api.put(`/${kind}/receives/${id}`, body),
  removeReceive: (id) => api.delete(`/${kind}/receives/${id}`),
  removeReceives: (ids) => api.delete(`/${kind}/receives/bulk`, { ids }),
});

export const suggestions = {
  list: ({ scope, kind, field, q }) =>
    api.get(`/suggestions${toQuery({ scope, kind, field, q })}`),
};

export const reports = {
  build: (filters) => api.get(`/reports${toQuery(filters)}`),
};

/** Report as a PDF; same shape as generateChallan so ShareSheet can take either. */
export async function generateReport(filters) {
  return fetchPdf('/api/reports/pdf', filters ?? {});
}

export const users = {
  list: () => api.get('/users'),
  setRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  remove: (id) => api.delete(`/users/${id}`),
  backup: () => api.post('/users/backup'),
};

export const logs = {
  list: (limit = 200) => api.get(`/logs?limit=${limit}`),
};

/**
 * Generates a challan PDF. Returns a Blob plus the filename the server chose,
 * so the caller can download it or hand it to the Web Share API.
 *
 * `masterHead` and `masterAddress` override the party printed on this one
 * document; omit them to keep whatever the record holds.
 */
export async function generateChallan({
  kind,
  direction,
  ids,
  masterHead,
  masterAddress,
  masterPhone,
}) {
  return fetchPdf('/api/challans', {
    kind,
    direction,
    ids,
    ...(masterHead ? { masterHead } : {}),
    ...(masterAddress ? { masterAddress } : {}),
    ...(masterPhone ? { masterPhone } : {}),
  });
}

/** POSTs a body and returns the PDF blob plus the filename the server chose. */
async function fetchPdf(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'Could not generate the document.');
  }

  return {
    blob: await response.blob(),
    filename: response.headers.get('X-Challan-Filename') || 'document.pdf',
  };
}
