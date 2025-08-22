import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import config from './config';
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
import volunteerMasterRolesRoutes from './routes/volunteerMasterRoles';
import authRoutes from './routes/auth';
import rolesRoutes from './routes/roles';
import donorsRoutes from './routes/donors';
import { initializeSlots } from './data';
import logger from './utils/logger';

const app = express();

// ⭐ Add CORS middleware before routes
// Origins are parsed from FRONTEND_ORIGIN env variable as a comma-separated list.
app.use(cors({
  origin: config.frontendOrigins,
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
app.use('/volunteer-master-roles', volunteerMasterRolesRoutes);
app.use('/volunteers', volunteersRoutes);
app.use('/volunteer-bookings', volunteerBookingsRoutes);
app.use('/auth', authRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/donors', donorsRoutes);

// Global error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal Server Error' });
});

export default app;
