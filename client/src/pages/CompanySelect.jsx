import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout.jsx';
import { companies as companiesApi } from '../api/resources.js';
import { landingPath } from '../config/navigation.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { formatDate } from '../utils/format.js';
import { IconAdd, IconEdit, IconSearch } from '../components/icons.jsx';

const blank = { name: '', address: '', phone: '' };

/**
 * "Then User select under which company to work." - Figma "loading" page,
 * `company selection` frame: heading, search field, blue company cards showing
 * the created date, and the signed-in footer.
 *
 * Root, owner and admin can also add a company and edit its letterhead - the
 * name, address and phone numbers printed at the top of every challan.
 */
export default function CompanySelect() {
  const { user, email, chooseCompany, signOut } = useAuth();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState(null); // { mode, id } | null
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    companiesApi
      .list()
      .then((payload) => {
        setCompanies(payload.companies);
        setCanManage(payload.canManage);
      })
      .catch((failure) => setError(failure.message));

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? companies.filter((c) => c.name.toLowerCase().includes(term)) : companies;
  }, [companies, search]);

  const pick = async (company) => {
    setBusy(true);
    setError('');
    try {
      await chooseCompany(company.id);
      navigate(landingPath(user.role));
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  const openCreate = () => {
    setEditor({ mode: 'create' });
    setForm(blank);
    setError('');
  };

  const openEdit = (company) => {
    setEditor({ mode: 'edit', id: company.id });
    setForm({ name: company.name, address: company.address, phone: company.phone });
    setError('');
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    setBusy(true);
    setError('');
    try {
      if (editor.mode === 'create') await companiesApi.create(form);
      else await companiesApi.update(editor.id, form);
      setEditor(null);
      setForm(blank);
      await load();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <>
      <p className="font-mono text-data">Signed in as {email || user?.email}</p>
      <button
        type="button"
        onClick={signOut}
        className="mt-[4px] font-mono text-data text-danger underline"
      >
        Sign Out
      </button>
    </>
  );

  return (
    <AuthLayout page="Login" variant="sheet" footer={footer}>
      <h1 className="font-mono text-heading font-bold">Select Company</h1>
      <p className="mt-[8px] font-mono text-title">Choose a company to continue</p>

      <div className="mt-[36px] flex h-[42px] w-[365px] max-w-full items-stretch overflow-hidden rounded-[6px] border border-ink">
        <span className="flex w-[40px] shrink-0 items-center justify-center border-r border-ink">
          <IconSearch width={16} height={16} />
        </span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search company.."
          aria-label="Search company"
          className="min-w-0 flex-1 bg-transparent px-3 font-mono text-data outline-none placeholder:text-soft"
        />
      </div>

      {error && <p className="mt-6 font-mono text-data text-danger">{error}</p>}

      <div className="mt-[42px] grid w-full max-w-[820px] grid-cols-1 gap-x-[40px] gap-y-[26px] sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((company) => (
          <div key={company.id} className="relative">
            <button
              type="button"
              disabled={busy}
              onClick={() => pick(company)}
              className="w-full rounded-[8px] bg-card-accent px-[14px] py-[12px] text-left text-on-dark transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <span className="block pr-7 font-mono text-title">{company.name}</span>
              <span className="mt-[4px] block font-mono text-note">
                Created On- {formatDate(company.createdAt)}
              </span>
              {company.address && (
                <span className="mt-[6px] block truncate font-mono text-note opacity-80">
                  {company.address}
                </span>
              )}
            </button>

            {canManage && (
              <button
                type="button"
                onClick={() => openEdit(company)}
                aria-label={`Edit ${company.name}`}
                title="Edit letterhead"
                className="absolute right-[8px] top-[8px] rounded-[4px] p-[4px] text-on-dark transition-colors hover:bg-on-dark/20"
              >
                <IconEdit width={15} height={15} />
              </button>
            )}
          </div>
        ))}

        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center justify-center gap-2 rounded-[8px] border-2 border-dashed border-outline px-[14px] py-[20px] font-mono text-data text-body transition-colors hover:border-accent hover:text-accent"
          >
            <IconAdd width={18} height={18} />
            Add Company
          </button>
        )}
      </div>

      {visible.length === 0 && !canManage && (
        <p className="mt-10 font-mono text-data text-soft">
          No companies have been set up yet. Ask an owner to add one.
        </p>
      )}

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-6">
          <form
            onSubmit={save}
            className="w-full max-w-[520px] rounded-[14px] bg-surface p-[30px]"
            role="dialog"
            aria-label={editor.mode === 'create' ? 'Add company' : 'Edit company'}
          >
            <h2 className="font-mono text-title font-bold">
              {editor.mode === 'create' ? 'Add Company' : 'Edit Company'}
            </h2>
            <p className="mt-[4px] font-mono text-note text-soft">
              The name, address and phone print at the top of every challan.
            </p>

            <div className="mt-[22px] space-y-[16px]">
              <LetterheadField
                id="company-name"
                label="Company name"
                value={form.name}
                onChange={(name) => setForm((f) => ({ ...f, name }))}
                placeholder="Jiya Fashion"
              />
              <LetterheadField
                id="company-address"
                label="Address"
                value={form.address}
                onChange={(address) => setForm((f) => ({ ...f, address }))}
                placeholder="A-509, Aashirwad Textile Market, Saroli, Surat"
              />
              <LetterheadField
                id="company-phone"
                label="Phone numbers"
                value={form.phone}
                onChange={(phone) => setForm((f) => ({ ...f, phone }))}
                placeholder="9233451156, 9128177722"
              />
            </div>

            <div className="mt-[26px] flex justify-end gap-[14px]">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="btn-danger-outline h-[34px] px-5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !form.name.trim()}
                className="btn-accent h-[34px] px-5"
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AuthLayout>
  );
}

function LetterheadField({ id, label, value, onChange, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="field-shell">
        <input
          id={id}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="field-control"
        />
      </div>
    </div>
  );
}
