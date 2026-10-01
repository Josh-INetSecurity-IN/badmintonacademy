import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import {
  getTournaments,
  getTournament,
  createTournament,
  updateTournament,
  deleteTournament,
  publishTournament,
  registerParticipant,
  getTournamentParticipants,
} from '@/services/tournaments';
import { formatINR, formatDate, getInitials, downloadCSV } from '@/utils/format';
import type { Tournament } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { confirm } from '@/components/ui/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { CalendarDays, Download, Eye, MapPin, Pencil, Plus, Search, Star, Trash2, Trophy, Upload } from 'lucide-react';

const TOURNAMENT_CATEGORIES = [
  'Singles',
  'Doubles',
  'Mixed Doubles',
  'Under-11',
  'Under-13',
  'Under-15',
  'Under-17',
  'Open',
  'Other',
];

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  draft: 'default',
  published: 'info',
  registration_open: 'success',
  registration_closed: 'warning',
  completed: 'default',
  cancelled: 'danger',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  registration_open: 'Registration Open',
  registration_closed: 'Registration Closed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

interface TournamentForm {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  venue: string;
  categories: string[];
  entryFee: string;
  prizeDetails: string;
  rules: string;
  contactDetails: string;
  registrationUrl: string;
  status: string;
  isFeatured: boolean;
}

const emptyForm: TournamentForm = {
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  registrationDeadline: '',
  venue: '',
  categories: [],
  entryFee: '0',
  prizeDetails: '',
  rules: '',
  contactDetails: '',
  registrationUrl: '',
  status: 'draft',
  isFeatured: false,
};

