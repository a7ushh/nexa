/**
 * Navigation model. `page` matches the server's PAGE_ACCESS keys, so the bar
 * shows exactly what the signed-in role may open.
 */
export const NAV_ITEMS = [
  { page: 'grey', label: 'Grey', path: '/grey' },
  {
    page: 'embroidery',
    label: 'Embroidery',
    path: '/embroidery/issue',
    // steps.md: "even that sub option is within navbar"
    children: [
      { label: 'Issue', path: '/embroidery/issue' },
      { label: 'Receive', path: '/embroidery/receive' },
    ],
  },
  {
    page: 'handwork',
    label: 'Handwork',
    path: '/handwork/issue',
    children: [
      { label: 'Issue', path: '/handwork/issue' },
      { label: 'Receive', path: '/handwork/receive' },
    ],
  },
  { page: 'report', label: 'Report', path: '/report' },
  { page: 'master', label: 'Master', path: '/masters' },
  { page: 'users', label: 'Users', path: '/users' },
  { page: 'log', label: 'Log', path: '/logs' },
];

export const PAGE_ACCESS = {
  root: ['grey', 'embroidery', 'handwork', 'report', 'master', 'users', 'log'],
  owner: ['grey', 'embroidery', 'handwork', 'report', 'master', 'users'],
  admin: ['grey', 'embroidery', 'handwork', 'report', 'master'],
  grey: ['grey'],
  embroidery: ['embroidery'],
  handwork: ['handwork'],
};

export const PRIVILEGED_ROLES = ['root', 'owner', 'admin'];

export const canDelete = (role) => PRIVILEGED_ROLES.includes(role);
export const canShare = (role) => PRIVILEGED_ROLES.includes(role);

export function navFor(role) {
  const allowed = PAGE_ACCESS[role] ?? [];
  return NAV_ITEMS.filter((item) => allowed.includes(item.page));
}

/** Where a role lands after choosing a company. */
export function landingPath(role) {
  return navFor(role)[0]?.path ?? '/grey';
}
