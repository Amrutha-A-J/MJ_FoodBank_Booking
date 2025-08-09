import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRoutes from './routes/users';
import slotsRoutes from './routes/slots';
import bookingsRoutes from './routes/bookings';
import holidaysRoutes from './routes/holidays';
import blockedSlotsRoutes from './routes/blockedSlots';
import breaksRoutes from './routes/breaks';
import staffRoutes from './routes/staff';
import volunteerRolesRoutes from './routes/volunteerRoles';
import volunteersRoutes from './routes/volunteers';
import volunteerBookingsRoutes from './routes/volunteerBookings';
import { initializeSlots } from './data';
import pool from './db';
import { setupDatabase } from './setupDatabase';
import logger from './utils/logger';

dotenv.config();

const app = express();

// ⭐ Add CORS middleware before routes
// Allow a comma separated list of frontend origins so local hosts like
// "http://127.0.0.1:5173" work in addition to "http://localhost:5173".
const allowedOrigins = (process.env.FRONTEND_ORIGIN ||
  'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());

initializeSlots();

app.use('/users', usersRoutes);
app.use('/slots', slotsRoutes);
app.use('/bookings', bookingsRoutes);
app.use('/holidays', holidaysRoutes);
app.use('/blocked-slots', blockedSlotsRoutes);
app.use('/breaks', breaksRoutes);
app.use('/staff', staffRoutes);
app.use('/volunteer-roles', volunteerRolesRoutes);
app.use('/volunteers', volunteersRoutes);
app.use('/volunteer-bookings', volunteerBookingsRoutes);

const PORT = Number(process.env.PORT) || 4000;

async function init() {
  try {
    await setupDatabase();
    const client = await pool.connect();
    logger.info('✅ Connected to the database successfully!');
    client.release();

    app.listen(PORT, () => {
      logger.info(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error('❌ Failed to connect to the database:', err);
    process.exit(1);
  }
}

init();

// Global error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal Server Error' });
});
