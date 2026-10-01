import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { getSettings, updateSettings } from '@/services/settings';
import { changePassword } from '@/services/auth';

type Tab = 'general' | 'security';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('general');

  return (
    <div>
      <PageHeader title="Settings" description="Academy configuration and security" />

      <div className="mb-6 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
        {([
          { key: 'general', label: 'General' },
          { key: 'security', label: 'Security' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && <GeneralTab />}
      {tab === 'security' && <SecurityTab />}
    </div>
  );
}

const SETTINGS_KEYS = [
  { key: 'academy_name', label: 'Academy Name', type: 'text' },
  { key: 'tagline', label: 'Tagline', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'whatsapp_number', label: 'WhatsApp Number', type: 'tel' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'maps_embed_url', label: 'Maps Embed URL', type: 'text' },
  { key: 'latitude', label: 'Latitude', type: 'text' },
  { key: 'longitude', label: 'Longitude', type: 'text' },
  { key: 'opening_hours', label: 'Opening Hours', type: 'text' },
  { key: 'facebook', label: 'Facebook URL', type: 'text' },
  { key: 'instagram', label: 'Instagram URL', type: 'text' },
  { key: 'youtube', label: 'YouTube URL', type: 'text' },
  { key: 'footer_text', label: 'Footer Text', type: 'text' },
  { key: 'currency', label: 'Currency', type: 'text' },
  { key: 'invoice_prefix', label: 'Invoice Prefix', type: 'text' },
];

function GeneralTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  useEffect(() => {
    if (settings) {
      const flat = settings as Record<string, unknown>;
      const mapped: Record<string, string> = {};
      SETTINGS_KEYS.forEach(({ key }) => {
        mapped[key] = String(flat[key] ?? '');
      });
      setForm(mapped);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => updateSettings(form),
    onSuccess: () => {
      toast.success('Settings saved');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e) => toast.error(handleError(e)),
  });

  if (isLoading) return <SkeletonTable rows={5} columns={2} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Academy Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SETTINGS_KEYS.map(({ key, label, type }) => (
            <Input
              key={key}
              label={label}
              type={type}
              value={form[key] ?? ''}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const changePassMutation = useMutation({
    mutationFn: () => changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const handleSubmit = () => {
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    changePassMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                loading={changePassMutation.isPending}
                disabled={!currentPassword || !newPassword || !confirmPassword}
                onClick={handleSubmit}
              >
                Change Password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Password Policy</span>
              <span className="font-medium text-slate-700">Minimum 6 characters</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Session Timeout</span>
              <span className="font-medium text-slate-700">24 hours</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Two-Factor Auth</span>
              <span className="font-medium text-slate-400">Not configured</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
