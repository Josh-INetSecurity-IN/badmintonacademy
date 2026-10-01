import { useState, useEffect } from 'react';
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
import { EmptyState } from '@/components/ui/EmptyState';
import {
  getHeroSlides, createHeroSlide, updateHeroSlide, deleteHeroSlide,
  getPrograms, createProgram, updateProgram, deleteProgram,
  getFacilities, createFacility, updateFacility, deleteFacility,
  getGallery, uploadGalleryImage, updateGalleryImage, deleteGalleryImage,
  getTestimonials, createTestimonial, updateTestimonial, deleteTestimonial,
  getSettings, updateSettings,
} from '@/services/settings';

type Tab = 'hero' | 'programs' | 'facilities' | 'gallery' | 'testimonials' | 'about';

interface HeroSlide {
  id: number; title: string; subtitle?: string; image: string;
  ctaText?: string; ctaLink?: string; sortOrder: number; isActive: boolean;
}
interface Program {
  id: number; title: string; description?: string; image?: string;
  ageGroup?: string; skillLevel?: string; feeDisplay?: string; isActive: boolean;
}
interface Facility {
  id: number; icon?: string; title: string; description?: string; sortOrder: number; isActive: boolean;
}
interface GalleryItem {
  id: number; image: string; title?: string; category?: string; sortOrder: number; isPublished: boolean;
}
interface Testimonial {
  id: number; name: string; rating: number; testimonial: string; isPublished: boolean;
}

