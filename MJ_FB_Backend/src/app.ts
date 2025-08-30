import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import config from './config';
import usersRoutes from './routes/users';
import slotsRoutes from './routes/slots';
import bookingsRoutes from './routes/bookings';
import newClientsRoutes from './routes/newClients';
import holidaysRoutes from './routes/holidays';
import blockedSlotsRoutes from './routes/blockedSlots';
import breaksRoutes from './routes/breaks';
import recurringBlockedSlotsRoutes from './routes/recurringBlockedSlots';
import staffRoutes from './routes/admin/staff';
import adminStaffRoutes from './routes/admin/adminStaff';
import appConfigRoutes from './routes/admin/appConfig';
import warehouseSettingsRoutes from './routes/admin/warehouseSettings';
import volunteerRolesRoutes from './routes/volunteer/volunteerRoles';
import volunteersRoutes from './routes/volunteer/volunteers';
import volunteerBookingsRoutes from './routes/volunteer/volunteerBookings';
import volunteerMasterRolesRoutes from './routes/volunteer/volunteerMasterRoles';
import authRoutes from './routes/auth';
import rolesRoutes from './routes/roles';
import donorsRoutes from './routes/donors';
import donationsRoutes from './routes/warehouse/donations';
import clientVisitsRoutes from './routes/clientVisits';
import surplusRoutes from './routes/warehouse/surplus';
import pigPoundsRoutes from './routes/warehouse/pigPounds';
import outgoingReceiversRoutes from './routes/warehouse/outgoingReceivers';
import outgoingDonationsRoutes from './routes/warehouse/outgoingDonations';
import warehouseOverallRoutes from './routes/warehouse/warehouseOverall';
import eventsRoutes from './routes/events';
import agenciesRoutes from './routes/agencies';
import badgesRoutes from './routes/badges';
import statsRoutes from './routes/stats';
import volunteerStatsRoutes from './routes/volunteerStats';
import { initializeSlots } from './data';
import logger from './utils/logger';
import csrfMiddleware from './middleware/csrf';

const app = express();

// ⭐ Add CORS middleware before routes
// Origins are parsed from FRONTEND_ORIGIN env variable as a comma-separated list.
app.use(cors({
  origin: config.frontendOrigins,
  credentials: true,
}));

app.use(express.json());
app.use(csrfMiddleware);

initializeSlots();

app.use('/users', usersRoutes);
app.use('/agencies', agenciesRoutes);
app.use('/slots', slotsRoutes);
app.use('/bookings', bookingsRoutes);
app.use('/new-clients', newClientsRoutes);
app.use('/holidays', holidaysRoutes);
app.use('/blocked-slots', blockedSlotsRoutes);
app.use('/breaks', breaksRoutes);
app.use('/recurring-blocked-slots', recurringBlockedSlotsRoutes);
app.use('/staff', staffRoutes);
app.use('/admin-staff', adminStaffRoutes);
app.use('/app-config', appConfigRoutes);
app.use('/warehouse-settings', warehouseSettingsRoutes);
app.use('/volunteer-roles', volunteerRolesRoutes);
app.use('/volunteer-master-roles', volunteerMasterRolesRoutes);
app.use('/volunteers', volunteersRoutes);
app.use('/volunteer-bookings', volunteerBookingsRoutes);
app.use('/volunteer-stats', volunteerStatsRoutes);
app.use('/auth', authRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/donors', donorsRoutes);
app.use('/donations', donationsRoutes);
app.use('/client-visits', clientVisitsRoutes);
app.use('/surplus', surplusRoutes);
app.use('/pig-pounds', pigPoundsRoutes);
app.use('/outgoing-receivers', outgoingReceiversRoutes);
app.use('/outgoing-donations', outgoingDonationsRoutes);
app.use('/warehouse-overall', warehouseOverallRoutes);
app.use('/events', eventsRoutes);
app.use('/badges', badgesRoutes);
app.use('/stats', statsRoutes);

// Serve the frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(
    __dirname,
    '..',
    '..',
    'MJ_FB_Frontend',
    'dist'
  );
  app.use(express.static(frontendPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Internal Server Error' });
});

export default app;
