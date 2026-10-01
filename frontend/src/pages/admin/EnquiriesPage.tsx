import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal, confirm } from '@/components/ui/Modal';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, downloadCSV } from '@/utils/format';
import { getEnquiries, updateEnquiryStatus, deleteEnquiry } from '@/services/settings';
import type { Enquiry, PaginatedData } from '@/types';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'closed', label: 'Closed' },
];

const statusVariant: Record<string, 'info' | 'warning' | 'success' | 'default'> = {
  new: 'info',
  contacted: 'warning',
  closed: 'success',
};

export default function EnquiriesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailEnquiry, setDetailEnquiry] = useState<Enquiry | null>(null);
  const [noteText, setNoteText] = useState('');

  const params: Record<string, unknown> = { page, limit: 15 };
  if (statusFilter) params.status = statusFilter;
  if (search) params.search = search;

  const { data, isLoading } = useQuery({
    queryKey: ['enquiries', params],
    queryFn: () => getEnquiries(params),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateEnquiryStatus(id, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      updateEnquiryStatus(id, { notes }),
    onSuccess: () => {
      toast.success('Note added');
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      setNoteText('');
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEnquiry,
    onSuccess: () => {
      toast.success('Enquiry deleted');
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const handleDelete = async (id: number) => {
    if (await confirm({ title: 'Delete Enquiry', message: 'Are you sure you want to delete this enquiry?' })) {
      deleteMutation.mutate(id);
    }
  };

  const handleExport = () => {
    const items = data?.items ?? [];
    const headers = ['Name', 'Phone', 'Email', 'Subject', 'Source', 'Status', 'Date'];
    const rows = items.map((e) => [
      e.name,
      e.phone,
      e.email ?? '',
      e.subject ?? '',
      e.source,
      e.status,
      formatDate(e.createdAt),
    ]);
    downloadCSV('enquiries.csv', headers, rows);
  };

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <div>
      <PageHeader
        title="Contact Enquiries"
        description="Manage incoming enquiries"
        actions={<Button variant="outline" onClick={handleExport}>Export CSV</Button>}
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="w-48">
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
        <div className="w-64">
          <Input
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} columns={7} />
      ) : items.length === 0 ? (
        <EmptyState title="No enquiries found" description="No enquiries match your filters" />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((enq) => (
                <TableRow key={enq.id}>
                  <TableCell className="font-medium">{enq.name}</TableCell>
                  <TableCell>{enq.phone}</TableCell>
                  <TableCell>{enq.email ?? '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{enq.subject ?? '-'}</TableCell>
                  <TableCell><Badge variant="outline">{enq.source}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[enq.status] ?? 'default'}>{enq.status}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(enq.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Select
                        value={enq.status}
                        onChange={(e) => updateStatusMutation.mutate({ id: enq.id, status: e.target.value })}
                        className="w-28"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="closed">Closed</option>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => { setDetailEnquiry(enq); setNoteText(''); }}>View</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(enq.id)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {pagination && pagination.totalPages > 1 && (
            <div className="border-t border-slate-200 px-6 py-3">
              <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
            </div>
          )}
        </Card>
      )}

      <Modal
        open={!!detailEnquiry}
        onClose={() => setDetailEnquiry(null)}
        title="Enquiry Details"
        footer={<Button variant="secondary" onClick={() => setDetailEnquiry(null)}>Close</Button>}
      >
        {detailEnquiry && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Name:</span> <span className="font-medium">{detailEnquiry.name}</span></div>
              <div><span className="text-slate-500">Phone:</span> <span className="font-medium">{detailEnquiry.phone}</span></div>
              <div><span className="text-slate-500">Email:</span> <span className="font-medium">{detailEnquiry.email ?? '-'}</span></div>
              <div><span className="text-slate-500">Source:</span> <Badge variant="outline">{detailEnquiry.source}</Badge></div>
              <div><span className="text-slate-500">Status:</span> <Badge variant={statusVariant[detailEnquiry.status] ?? 'default'}>{detailEnquiry.status}</Badge></div>
              <div><span className="text-slate-500">Date:</span> <span className="font-medium">{formatDate(detailEnquiry.createdAt)}</span></div>
            </div>

            {detailEnquiry.subject && (
              <div>
                <p className="text-sm font-medium text-slate-500">Subject</p>
                <p className="text-sm text-slate-900">{detailEnquiry.subject}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-slate-500">Message</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{detailEnquiry.message}</p>
            </div>

            {detailEnquiry.notes && (
              <div>
                <p className="text-sm font-medium text-slate-500">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 rounded-md p-3">{detailEnquiry.notes}</p>
              </div>
            )}

            <div>
              <p className="mb-1 text-sm font-medium text-slate-500">Add Note</p>
              <textarea
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Type a note..."
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <Button
                size="sm"
                className="mt-2"
                loading={addNoteMutation.isPending}
                disabled={!noteText.trim()}
                onClick={() => {
                  const existing = detailEnquiry.notes ? detailEnquiry.notes + '\n\n' : '';
                  addNoteMutation.mutate({
                    id: detailEnquiry.id,
                    notes: existing + noteText.trim(),
                  });
                }}
              >
                Save Note
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