export default function WebsiteContentPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('hero');

  return (
    <div>
      <PageHeader title="Website Content" description="Manage your public website" />

      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
        {([
          { key: 'hero', label: 'Hero Slides' },
          { key: 'programs', label: 'Programs' },
          { key: 'facilities', label: 'Facilities' },
          { key: 'gallery', label: 'Gallery' },
          { key: 'testimonials', label: 'Testimonials' },
          { key: 'about', label: 'About & Footer' },
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

      {tab === 'hero' && <HeroSlidesTab />}
      {tab === 'programs' && <ProgramsTab />}
      {tab === 'facilities' && <FacilitiesTab />}
      {tab === 'gallery' && <GalleryTab />}
      {tab === 'testimonials' && <TestimonialsTab />}
      {tab === 'about' && <AboutFooterTab />}
    </div>
  );
}

function HeroSlidesTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HeroSlide | null>(null);
  const [form, setForm] = useState({ title: '', subtitle: '', ctaText: '', ctaLink: '', sortOrder: '0', isActive: true });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ['hero-slides'],
    queryFn: getHeroSlides,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('subtitle', form.subtitle);
      fd.append('ctaText', form.ctaText);
      fd.append('ctaLink', form.ctaLink);
      fd.append('sortOrder', form.sortOrder);
      fd.append('isActive', String(form.isActive));
      if (imageFile) fd.append('image', imageFile);
      if (editing) return updateHeroSlide(editing.id, fd);
      return createHeroSlide(fd);
    },
    onSuccess: () => {
      toast.success(editing ? 'Slide updated' : 'Slide created');
      queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
      setModalOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHeroSlide,
    onSuccess: () => {
      toast.success('Slide deleted');
      queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', subtitle: '', ctaText: '', ctaLink: '', sortOrder: '0', isActive: true });
    setImageFile(null);
    setModalOpen(true);
  };

  const openEdit = (s: HeroSlide) => {
    setEditing(s);
    setForm({ title: s.title, subtitle: s.subtitle ?? '', ctaText: s.ctaText ?? '', ctaLink: s.ctaLink ?? '', sortOrder: String(s.sortOrder), isActive: s.isActive });
    setImageFile(null);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (await confirm({ title: 'Delete Slide', message: 'Are you sure you want to delete this hero slide?' })) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openAdd}>Add Slide</Button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={3} columns={6} />
      ) : (slides as HeroSlide[]).length === 0 ? (
        <EmptyState title="No hero slides" description="Add your first hero slide to get started" action={<Button onClick={openAdd}>Add Slide</Button>} />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Subtitle</TableHead>
                <TableHead>CTA</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(slides as HeroSlide[]).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <img src={s.image} alt={s.title} className="h-12 w-20 rounded object-cover" />
                  </TableCell>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>{s.subtitle ?? '-'}</TableCell>
                  <TableCell>{s.ctaText ?? '-'}</TableCell>
                  <TableCell>{s.sortOrder}</TableCell>
                  <TableCell><Badge variant={s.isActive ? 'success' : 'default'}>{s.isActive ? 'Yes' : 'No'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Hero Slide' : 'Add Hero Slide'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          <Input label="CTA Text" value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} />
          <Input label="CTA Link" value={form.ctaLink} onChange={(e) => setForm({ ...form, ctaLink: e.target.value })} />
          <Input label="Sort Order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="hs-active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
            <label htmlFor="hs-active" className="text-sm font-medium text-slate-700">Active</label>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Image</label>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100" />
            {editing && !imageFile && (
              <p className="mt-1 text-xs text-slate-400">Leave empty to keep current image</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ProgramsTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Program | null>(null);
  const [form, setForm] = useState({ title: '', description: '', ageGroup: '', skillLevel: '', feeDisplay: '', isActive: true });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['programs'],
    queryFn: getPrograms,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('ageGroup', form.ageGroup);
      fd.append('skillLevel', form.skillLevel);
      fd.append('feeDisplay', form.feeDisplay);
      fd.append('isActive', String(form.isActive));
      if (imageFile) fd.append('image', imageFile);
      if (editing) return updateProgram(editing.id, fd);
      return createProgram(fd);
    },
    onSuccess: () => {
      toast.success(editing ? 'Program updated' : 'Program created');
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      setModalOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProgram,
    onSuccess: () => {
      toast.success('Program deleted');
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', description: '', ageGroup: '', skillLevel: '', feeDisplay: '', isActive: true });
    setImageFile(null);
    setModalOpen(true);
  };

  const openEdit = (p: Program) => {
    setEditing(p);
    setForm({ title: p.title, description: p.description ?? '', ageGroup: p.ageGroup ?? '', skillLevel: p.skillLevel ?? '', feeDisplay: p.feeDisplay ?? '', isActive: p.isActive });
    setImageFile(null);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (await confirm({ title: 'Delete Program', message: 'Are you sure?' })) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openAdd}>Add Program</Button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={3} columns={4} />
      ) : (programs as Program[]).length === 0 ? (
        <EmptyState title="No programs" description="Add your first program" action={<Button onClick={openAdd}>Add Program</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(programs as Program[]).map((p) => (
            <Card key={p.id} className="overflow-hidden">
              {p.image && <img src={p.image} alt={p.title} className="h-auto w-full object-cover" />}
              <CardContent>
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="font-semibold text-slate-900">{p.title}</h3>
                  <Badge variant={p.isActive ? 'success' : 'default'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                {p.ageGroup && <p className="text-sm text-slate-500">Age: {p.ageGroup}</p>}
                {p.skillLevel && <p className="text-sm text-slate-500">Level: {p.skillLevel}</p>}
                {p.feeDisplay && <p className="mt-2 text-sm font-medium text-indigo-600">{p.feeDisplay}</p>}
                <div className="mt-4 flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Program' : 'Add Program'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Age Group" value={form.ageGroup} onChange={(e) => setForm({ ...form, ageGroup: e.target.value })} />
          <Input label="Skill Level" value={form.skillLevel} onChange={(e) => setForm({ ...form, skillLevel: e.target.value })} />
          <Input label="Fee Display" value={form.feeDisplay} onChange={(e) => setForm({ ...form, feeDisplay: e.target.value })} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="prog-active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
            <label htmlFor="prog-active" className="text-sm font-medium text-slate-700">Active</label>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Image</label>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100" />
            {editing && !imageFile && <p className="mt-1 text-xs text-slate-400">Leave empty to keep current image</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function FacilitiesTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [form, setForm] = useState({ icon: '', title: '', description: '', sortOrder: '0', isActive: true });

  const { data: facilities = [], isLoading } = useQuery({
    queryKey: ['facilities'],
    queryFn: getFacilities,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, sortOrder: Number(form.sortOrder) };
      if (editing) return updateFacility(editing.id, payload);
      return createFacility(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Facility updated' : 'Facility created');
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      setModalOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFacility,
    onSuccess: () => {
      toast.success('Facility deleted');
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ icon: '', title: '', description: '', sortOrder: '0', isActive: true });
    setModalOpen(true);
  };

  const openEdit = (f: Facility) => {
    setEditing(f);
    setForm({ icon: f.icon ?? '', title: f.title, description: f.description ?? '', sortOrder: String(f.sortOrder), isActive: f.isActive });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (await confirm({ title: 'Delete Facility', message: 'Are you sure?' })) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openAdd}>Add Facility</Button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={3} columns={4} />
      ) : (facilities as Facility[]).length === 0 ? (
        <EmptyState title="No facilities" description="Add your first facility" action={<Button onClick={openAdd}>Add Facility</Button>} />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Icon</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(facilities as Facility[]).map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-sm">{f.icon ?? '-'}</TableCell>
                  <TableCell className="font-medium">{f.title}</TableCell>
                  <TableCell className="max-w-xs truncate">{f.description ?? '-'}</TableCell>
                  <TableCell>{f.sortOrder}</TableCell>
                  <TableCell><Badge variant={f.isActive ? 'success' : 'default'}>{f.isActive ? 'Yes' : 'No'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(f)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(f.id)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Facility' : 'Add Facility'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Icon Name" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Sort Order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="fac-active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
            <label htmlFor="fac-active" className="text-sm font-medium text-slate-700">Active</label>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function GalleryTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [form, setForm] = useState({ title: '', category: '', sortOrder: '0', isPublished: true });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { data: images = [], isLoading } = useQuery({
    queryKey: ['gallery'],
    queryFn: getGallery,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!imageFile) throw new Error('Image is required');
      const fd = new FormData();
      fd.append('image', imageFile);
      fd.append('title', form.title);
      fd.append('category', form.category);
      fd.append('sortOrder', form.sortOrder);
      fd.append('isPublished', String(form.isPublished));
      if (editing) return updateGalleryImage(editing.id, fd);
      return uploadGalleryImage(fd);
    },
    onSuccess: () => {
      toast.success(editing ? 'Image updated' : 'Image uploaded');
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      setModalOpen(false);
      setEditing(null);
      setImageFile(null);
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGalleryImage,
    onSuccess: () => {
      toast.success('Image deleted');
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', category: '', sortOrder: '0', isPublished: true });
    setImageFile(null);
    setModalOpen(true);
  };

  const openEdit = (g: GalleryItem) => {
    setEditing(g);
    setForm({ title: g.title ?? '', category: g.category ?? '', sortOrder: String(g.sortOrder), isPublished: g.isPublished });
    setImageFile(null);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (await confirm({ title: 'Delete Image', message: 'Are you sure?' })) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openAdd}>Upload Image</Button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={3} columns={4} />
      ) : (images as GalleryItem[]).length === 0 ? (
        <EmptyState title="No gallery images" description="Upload your first image" action={<Button onClick={openAdd}>Upload Image</Button>} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {(images as GalleryItem[]).map((g) => (
            <div key={g.id} className="group relative overflow-hidden rounded-lg border border-slate-200">
              <img src={g.image} alt={g.title ?? ''} className="aspect-square w-full object-cover" />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                <div className="w-full p-3">
                  <p className="text-sm font-medium text-white">{g.title ?? 'Untitled'}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {g.category && <Badge variant="outline">{g.category}</Badge>}
                    <Badge variant={g.isPublished ? 'success' : 'default'}>{g.isPublished ? 'Published' : 'Draft'}</Badge>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button variant="ghost" size="sm" className="text-white hover:text-white" onClick={() => openEdit(g)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-white hover:text-white" onClick={() => handleDelete(g.id)}>Delete</Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Image' : 'Upload Image'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={uploadMutation.isPending} onClick={() => uploadMutation.mutate()}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Input label="Sort Order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="gal-pub" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
            <label htmlFor="gal-pub" className="text-sm font-medium text-slate-700">Published</label>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Image *</label>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100" />
            {editing && !imageFile && <p className="mt-1 text-xs text-slate-400">Leave empty to keep current image</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TestimonialsTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState({ name: '', rating: '5', testimonial: '', isPublished: true });

  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ['testimonials'],
    queryFn: getTestimonials,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, rating: Number(form.rating) };
      if (editing) return updateTestimonial(editing.id, payload);
      return createTestimonial(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Testimonial updated' : 'Testimonial created');
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      setModalOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTestimonial,
    onSuccess: () => {
      toast.success('Testimonial deleted');
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', rating: '5', testimonial: '', isPublished: true });
    setModalOpen(true);
  };

  const openEdit = (t: Testimonial) => {
    setEditing(t);
    setForm({ name: t.name, rating: String(t.rating), testimonial: t.testimonial, isPublished: t.isPublished });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (await confirm({ title: 'Delete Testimonial', message: 'Are you sure?' })) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openAdd}>Add Testimonial</Button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={3} columns={4} />
      ) : (testimonials as Testimonial[]).length === 0 ? (
        <EmptyState title="No testimonials" description="Add your first testimonial" action={<Button onClick={openAdd}>Add Testimonial</Button>} />
      ) : (
        <div className="space-y-4">
          {(testimonials as Testimonial[]).map((t) => (
            <Card key={t.id}>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-900">{t.name}</h4>
                      <Badge variant={t.isPublished ? 'success' : 'default'}>{t.isPublished ? 'Published' : 'Draft'}</Badge>
                    </div>
                    <div className="mt-1 flex gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <svg key={i} className={`h-4 w-4 ${i < t.rating ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{t.testimonial}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}>Delete</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Testimonial' : 'Add Testimonial'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Rating" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>
            ))}
          </Select>
          <div className="w-full">
            <label className="mb-1 block text-sm font-medium text-slate-700">Testimonial</label>
            <textarea
              rows={4}
              value={form.testimonial}
              onChange={(e) => setForm({ ...form, testimonial: e.target.value })}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="test-pub" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
            <label htmlFor="test-pub" className="text-sm font-medium text-slate-700">Published</label>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AboutFooterTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  useEffect(() => {
    if (settings) {
      const flat = settings as Record<string, unknown>;
      setForm({
        about_heading: String(flat.about_heading ?? ''),
        about_description: String(flat.about_description ?? ''),
        about_image: String(flat.about_image ?? ''),
        mission: String(flat.mission ?? ''),
        vision: String(flat.vision ?? ''),
        highlights: String(flat.highlights ?? ''),
        footer_text: String(flat.footer_text ?? ''),
      });
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
        <CardTitle>About & Footer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input label="About Heading" value={form.about_heading ?? ''} onChange={(e) => setForm({ ...form, about_heading: e.target.value })} />
          <div className="w-full">
            <label className="mb-1 block text-sm font-medium text-slate-700">About Description</label>
            <textarea
              rows={4}
              value={form.about_description ?? ''}
              onChange={(e) => setForm({ ...form, about_description: e.target.value })}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <Input label="About Image URL" value={form.about_image ?? ''} onChange={(e) => setForm({ ...form, about_image: e.target.value })} />
          <Input label="Mission" value={form.mission ?? ''} onChange={(e) => setForm({ ...form, mission: e.target.value })} />
          <Input label="Vision" value={form.vision ?? ''} onChange={(e) => setForm({ ...form, vision: e.target.value })} />
          <div className="w-full">
            <label className="mb-1 block text-sm font-medium text-slate-700">Highlights</label>
            <textarea
              rows={3}
              value={form.highlights ?? ''}
              onChange={(e) => setForm({ ...form, highlights: e.target.value })}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="w-full">
            <label className="mb-1 block text-sm font-medium text-slate-700">Footer Text</label>
            <textarea
              rows={2}
              value={form.footer_text ?? ''}
              onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end">
            <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Save Changes</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
