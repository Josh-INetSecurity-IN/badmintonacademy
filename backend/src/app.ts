import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { authLimiter, apiLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import studentRoutes from './routes/students';
import coachingBatchRoutes from './routes/coachingBatches';
import coachRoutes from './routes/coaches';
import regularPlayerRoutes from './routes/regularPlayers';
import regularBatchRoutes from './routes/regularBatches';
import courtRoutes from './routes/courts';
import guestBookingRoutes from './routes/guestBookings';
import paymentRoutes from './routes/payments';
import feeRoutes from './routes/fees';
import subscriptionRoutes from './routes/subscriptions';
import attendanceRoutes from './routes/attendance';
import productRoutes from './routes/products';
import saleRoutes from './routes/sales';
import expenseRoutes from './routes/expenses';
import tournamentRoutes from './routes/tournaments';
import notificationRoutes from './routes/notifications';
import reportRoutes from './routes/reports';
import settingsRoutes from './routes/settings';
import websiteContentRoutes from './routes/websiteContent';
import userRoutes from './routes/users';
import publicRoutes from './routes/public';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/coaching-batches', coachingBatchRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/regular-players', regularPlayerRoutes);
app.use('/api/regular-batches', regularBatchRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/guest-bookings', guestBookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/website-content', websiteContentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/public', publicRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

export default app;