function TournamentFormModal({
  open,
  editing,
  form,
  errors,
  onChange,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  editing: Tournament | null;
  form: TournamentForm;
  errors: Record<string, string>;
  onChange: (form: TournamentForm) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const setField = <K extends keyof TournamentForm>(field: K, value: TournamentForm[K]) => {
    onChange({ ...form, [field]: value });
  };

  const toggleCategory = (cat: string) => {
    const exists = form.categories.includes(cat);
    setField(
      'categories',
      exists ? form.categories.filter((c) => c !== cat) : [...form.categories, cat],
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Tournament' : 'Add Tournament'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} loading={saving}>
            {editing ? 'Update Tournament' : 'Add Tournament'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
          error={errors.name}
          placeholder="e.g. Academy Open Championship 2026"
        />
        <Input
          label="Description"
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
        />
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={form.startDate}
            onChange={(e) => setField('startDate', e.target.value)}
            error={errors.startDate}
          />
          <Input
            label="End Date"
            type="date"
            value={form.endDate}
            onChange={(e) => setField('endDate', e.target.value)}
            error={errors.endDate}
          />
          <Input
            label="Registration Deadline"
            type="date"
            value={form.registrationDeadline}
            onChange={(e) => setField('registrationDeadline', e.target.value)}
          />
        </div>
        <Input
          label="Venue"
          value={form.venue}
          onChange={(e) => setField('venue', e.target.value)}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Categories</label>
          <div className="flex flex-wrap gap-2">
            {TOURNAMENT_CATEGORIES.map((cat) => {
              const active = form.categories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={
                    active
                      ? 'rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white'
                      : 'rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50'
                  }
                >
                  {cat}
                </button>
              );
            })}
          </div>
          {errors.categories && <p className="mt-1 text-sm text-red-600">{errors.categories}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Entry Fee"
            type="number"
            min={0}
            value={form.entryFee}
            onChange={(e) => setField('entryFee', e.target.value)}
          />
          <Select label="Status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <Input label="Prize Details" value={form.prizeDetails} onChange={(e) => setField('prizeDetails', e.target.value)} />
        <Input label="Rules" value={form.rules} onChange={(e) => setField('rules', e.target.value)} />
        <Input label="Contact Details" value={form.contactDetails} onChange={(e) => setField('contactDetails', e.target.value)} />
        <Input
          label="Registration URL"
          value={form.registrationUrl}
          onChange={(e) => setField('registrationUrl', e.target.value)}
          placeholder="https://..."
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={form.isFeatured}
            onChange={(e) => setField('isFeatured', e.target.checked)}
          />
          Featured tournament
        </label>
      </div>
    </Modal>
  );
}

export default function TournamentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [form, setForm] = useState<TournamentForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [detailId, setDetailId] = useState<number | null>(null);
  const [regForm, setRegForm] = useState({
    participantName: '',
    phone: '',
    email: '',
    category: '',
    amount: '',
  });

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['tournaments', 'list', page, search],
    queryFn: () => getTournaments({ page, limit: 10, search: search || undefined }),
  });

  const { data: detailData } = useQuery({
    queryKey: ['tournaments', 'detail', detailId],
    queryFn: () => getTournament(detailId as number),
    enabled: !!detailId,
  });

  const { data: participantsData } = useQuery({
    queryKey: ['tournaments', 'participants', detailId],
    queryFn: () => getTournamentParticipants(detailId as number),
    enabled: !!detailId,
  });

  const tournaments = data?.items ?? [];
  const pagination = data?.pagination;
  const detail = detailData as Tournament | undefined;
  const participants = participantsData ?? [];

  useEffect(() => {
    if (detail) {
      setRegForm({
        participantName: '',
        phone: '',
        email: '',
        category: detail.categories.split(',').map((c) => c.trim()).filter(Boolean)[0] || '',
        amount: detail.entryFee,
      });
    }
  }, [detail]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['tournaments'] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: { id?: number; data: TournamentForm }) => {
      const body = {
        name: payload.data.name,
        description: payload.data.description || undefined,
        startDate: payload.data.startDate,
        endDate: payload.data.endDate,
        registrationDeadline: payload.data.registrationDeadline || undefined,
        venue: payload.data.venue || undefined,
        categories: payload.data.categories.join(','),
        entryFee: Number(payload.data.entryFee || 0),
        prizeDetails: payload.data.prizeDetails || undefined,
        rules: payload.data.rules || undefined,
        contactDetails: payload.data.contactDetails || undefined,
        registrationUrl: payload.data.registrationUrl || undefined,
        status: payload.data.status,
        isFeatured: payload.data.isFeatured,
      };
      return payload.id ? updateTournament(payload.id, body) : createTournament(body);
    },
    onSuccess: (_res, vars) => {
      toast.success(vars.id ? 'Tournament updated' : 'Tournament created');
      setShowFormModal(false);
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTournament,
    onSuccess: () => {
      toast.success('Tournament deleted');
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const publishMutation = useMutation({
    mutationFn: publishTournament,
    onSuccess: () => {
      toast.success('Tournament published');
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: number) => updateTournament(id, { status: 'draft' }),
    onSuccess: () => {
      toast.success('Tournament moved to draft');
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const featuredMutation = useMutation({
    mutationFn: (vars: { id: number; isFeatured: boolean }) => updateTournament(vars.id, { isFeatured: vars.isFeatured }),
    onSuccess: () => {
      toast.success('Featured status updated');
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const registerMutation = useMutation({
    mutationFn: (vars: { id: number; data: unknown }) => registerParticipant(vars.id, vars.data),
    onSuccess: () => {
      toast.success('Participant registered');
      setDetailId(null);
      setShowFormModal(false);
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      startDate: new Date().toISOString().slice(0, 10),
    });
    setFormErrors({});
    setShowFormModal(true);
  };

  const openEdit = (t: Tournament) => {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description ?? '',
      startDate: t.startDate,
      endDate: t.endDate,
      registrationDeadline: t.registrationDeadline ?? '',
      venue: t.venue ?? '',
      categories: t.categories.split(',').map((c) => c.trim()).filter(Boolean),
      entryFee: t.entryFee,
      prizeDetails: t.prizeDetails ?? '',
      rules: t.rules ?? '',
      contactDetails: t.contactDetails ?? '',
      registrationUrl: t.registrationUrl ?? '',
      status: t.status,
      isFeatured: t.isFeatured,
    });
    setFormErrors({});
    setShowFormModal(true);
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.startDate) errs.startDate = 'Required';
    if (!form.endDate) errs.endDate = 'Required';
    if (form.categories.length === 0) errs.categories = 'Select at least one category';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    saveMutation.mutate({ id: editing?.id, data: form });
  };

  const handleDelete = async (t: Tournament) => {
    const ok = await confirm({
      title: 'Delete Tournament',
      message: `Delete "${t.name}"? All registrations will also be removed.`,
      confirmText: 'Delete',
    });
    if (ok) deleteMutation.mutate(t.id);
  };

  const handlePublishToggle = (t: Tournament) => {
    if (t.status === 'draft' || t.status === 'registration_closed' || t.status === 'cancelled') {
      publishMutation.mutate(t.id);
    } else {
      unpublishMutation.mutate(t.id);
    }
  };

  const handleFeaturedToggle = (t: Tournament) => {
    featuredMutation.mutate({ id: t.id, isFeatured: !t.isFeatured });
  };

  const handleRegister = () => {
    if (!detailId) return;
    const errs: Record<string, string> = {};
    if (!regForm.participantName.trim()) errs.participantName = 'Required';
    if (!regForm.phone.trim()) errs.phone = 'Required';
    if (!regForm.category) errs.category = 'Required';
    if (!regForm.amount || Number(regForm.amount) <= 0) errs.amount = 'Enter a valid amount';
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;
    registerMutation.mutate({
      id: detailId,
      data: {
        participantName: regForm.participantName.trim(),
        phone: regForm.phone.trim(),
        email: regForm.email.trim() || undefined,
        category: regForm.category,
        amount: Number(regForm.amount),
      },
    });
  };

  const handleExportParticipants = () => {
    const rows = participants.map((p) => [
      p.participantName,
      p.phone,
      p.email || '',
      p.category,
      Number(p.amount),
      p.paymentStatus,
    ]);
    downloadCSV(
      `${(detail?.name || 'tournament').replace(/\s+/g, '-').toLowerCase()}-participants.csv`,
      ['Participant', 'Phone', 'Email', 'Category', 'Amount', 'Payment Status'],
      rows,
    );
  };

  const registrationCount = (t: Tournament) =>
    t._count?.registrations ?? (t.registrations ? t.registrations.length : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tournaments"
        description="Plan tournaments and manage registrations"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Tournaments' },
        ]}
        actions={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Tournament
          </Button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search tournaments..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} columns={9} />
      ) : tournaments.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-12 w-12" />}
          title="No tournaments found"
          description="Create your first tournament or adjust your search."
          action={
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add Tournament
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tournament</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead className="text-right">Entry Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Registrations</TableHead>
                  <TableHead className="text-center">Featured</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournaments.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {t.poster ? (
                          <img src={t.poster} alt={t.name} className="h-10 w-16 rounded-md object-cover" />
                        ) : (
                          <div className="flex h-10 w-16 items-center justify-center rounded-md bg-indigo-50 text-sm font-semibold text-indigo-600">
                            {getInitials(t.name)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-slate-900">{t.name}</div>
                          <div className="text-xs text-slate-500">
                            {t.categories.split(',').map((c) => c.trim()).filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1 text-slate-600">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        {formatDate(t.startDate)} - {formatDate(t.endDate)}
                      </div>
                      {t.registrationDeadline && (
                        <div className="text-xs text-slate-500">Deadline: {formatDate(t.registrationDeadline)}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1 text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {t.venue || '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatINR(t.entryFee)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[t.status] || 'default'}>
                        {STATUS_LABELS[t.status] || t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium text-slate-900">
                      {registrationCount(t)}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        title="Toggle featured"
                        onClick={() => handleFeaturedToggle(t)}
                        disabled={featuredMutation.isPending}
                      >
                        <Star
                          className={`h-5 w-5 ${t.isFeatured ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                        />
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" title="View" onClick={() => setDetailId(t.id)}>
                          <Eye className="h-4 w-4 text-indigo-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t.status === 'draft' ? 'Publish' : 'Move to Draft'}
                          onClick={() => handlePublishToggle(t)}
                          loading={publishMutation.isPending || unpublishMutation.isPending}
                        >
                          <Upload className={`h-4 w-4 ${t.status === 'draft' ? 'text-green-600' : 'text-slate-400'}`} />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4 text-indigo-600" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(t)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {pagination && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} tournaments
              </p>
              <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      <TournamentFormModal
        open={showFormModal}
        editing={editing}
        form={form}
        errors={formErrors}
        onChange={setForm}
        onClose={() => setShowFormModal(false)}
        onSave={handleSave}
        saving={saveMutation.isPending}
      />

      <Modal
        open={!!detailId}
        onClose={() => setDetailId(null)}
        title={detail ? detail.name : 'Tournament Details'}
        footer={
          <Button variant="secondary" onClick={() => setDetailId(null)}>
            Close
          </Button>
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-500">Dates</div>
                <div className="font-medium text-slate-900">
                  {formatDate(detail.startDate)} - {formatDate(detail.endDate)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-slate-500">Status</div>
                <Badge variant={STATUS_BADGE[detail.status] || 'default'}>{STATUS_LABELS[detail.status] || detail.status}</Badge>
              </div>
            </div>

            {detail.description && <p className="text-sm text-slate-600">{detail.description}</p>}

            <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Venue</span>
                <span className="font-medium text-slate-900">{detail.venue || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Entry Fee</span>
                <span className="font-medium text-slate-900">{formatINR(detail.entryFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Deadline</span>
                <span className="font-medium text-slate-900">{formatDate(detail.registrationDeadline)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Categories</span>
                <span className="max-w-[60%] text-right font-medium text-slate-900">
                  {detail.categories.split(',').map((c) => c.trim()).filter(Boolean).join(', ')}
                </span>
              </div>
              {detail.registrationUrl && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">URL</span>
                  <a href={detail.registrationUrl} target="_blank" rel="noopener noreferrer" className="max-w-[60%] truncate text-indigo-600 hover:underline">
                    {detail.registrationUrl}
                  </a>
                </div>
              )}
            </div>

            {detail.prizeDetails && (
              <div>
                <div className="mb-1 text-sm font-medium text-slate-700">Prize Details</div>
                <p className="text-sm text-slate-600">{detail.prizeDetails}</p>
              </div>
            )}
            {detail.rules && (
              <div>
                <div className="mb-1 text-sm font-medium text-slate-700">Rules</div>
                <p className="text-sm text-slate-600 whitespace-pre-line">{detail.rules}</p>
              </div>
            )}
            {detail.contactDetails && (
              <div>
                <div className="mb-1 text-sm font-medium text-slate-700">Contact Details</div>
                <p className="text-sm text-slate-600">{detail.contactDetails}</p>
              </div>
            )}

            <div className="border-t border-slate-200 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Participants ({participants.length})
                </h3>
                <Button variant="outline" size="sm" onClick={handleExportParticipants} disabled={participants.length === 0}>
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>

              {participants.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">No participants registered yet.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Phone</th>
                        <th className="px-3 py-2 font-medium">Category</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((p) => (
                        <tr key={p.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2 font-medium text-slate-900">{p.participantName}</td>
                          <td className="px-3 py-2 text-slate-500">{p.phone}</td>
                          <td className="px-3 py-2">{p.category}</td>
                          <td className="px-3 py-2 text-right">{formatINR(p.amount)}</td>
                          <td className="px-3 py-2">
                            <Badge variant={p.paymentStatus === 'paid' ? 'success' : p.paymentStatus === 'pending' ? 'warning' : 'default'}>
                              {p.paymentStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 rounded-lg border border-slate-200 p-3">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Add Registration</h3>
                <div className="space-y-3">
                  <Input
                    label="Participant Name"
                    value={regForm.participantName}
                    onChange={(e) => setRegForm((prev) => ({ ...prev, participantName: e.target.value }))}
                    error={formErrors.participantName}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Phone"
                      value={regForm.phone}
                      onChange={(e) => setRegForm((prev) => ({ ...prev, phone: e.target.value }))}
                      error={formErrors.phone}
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={regForm.email}
                      onChange={(e) => setRegForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      label="Category"
                      value={regForm.category}
                      onChange={(e) => setRegForm((prev) => ({ ...prev, category: e.target.value }))}
                      error={formErrors.category}
                    >
                      <option value="">Select category</option>
                      {detail.categories
                        .split(',')
                        .map((c) => c.trim())
                        .filter(Boolean)
                        .map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    </Select>
                    <Input
                      label="Amount"
                      type="number"
                      min={0}
                      value={regForm.amount}
                      onChange={(e) => setRegForm((prev) => ({ ...prev, amount: e.target.value }))}
                      error={formErrors.amount}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleRegister} loading={registerMutation.isPending}>
                      <Trophy className="h-4 w-4" />
                      Register Participant
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}