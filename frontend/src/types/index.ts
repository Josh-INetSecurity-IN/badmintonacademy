export interface ApiUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string | null;
}

export interface LoginResponse {
  token: string;
  user: ApiUser;
}

export interface PageParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: unknown;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface Student {
  id: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  medicalNotes?: string | null;
  photo?: string | null;
  joiningDate: string;
  skillLevel: string;
  coachingProgram?: string | null;
  monthlyFee: string;
  admissionFee: string;
  discount: string;
  feeDueDay?: number | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  batchStudents?: BatchStudent[];
  [key: string]: unknown;
}

export interface BatchStudent {
  id: number;
  batchId: number;
  studentId: number;
  status: string;
  joiningDate: string;
  batch?: {
    id: number;
    name: string;
    daysOfWeek: string;
    startTime: string;
    endTime: string;
    coach?: { firstName: string; lastName: string } | null;
  };
}

export interface CoachingBatch {
  id: number;
  name: string;
  programType: string;
  skillLevel: string;
  ageGroup?: string | null;
  coachId?: number | null;
  courtId?: number | null;
  maxCapacity: number;
  daysOfWeek: string[] | string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate?: string | null;
  monthlyFee: string;
  registrationFee: string;
  description?: string | null;
  color: string;
  status: string;
  coach?: { id: number; firstName: string; lastName: string } | null;
  court?: { id: number; name: string } | null;
  _count?: { students: number };
  students?: (BatchStudent & { student: Student })[];
}

export interface RegularPlayer {
  id: number;
  playerId: string;
  firstName: string;
  lastName: string;
  phone: string;
  whatsappNumber?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  joiningDate: string;
  monthlyFee: string;
  securityDeposit: string;
  paymentFrequency: string;
  subscriptionStart?: string | null;
  subscriptionEnd?: string | null;
  nextPaymentDue?: string | null;
  photo?: string | null;
  status: string;
  notes?: string | null;
  assignments?: RegularPlayerAssignment[];
  [key: string]: unknown;
}

export interface RegularPlayerAssignment {
  id: number;
  playerId: number;
  batchId: number;
  status: string;
  batch?: RegularBatch;
}

export interface RegularBatch {
  id: number;
  name: string;
  courtId?: number | null;
  daysOfWeek: string[] | string;
  startTime: string;
  endTime: string;
  maxPlayers: number;
  monthlyPrice: string;
  startDate: string;
  status: string;
  notes?: string | null;
  court?: { id: number; name: string } | null;
  _count?: { players: number };
  players?: (RegularPlayerAssignment & { player: RegularPlayer })[];
}

export interface Court {
  id: number;
  name: string;
  courtType: string;
  surfaceType?: string | null;
  location?: string | null;
  hourlyRate: string;
  status: string;
  notes?: string | null;
}

export interface GuestBooking {
  id: number;
  bookingNumber: string;
  name: string;
  phone: string;
  whatsappNumber?: string | null;
  email?: string | null;
  visitDate: string;
  courtId: number;
  startTime: string;
  endTime: string;
  numberOfPlayers: number;
  amount: string;
  paymentMethod: string;
  paymentStatus: string;
  bookingStatus: string;
  notes?: string | null;
  court?: Court;
}

export interface FeeInvoice {
  id: number;
  invoiceNumber: string;
  studentId?: number | null;
  regularPlayerId?: number | null;
  billingMonth: string;
  amount: string;
  discount: string;
  tax: string;
  totalAmount: string;
  paidAmount: string;
  dueDate: string;
  status: string;
  notes?: string | null;
  student?: { id: number; firstName: string; lastName: string; phone?: string | null } | null;
  regularPlayer?: { id: number; firstName: string; lastName: string; phone?: string | null } | null;
}

export interface Payment {
  id: number;
  receiptNumber: string;
  studentId?: number | null;
  regularPlayerId?: number | null;
  feeInvoiceId?: number | null;
  category: string;
  description?: string | null;
  amount: string;
  discount: string;
  tax: string;
  finalAmount: string;
  paymentDate: string;
  dueDate?: string | null;
  paymentMethod: string;
  transactionRef?: string | null;
  status: string;
  notes?: string | null;
  student?: { id: number; firstName: string; lastName: string } | null;
  regularPlayer?: { id: number; firstName: string; lastName: string } | null;
}

export interface Subscription {
  id: number;
  studentId?: number | null;
  regularPlayerId?: number | null;
  type: string;
  startDate: string;
  endDate: string;
  amount: string;
  discount: string;
  billingCycle: string;
  paymentStatus: string;
  notes?: string | null;
  student?: { id: number; firstName: string; lastName: string } | null;
  regularPlayer?: { id: number; firstName: string; lastName: string } | null;
}

export interface AttendanceRecord {
  id: number;
  date: string;
  studentId?: number | null;
  regularPlayerId?: number | null;
  batchId?: number | null;
  status: string;
  notes?: string | null;
  student?: { id: number; firstName: string; lastName: string } | null;
  regularPlayer?: { id: number; firstName: string; lastName: string } | null;
}

export interface Product {
  id: number;
  name: string;
  sku?: string | null;
  category?: string | null;
  brand?: string | null;
  description?: string | null;
  image?: string | null;
  purchasePrice: string;
  sellingPrice: string;
  stockQuantity: number;
  lowStockThreshold: number;
  supplier?: string | null;
  status: string;
}

export interface Sale {
  id: number;
  invoiceNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  studentId?: number | null;
  regularPlayerId?: number | null;
  totalAmount: string;
  discount: string;
  finalAmount: string;
  paymentMethod: string;
  paymentStatus: string;
  saleDate: string;
  notes?: string | null;
  items?: SaleItem[];
}

export interface SaleItem {
  id: number;
  saleId: number;
  productId: number;
  quantity: number;
  unitPrice: string;
  total: string;
  product?: Product;
}

export interface Expense {
  id: number;
  category: string;
  description: string;
  amount: string;
  date: string;
  paymentMethod: string;
  vendor?: string | null;
  receipt?: string | null;
  notes?: string | null;
}

export interface Tournament {
  id: number;
  name: string;
  poster?: string | null;
  description?: string | null;
  startDate: string;
  endDate: string;
  registrationDeadline?: string | null;
  venue?: string | null;
  categories: string;
  entryFee: string;
  prizeDetails?: string | null;
  rules?: string | null;
  contactDetails?: string | null;
  registrationUrl?: string | null;
  status: string;
  isFeatured: boolean;
  _count?: { registrations: number };
  registrations?: TournamentRegistration[];
}

export interface TournamentRegistration {
  id: number;
  tournamentId: number;
  participantName: string;
  phone: string;
  email?: string | null;
  category: string;
  teamName?: string | null;
  partnerName?: string | null;
  amount: string;
  paymentStatus: string;
  notes?: string | null;
}

export interface Notification {
  id: number;
  userId?: number | null;
  type: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface Enquiry {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  subject?: string | null;
  message: string;
  source: string;
  status: string;
  notes?: string | null;
  createdAt: string;
}