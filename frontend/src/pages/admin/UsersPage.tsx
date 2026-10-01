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
import { formatDate, formatDateTime, getInitials } from '@/utils/format';
import { getUsers, createUser, updateUser, deleteUser, resetPassword, getUserAuditLogs } from '@/services/users';
import type { ApiUser, PaginatedData } from '@/types';

const roleVariant: Record<string, 'info' | 'success' | 'default'> = {
  super_admin: 'info',
  admin: 'success',
  staff: 'default',
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiUser | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'staff', password: '' });

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUser, setResetUser] = useState<ApiUser | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditUserId, setAuditUserId] = useState<number | null>(null);
  const [auditUserName, setAuditUserName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => getUsers({ page, limit: 15 }),
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ['audit-logs', auditUserId],
    queryFn: () => getUserAuditLogs(auditUserId!),
    enabled: auditModalOpen && auditUserId !== null,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { password, ...rest } = form;
        return updateUser(editing.id, rest);
      }
      return createUser(form);
    },
    onSuccess: () => {
      toast.success(editing ? 'User updated' : 'User created');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setModalOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const resetPassMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      resetPassword(id, { password }),
    onSuccess: () => {
      toast.success('Password reset');
      setResetModalOpen(false);
      setResetUser(null);
      setNewPassword('');
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const deactivateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateUser(id, { status }),
    onSuccess: () => {
      toast.success('User deactivated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ firstName: '', lastName: '', email: '', phone: '', role: 'staff', password: '' });
    setModalOpen(true);
  };

  const openEdit = (u: ApiUser) => {
    setEditing(u);
    setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, phone: (u as unknown as Record<string, unknown>).phone as string ?? '', role: u.role, password: '' });
    setModalOpen(true);
  };

  const openReset = (u: ApiUser) => {
    setResetUser(u);
    setNewPassword('');
    setResetModalOpen(true);
  };

  const openAudit = (u: ApiUser) => {
    setAuditUserId(u.id);
    setAuditUserName(`${u.firstName} ${u.lastName}`);
    setAuditModalOpen(true);
  };

  const handleDelete = async (u: ApiUser) => {
    if (await confirm({ title: 'Delete User', message: `Delete ${u.firstName} ${u.lastName}?` })) {
      deleteMutation.mutate(u.id);
    }
  };

  const handleDeactivate = async (u: ApiUser) => {
    const newStatus = (u as unknown as Record<string, unknown>).status === 'active' ? 'inactive' : 'active';
    if (await confirm({ title: 'Change Status', message: `${newStatus === 'active' ? 'Activate' : 'Deactivate'} ${u.firstName} ${u.lastName}?` })) {
      deactivateMutation.mutate({ id: u.id, status: newStatus });
    }
  };

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        description="Manage admin users and permissions"
        actions={<Button onClick={openAdd}>Add User</Button>}
      />

      {isLoading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : items.length === 0 ? (
        <EmptyState title="No users" description="Add your first admin user" action={<Button onClick={openAdd}>Add User</Button>} />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((u) => {
                const uAny = u as ApiUser & Record<string, unknown>;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700">
                          {u.avatar ? (
                            <img src={u.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                          ) : (
                            getInitials(`${u.firstName} ${u.lastName}`)
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleVariant[u.role] ?? 'default'}>{u.role.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={uAny.status === 'active' || !uAny.status ? 'success' : 'danger'}>
                        {uAny.status === 'active' || !uAny.status ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{uAny.lastLogin ? formatDateTime(uAny.lastLogin as string) : 'Never'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => openReset(u)}>Reset Password</Button>
                        <Button variant="ghost" size="sm" onClick={() => openAudit(u)}>Audit Logs</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeactivate(u)}>Deactivate</Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(u)}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {pagination && pagination.totalPages > 1 && (
            <div className="border-t border-slate-200 px-6 py-3">
              <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
            </div>
          )}
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit User' : 'Add User'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </Select>
          {!editing && (
            <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          )}
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Password"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetModalOpen(false)}>Cancel</Button>
            <Button
              loading={resetPassMutation.isPending}
              disabled={!newPassword.trim()}
              onClick={() => {
                if (resetUser) resetPassMutation.mutate({ id: resetUser.id, password: newPassword });
              }}
            >
              Reset Password
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {resetUser && (
            <p className="text-sm text-slate-600">
              Resetting password for <strong>{resetUser.firstName} {resetUser.lastName}</strong>
            </p>
          )}
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
      </Modal>

      {/* Audit Logs Modal */}
      <Modal
        open={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        title={`Audit Logs — ${auditUserName}`}
        footer={<Button variant="secondary" onClick={() => setAuditModalOpen(false)}>Close</Button>}
      >
        {auditLoading ? (
          <SkeletonTable rows={5} columns={3} />
        ) : !auditLogs || auditLogs.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">No audit logs found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(auditLogs as Record<string, unknown>[]).map((log, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{String(log.action ?? '')}</TableCell>
                  <TableCell>{String(log.entity ?? log.entityType ?? '')}{log.entityId ? ` #${log.entityId}` : ''}</TableCell>
                  <TableCell>{formatDateTime(log.createdAt as string ?? log.timestamp as string ?? '')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Modal>
    </div>
  );
}
