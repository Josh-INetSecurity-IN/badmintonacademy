import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Menu,
  X,
  ChevronRight,
  Check,
  ArrowRight,
  Star,
  MessageCircle,
  Instagram,
  Facebook,
  Youtube,
  Users,
  Award,
  Trophy,
  Target,
  Eye,
} from 'lucide-react';
import { getAcademyInfo, getPublicBatches, getPublicTournaments, getPublicGallery, submitEnquiry, type PublicBatch } from '@/services/public';
import { handleError } from '@/services/api';
import { formatINR, formatDate, buildWhatsAppLink } from '@/utils/format';

const NAV_LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About Us' },
  { id: 'coaching', label: 'Coaching' },
  { id: 'batches', label: 'Batches' },
  { id: 'regular-play', label: 'Regular Play' },
  { id: 'tournaments', label: 'Tournaments' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'contact', label: 'Contact' },
];

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function parseDays(raw: string[] | string | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquiryForm, setEnquiryForm] = useState({ name: '', phone: '', email: '', subject: '', message: '' });
  const [enquirySending, setEnquirySending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['public-academy'],
    queryFn: () => getAcademyInfo(),
  });
  const { data: batchesData } = useQuery({
    queryKey: ['public-batches'],
    queryFn: () => getPublicBatches(),
  });
  const { data: tournaments } = useQuery({
    queryKey: ['public-tournaments'],
    queryFn: () => getPublicTournaments(),
  });
  const { data: gallery } = useQuery({
    queryKey: ['public-gallery'],
    queryFn: () => getPublicGallery(),
  });

  const settings = (data?.settings as Record<string, string>) || {};
  const heroSlides = (data?.heroSlides as unknown[]) || [];
  const programs = (data?.programs as unknown[]) || [];
  const facilities = (data?.facilities as unknown[]) || [];
  const testimonials = (data?.testimonials as unknown[]) || [];
  const tournamentsList = (tournaments as unknown[]) || [];
  const galleryList = (gallery as unknown[]) || [];

  const academyName = settings.academy_name || 'Badminton Academy';
  const tagline = settings.tagline || 'Train Hard. Play Smart. Win Big.';
  const logo = settings.logo;
  const phone = settings.phone || '+91 98765 43210';
  const whatsapp = settings.whatsapp_number || settings.phone || '';
  const email = settings.email || '';
  const address = settings.address || '';
  const mapsEmbed = settings.maps_embed_url || '';
  const mapsLink = settings.maps_link;
  const openingHours = settings.opening_hours || 'Mon - Sun: 6:00 AM - 10:00 PM';
  const facebook = settings.facebook;
  const instagram = settings.instagram;
  const youtube = settings.youtube;
  const footerText = settings.footer_text || 'Your premier destination for professional badminton coaching.';

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % heroSlides.length), 6000);
    return () => clearInterval(t);
  }, [heroSlides.length]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setMobileOpen(false);
    }
  };

  const handleEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryForm.name || !enquiryForm.phone) {
      toast.error('Name and phone are required');
      return;
    }
    setEnquirySending(true);
    try {
      await submitEnquiry({ ...enquiryForm, source: 'website' });
      toast.success('Thank you! We will contact you soon.');
      setEnquiryOpen(false);
      setEnquiryForm({ name: '', phone: '', email: '', subject: '', message: '' });
    } catch (error) {
      toast.error(handleError(error));
    } finally {
      setEnquirySending(false);
    }
  };

  const coachingBatches = (batchesData?.coaching as PublicBatch[]) || [];
  const regularBatches = (batchesData?.regular as PublicBatch[]) || [];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <button onClick={() => scrollTo('home')} className="flex shrink-0 items-center gap-3">
              {logo ? (
                <img src={logo} alt={academyName} className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient font-display text-sm font-bold text-white shadow-glow-sm">
                  BA
                </div>
              )}
              <div className="text-left leading-tight">
                <div className="font-display text-base font-bold text-slate-900">{academyName}</div>
                <div className="hidden text-2xs font-medium text-slate-400 sm:block">{tagline}</div>
              </div>
            </button>

            <nav className="hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  {link.label}
                </button>
              ))}
              <div className="ml-3 flex items-center gap-2 border-l border-slate-200 pl-3">
                <button onClick={() => scrollTo('contact')} className="btn btn-outline h-9 px-4 text-sm">
                  Enquire
                </button>
                <button onClick={() => scrollTo('coaching')} className="btn btn-primary h-9 gap-1.5 px-4 text-sm">
                  Join Coaching
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </nav>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="animate-slide-down border-t border-slate-100 bg-white px-4 py-4 lg:hidden">
            <nav className="space-y-0.5">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  {link.label}
                </button>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => scrollTo('contact')} className="btn btn-outline w-full">
                  Enquire
                </button>
                <button onClick={() => scrollTo('coaching')} className="btn btn-primary w-full">
                  Join Coaching
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* HERO */}
      <section id="home" className="relative h-[88vh] min-h-[600px] overflow-hidden bg-slate-900">
        {heroSlides.length > 0 ? (
          <>
            {heroSlides.map((slide: any, i: number) => (
              <div
                key={i}
                className={`absolute inset-0 transition-opacity duration-1000 ease-smooth ${i === heroIndex ? 'opacity-100' : 'opacity-0'}`}
                aria-hidden={i !== heroIndex}
              >
                <div
                  className="absolute inset-0 scale-105 bg-cover"
                  style={{ backgroundImage: `url(${slide.image})`, backgroundPosition: '50% 20%' }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-900/20" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                <div className="relative z-10 flex h-full items-center">
                  <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="max-w-2xl">
                      {slide.title && (
                        <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                          {slide.title}
                        </h1>
                      )}
                      {slide.subtitle && (
                        <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80 sm:text-xl">
                          {slide.subtitle}
                        </p>
                      )}
                      <div className="mt-9 flex flex-wrap gap-3">
                        <button onClick={() => scrollTo('coaching')} className="btn btn-primary h-12 gap-2 px-6 text-base">
                          Join Our Academy <ArrowRight className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => scrollTo('batches')}
                          className="btn h-12 border border-white/25 bg-white/10 px-6 text-base text-white backdrop-blur transition-colors hover:bg-white/20"
                        >
                          Explore Batches
                        </button>
                        <button
                          onClick={() => scrollTo('contact')}
                          className="btn h-12 border border-transparent bg-white px-6 text-base text-slate-900 shadow-lg transition-colors hover:bg-slate-100"
                        >
                          Contact Us
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {heroSlides.length > 1 && (
              <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
                {heroSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroIndex(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === heroIndex}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === heroIndex ? 'w-9 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 bg-brand-gradient">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '64px 64px' }}
              aria-hidden="true"
            />
            <div className="pointer-events-none absolute -bottom-40 -right-20 h-[500px] w-[500px] rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-sport-400/20 blur-3xl" aria-hidden="true" />

            <div className="relative z-10 flex h-full items-center">
              <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/90 ring-1 ring-white/20 backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-sport-300" />
                    Admissions open
                  </span>
                  <h1 className="mt-6 font-display text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                    {academyName}
                  </h1>
                  <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80 sm:text-xl">
                    Professional badminton coaching for all ages and skill levels. Train with experienced
                    coaches in world-class indoor facilities.
                  </p>
                  <div className="mt-9 flex flex-wrap gap-3">
                    <button onClick={() => scrollTo('coaching')} className="btn h-12 gap-2 bg-white px-6 text-base text-primary-700 shadow-lg transition-colors hover:bg-slate-100">
                      Join Our Academy <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => scrollTo('contact')}
                      className="btn h-12 border border-white/25 bg-white/10 px-6 text-base text-white backdrop-blur transition-colors hover:bg-white/20"
                    >
                      Book a Court
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-0 left-1/2 z-10 hidden -translate-x-1/2 lg:block">
          <div className="h-12 w-px bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
            <div>
              <div className="relative">
                {settings.about_image ? (
                  <img
                    src={settings.about_image}
                    alt="About us"
                    className="h-[420px] w-full rounded-2xl object-cover shadow-xl"
                  />
                ) : (
                  <div className="flex h-[420px] w-full items-center justify-center rounded-2xl bg-brand-gradient shadow-xl">
                    <div className="text-center">
                      <Trophy className="mx-auto h-16 w-16 text-white/70" />
                      <div className="mt-4 font-display text-lg font-semibold text-white">{academyName}</div>
                    </div>
                  </div>
                )}
                <div className="absolute -bottom-6 left-6 flex items-center gap-4 rounded-2xl bg-white px-6 py-4 shadow-xl ring-1 ring-slate-100">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-subtle text-primary-600">
                    <Award className="h-6 w-6" />
                  </span>
                  <div>
                    <div className="font-display text-2xl font-bold leading-none text-slate-900">
                      {settings.years_experience || '10+'}
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-500">Years of Excellence</div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-subtle px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700 ring-1 ring-inset ring-primary-600/15">
                <Users className="h-3.5 w-3.5" /> About {academyName}
              </div>
              <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                {settings.about_heading || 'Shaping Champions Since Day One'}
              </h2>
              <p className="mt-5 leading-relaxed text-slate-600">
                {settings.about_description ||
                  'At our academy, we blend professional coaching with a passion for the sport. Our certified coaches work closely with every player to build technique, fitness, and a winning mindset.'}
              </p>
              <div className="mt-7 space-y-4">
                <div className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary-600">
                    <Target className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <div className="font-semibold text-slate-900">Our Mission</div>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-500">
                      {settings.mission || 'Nurture every player\'s potential through structured training and personalized attention.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sport-50 text-sport-600">
                    <Eye className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <div className="font-semibold text-slate-900">Our Vision</div>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-500">
                      {settings.vision || 'To be the region\'s leading badminton academy producing state and national level champions.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COACHING PROGRAMS */}
      <section id="coaching" className="bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-subtle px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700 ring-1 ring-inset ring-primary-600/15">
              <Target className="h-3.5 w-3.5" /> Coaching Programs
            </div>
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              Find the Right Program for You
            </h2>
            <p className="mt-4 text-slate-600">
              Structured coaching for every level — from first-time players to advanced competitors.
            </p>
          </div>

          <div className="stagger mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(programs as any[]).length > 0 ? (
              (programs as any[]).map((program, i) => (
                <div key={i} className="card card-hover group overflow-hidden">
                  <div className="overflow-hidden">
                    {program.image ? (
                      <img
                        src={program.image}
                        alt={program.title}
                        className="block h-auto w-full transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center bg-brand-gradient">
                        <Trophy className="h-12 w-12 text-white/70" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col p-6">
                    <h3 className="font-display text-lg font-semibold text-slate-900">{program.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500">{program.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {program.age_group && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          Age: {program.age_group}
                        </span>
                      )}
                      {program.skill_level && (
                        <span className="rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-medium capitalize text-primary-700">
                          {program.skill_level}
                        </span>
                      )}
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      {program.fee_display ? (
                        <span className="font-display text-base font-bold text-primary-600">{program.fee_display}</span>
                      ) : (
                        <span />
                      )}
                      <button
                        onClick={() => scrollTo('contact')}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700"
                      >
                        Enquire <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              [0, 1, 2].map((i) => (
                <div key={i} className="card overflow-hidden">
                  <div className="h-48 bg-slate-100" />
                  <div className="p-6">
                    <div className="skeleton mb-3 h-5 w-40" />
                    <div className="skeleton h-4 w-full" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* BATCHES */}
      <section id="batches" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4">
              <Clock className="h-4 w-4" /> Batch Timings
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">Our Training Batches</h2>
            <p className="mt-3 text-slate-600">Choose a schedule that fits your routine. Limited seats per batch.</p>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {coachingBatches.length > 0 ? (
              coachingBatches.map((batch, i) => (
                <div key={i} className="card border-l-4 p-6" style={{ borderLeftColor: batch.color || '#3b82f6' }}>
                  <div className="flex items-start justify-between">
                    <h3 className="font-display font-semibold text-lg text-slate-900">{batch.name}</h3>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                      Available
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      {parseDays(batch.daysOfWeek).join(', ')} · {batch.startTime}-{batch.endTime}
                    </div>
                    {batch.coach && batch.coach.name && (
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-slate-400" />
                        Coach: {batch.coach.name}
                      </div>
                    )}
                    {batch.court && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" /> {batch.court.name}
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      {batch.ageGroup && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-600">{batch.ageGroup}</span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-xs text-blue-700 capitalize">{batch.skillLevel}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{formatINR(Number(batch.monthlyFee ?? 0))}/mo</span>
                    <button onClick={() => scrollTo('contact')} className="btn btn-outline btn-sm">Enquire / Join</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="sm:col-span-2 lg:col-span-3 text-center text-slate-400 py-8">Batches will be listed here.</div>
            )}
          </div>
        </div>
      </section>

      {/* REGULAR PLAY */}
      <section id="regular-play" className="py-20 bg-blue-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-sm font-medium mb-4">
                <Users className="h-4 w-4" /> Regular Play & Membership
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight">
                Play Regularly. Improve Constantly.
              </h2>
              <p className="mt-4 text-blue-100/90">
                Join our regular play sessions to keep your game sharp. Book the same court, same time every
                week and play in a consistent group.
              </p>
              <div className="mt-6 space-y-3">
                {['Fixed weekly court slots', 'Consistent player groups', 'Priority court bookings', 'Flexible monthly membership', 'All skill levels welcome'].map((b, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-sport-500 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-blue-50">{b}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={() => scrollTo('contact')} className="btn bg-sport-500 text-white hover:bg-sport-600 px-6 py-3">
                  Register for Regular Play
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {regularBatches.length === 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-blue-100/70">
                  Regular play slots will be listed here
                </div>
              )}
              {(regularBatches as PublicBatch[]).map((batch, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-white">{batch.name}</div>
                    <div className="text-sm text-sport-400 font-medium">{formatINR(Number(batch.monthlyPrice ?? 0))}/mo</div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-blue-100/80">
                    <span>{parseDays(batch.daysOfWeek).join(', ')}</span>
                    <span>{batch.startTime} - {batch.endTime}</span>
                    {batch.court && <span><MapPin className="inline h-3.5 w-3.5 -mt-0.5" /> {batch.court.name}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FACILITIES */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4">
              <Award className="h-4 w-4" /> World-Class Facilities
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">Everything You Need to Excel</h2>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(facilities as any[]).length > 0 ? (
              (facilities as any[]).map((facility, i) => (
                <div key={i} className="card p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 mb-4">
                    {facility.icon ? (
                      <img src={facility.icon} alt="" className="h-7 w-7" />
                    ) : (
                      <Award className="h-7 w-7" />
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900">{facility.title}</h3>
                  {facility.description && (
                    <p className="mt-2 text-sm text-slate-500">{facility.description}</p>
                  )}
                </div>
              ))
            ) : (
              ['Professional Courts', 'Premium Lighting', 'Pro Shuttlecocks', 'Shoe & Racket Store'].map((f, i) => (
                <div key={i} className="card p-6 text-center">
                  <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 mb-4">
                    <Award className="h-7 w-7" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{f}</h3>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* TOURNAMENTS */}
      <section id="tournaments" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-medium mb-4">
              <Trophy className="h-4 w-4" /> Upcoming Tournaments
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">Put Your Skills to the Test</h2>
          </div>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(tournamentsList as any[]).length > 0 ? (
              (tournamentsList as any[]).map((tournament, i) => (
                <div key={i} className="card overflow-hidden flex flex-col">
                  {tournament.poster && (
                    <div className="h-44 overflow-hidden">
                      <img src={tournament.poster} alt={tournament.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col">
                    {tournament.isFeatured && (
                      <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium mb-2">
                        <Trophy className="h-3 w-3" /> Featured
                      </span>
                    )}
                    <h3 className="font-display font-semibold text-lg text-slate-900">{tournament.name}</h3>
                    <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                      </div>
                      {tournament.venue && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" /> {tournament.venue}
                        </div>
                      )}
                      {tournament.registrationDeadline && (
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-slate-400" />
                          Register by {formatDate(tournament.registrationDeadline)}
                        </div>
                      )}
                    </div>
                    {tournament.categories && tournament.categories.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(Array.isArray(tournament.categories)
                          ? tournament.categories
                          : JSON.parse(tournament.categories as string)
                        )
                          .slice(0, 4)
                          .map((cat: string, j: number) => (
                            <span key={j} className="px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-600">{cat}</span>
                          ))}
                      </div>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-semibold text-blue-600">
                        {tournament.entryFee && Number(tournament.entryFee) > 0 ? formatINR(Number(tournament.entryFee)) : 'Free'}
                      </span>
                      <button onClick={() => scrollTo('contact')} className="inline-flex items-center gap-1 text-sm text-blue-600 font-medium hover:underline">
                        Register <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="md:col-span-2 lg:col-span-3 text-center text-slate-400 py-8">
                No upcoming tournaments at the moment. Check back soon!
              </div>
            )}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">Inside Our Academy</h2>
          </div>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(galleryList as any[]).length > 0 ? (
              (galleryList as any[]).map((img, i) => (
                <div key={i} className="group relative rounded-xl overflow-hidden h-52">
                  <img src={img.image} alt={img.title || 'Gallery'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  {img.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-xs text-white">
                      {img.caption}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-4 text-center text-slate-400 py-8">Gallery coming soon</div>
            )}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      {testimonials.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">What Our Players Say</h2>
            </div>
            <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(testimonials as any[]).map((t, i) => (
                <div key={i} className="card p-6">
                  <div className="flex gap-1 text-amber-400 mb-3">
                    {Array.from({ length: t.rating || 5 }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-600">{t.testimonial}</p>
                  <div className="mt-4 flex items-center gap-3">
                    {t.photo ? (
                      <img src={t.photo} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                        {t.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-slate-900">{t.name}</div>
                      {t.role && <div className="text-xs text-slate-400">{t.role}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CONTACT */}
      <section id="contact" className="relative overflow-hidden bg-slate-950 py-20 text-white sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '64px 64px' }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary-600/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-sport-500/15 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/90 ring-1 ring-inset ring-white/15">
                <MessageCircle className="h-3.5 w-3.5" /> Contact
              </div>
              <h2 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Get in Touch
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-slate-400">
                Have a question about coaching, bookings or memberships? We&apos;d love to hear from you.
              </p>

              <ul className="mt-9 space-y-3">
                {[
                  { icon: Phone, label: 'Phone', value: phone, href: `tel:${(phone || '').replace(/\s+/g, '')}` },
                  { icon: Mail, label: 'Email', value: email, href: `mailto:${email}` },
                  { icon: MapPin, label: 'Address', value: address },
                  { icon: Clock, label: 'Opening Hours', value: openingHours },
                ].map(({ icon: Icon, label, value, href }) =>
                  value ? (
                    <li key={label} className="flex items-center gap-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-inset ring-white/10">
                        <Icon className="h-[18px] w-[18px] text-sport-400" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-2xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
                        {href ? (
                          <a href={href} className="text-sm text-white transition-colors hover:text-sport-400">
                            {value}
                          </a>
                        ) : (
                          <div className="text-sm text-white">{value}</div>
                        )}
                      </div>
                    </li>
                  ) : null,
                )}
              </ul>

              <div className="mt-8 flex flex-wrap items-center gap-2.5">
                {whatsapp && (
                  <a
                    href={buildWhatsAppLink(whatsapp, `Hello ${academyName}, I would like to know more!`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn h-10 gap-2 bg-sport-600 px-4 text-sm text-white shadow-sm transition-colors hover:bg-sport-700"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                )}
                {[
                  { href: facebook, Icon: Facebook, label: 'Facebook' },
                  { href: instagram, Icon: Instagram, label: 'Instagram' },
                  { href: youtube, Icon: Youtube, label: 'YouTube' },
                ].map(({ href, Icon, label }) =>
                  href ? (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-slate-300 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </a>
                  ) : null,
                )}
              </div>
            </div>

            <div className="card p-6 text-slate-900 sm:p-7">
              <h3 className="font-display text-lg font-semibold">Send an Enquiry</h3>
              <p className="mt-1 text-sm text-slate-500">We typically respond within one working day.</p>
              <form onSubmit={handleEnquiry} className="mt-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Your Name *</label>
                    <input
                      type="text"
                      className="input"
                      value={enquiryForm.name}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                      placeholder="Full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Phone *</label>
                    <input
                      type="tel"
                      className="input"
                      value={enquiryForm.phone}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                      placeholder="Your phone number"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={enquiryForm.email}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="label">Subject</label>
                  <input
                    type="text"
                    className="input"
                    value={enquiryForm.subject}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, subject: e.target.value })}
                    placeholder="Coaching / Court booking / Membership..."
                  />
                </div>
                <div>
                  <label className="label">Message</label>
                  <textarea
                    className="input min-h-[120px]"
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                    placeholder="Tell us how we can help"
                  />
                </div>
                <button type="submit" disabled={enquirySending} className="btn btn-primary h-11 w-full">
                  {enquirySending ? 'Sending…' : 'Submit Enquiry'}
                </button>
              </form>
            </div>
          </div>

          {mapsEmbed && (
            <div className="mt-12 h-80 overflow-hidden rounded-2xl border border-white/10">
              <iframe
                src={mapsEmbed}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Academy location"
              />
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-slate-950 text-slate-400">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3">
                {logo ? (
                  <img src={logo} alt={academyName} className="h-10 w-10 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient font-display text-sm font-bold text-white">
                    BA
                  </div>
                )}
                <div className="font-display text-base font-bold text-white">{academyName}</div>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">{footerText}</p>
              <div className="mt-5 flex gap-2">
                {facebook && (
                  <a
                    href={facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {instagram && (
                  <a
                    href={instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {youtube && (
                  <a
                    href={youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Youtube className="h-4 w-4" />
                  </a>
                )}
                {whatsapp && (
                  <a
                    href={buildWhatsAppLink(whatsapp, `Hello ${academyName}! I have a question.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-sport-500/15 text-sport-300 transition-colors hover:bg-sport-500/25"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            <div>
              <div className="mb-4 text-2xs font-semibold uppercase tracking-wider text-slate-500">Explore</div>
              <ul className="space-y-2.5 text-sm">
                {NAV_LINKS.map((link) => (
                  <li key={link.id}>
                    <button
                      onClick={() => scrollTo(link.id)}
                      className="text-slate-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-4 text-2xs font-semibold uppercase tracking-wider text-slate-500">Contact</div>
              <ul className="space-y-2.5 text-sm">
                {phone && (
                  <li>
                    <a href={`tel:${phone.replace(/\s+/g, '')}`} className="flex items-center gap-2.5 text-slate-400 transition-colors hover:text-white">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
                        <Phone className="h-3.5 w-3.5" />
                      </span>
                      {phone}
                    </a>
                  </li>
                )}
                {email && (
                  <li>
                    <a href={`mailto:${email}`} className="flex items-center gap-2.5 text-slate-400 transition-colors hover:text-white">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
                        <Mail className="h-3.5 w-3.5" />
                      </span>
                      {email}
                    </a>
                  </li>
                )}
                {openingHours && (
                  <li className="flex items-center gap-2.5 text-slate-400">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
                      <Clock className="h-3.5 w-3.5" />
                    </span>
                    {openingHours}
                  </li>
                )}
                {address && (
                  <li className="flex items-start gap-2.5 text-slate-400">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
                      <MapPin className="h-3.5 w-3.5" />
                    </span>
                    {address}
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs sm:flex-row">
            <p className="text-slate-500">
              © {new Date().getFullYear()} {academyName}. All rights reserved.
            </p>
            <div className="flex items-center gap-5">
              <button className="text-slate-500 transition-colors hover:text-slate-300">Privacy Policy</button>
              <button className="text-slate-500 transition-colors hover:text-slate-300">Terms &amp; Conditions</button>
            </div>
          </div>
        </div>
      </footer>

      {/* WHATSAPP FLOATING BUTTON */}
      {whatsapp && (
        <a
          href={buildWhatsAppLink(whatsapp, `Hello ${academyName}! I have a question.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-sport-600 text-white shadow-glow-sport transition-all duration-200 hover:bg-sport-700 hover:scale-105"
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle className="h-7 w-7" />
        </a>
      )}

      {/* Scroll hint */}
      {isLoading && (
        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
          <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}