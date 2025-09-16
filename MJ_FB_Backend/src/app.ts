import express, { Router, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import morgan from 'morgan';

import config from './config';
import { initializeSlots } from './data';
import csrfMiddleware from './middleware/csrf';
import errorHandler from './middleware/errorHandler';

// ---- Route modules ----
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
import volunteerStatsRoutes from './routes/volunteerStats';
import authRoutes from './routes/auth';
import rolesRoutes from './routes/roles';
import donorsRoutes from './routes/donors';
import donationsRoutes from './routes/warehouse/donations';
import monetaryDonorsRoutes from './routes/monetaryDonors';
import clientVisitsRoutes from './routes/clientVisits';
import surplusRoutes from './routes/warehouse/surplus';
import pigPoundsRoutes from './routes/warehouse/pigPounds';
import outgoingReceiversRoutes from './routes/warehouse/outgoingReceivers';
import outgoingDonationsRoutes from './routes/warehouse/outgoingDonations';
import warehouseOverallRoutes from './routes/warehouse/warehouseOverall';
import eventsRoutes from './routes/events';
import badgesRoutes from './routes/badges';
import statsRoutes from './routes/stats';
import timesheetsRoutes from './routes/timesheets';
import leaveRequestsRoutes from './routes/leaveRequests';
import sunshineBagsRoutes from './routes/sunshineBags';
import webauthnRoutes from './routes/webauthn';
import pantryAggregationsRoutes from './routes/pantry/aggregations';
import deliveryCategoriesRoutes from './routes/delivery/categories';
import deliveryOrdersRoutes from './routes/delivery/orders';
import maintenanceRoutes from './routes/maintenance';
import { optionalAuthMiddleware } from './middleware/authMiddleware';
import maintenanceGuard from './middleware/maintenanceGuard';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());

// CORS before routes (origins parsed from FRONTEND_ORIGIN env as comma-separated list)
app.use(
  cors({
    origin: config.frontendOrigins,
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  })
);

app.use(express.json());
app.use(csrfMiddleware);
app.use(morgan(':method :url :status :response-time ms'));

// Any app-level bootstrapping
initializeSlots();

// Serve generated ICS files
const icsPath = path.join(__dirname, '..', 'public', 'ics');
app.use('/ics', express.static(icsPath));

/* =========================================
 * API (everything under /api/v1)
 * ========================================= */
const api = Router();

// Health FIRST (JSON response so it won't be mistaken for SPA)
api.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

// Allow middleware to check maintenance mode and optional auth for all requests
api.use(optionalAuthMiddleware);
api.use(maintenanceGuard);

// Mount feature routers (all relative to /api/v1)
api.use('/users', usersRoutes);
api.use('/slots', slotsRoutes);
api.use('/bookings', bookingsRoutes);
api.use('/new-clients', newClientsRoutes);
api.use('/holidays', holidaysRoutes);
api.use('/blocked-slots', blockedSlotsRoutes);
api.use('/breaks', breaksRoutes);
api.use('/recurring-blocked-slots', recurringBlockedSlotsRoutes);
api.use('/staff', staffRoutes);
api.use('/admin-staff', adminStaffRoutes);
api.use('/app-config', appConfigRoutes);
api.use('/warehouse-settings', warehouseSettingsRoutes);
api.use('/volunteer-roles', volunteerRolesRoutes);
api.use('/volunteers', volunteersRoutes);
api.use('/volunteer-bookings', volunteerBookingsRoutes);
api.use('/volunteer-master-roles', volunteerMasterRolesRoutes);
api.use('/volunteer-stats', volunteerStatsRoutes);
api.use('/auth', authRoutes);
api.use('/webauthn', webauthnRoutes);
api.use('/roles', rolesRoutes);
api.use('/donors', donorsRoutes);
api.use('/monetary-donors', monetaryDonorsRoutes);
api.use('/donations', donationsRoutes);
api.use('/client-visits', clientVisitsRoutes);
// Redirect legacy /visits routes to /client-visits
api.use('/visits', (req, res) =>
  res.redirect(308, req.originalUrl.replace('/visits', '/client-visits'))
);
api.use('/surplus', surplusRoutes);
api.use('/pig-pounds', pigPoundsRoutes);
api.use('/outgoing-receivers', outgoingReceiversRoutes);
api.use('/outgoing-donations', outgoingDonationsRoutes);
api.use('/warehouse-overall', warehouseOverallRoutes);
api.use('/events', eventsRoutes);
api.use('/badges', badgesRoutes);
api.use('/stats', statsRoutes);
api.use('/timesheets', timesheetsRoutes);
api.use('/leave/requests', leaveRequestsRoutes);
api.use('/sunshine-bags', sunshineBagsRoutes);
api.use('/pantry-aggregations', pantryAggregationsRoutes);
api.use('/delivery/categories', deliveryCategoriesRoutes);
api.use('/delivery/orders', deliveryOrdersRoutes);
api.use('/maintenance', maintenanceRoutes);

// Redirect legacy /api requests to /api/v1
app.use('/api', (req, res, next) => {
  if (req.originalUrl.startsWith('/api/v1')) return next();
  const target = `/api/v1${req.url === '/' ? '' : req.url}`;
  res.redirect(308, target);
});

// Mount /api/v1
app.use('/api/v1', api);

/* =========================================
 * SPA (served only for non-/api paths)
 * ========================================= */
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '..', '..', 'MJ_FB_Frontend', 'dist');
  app.use(express.static(frontendPath));

  // Serve index.html for any non-file path that does NOT start with /api
  app.get(/^\/(?!api\/).*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Unknown routes (outside of SPA) → JSON 404
app.use((_req, res) => res.status(404).json({ message: 'Not found' }));

// Global error handler
app.use(errorHandler);

export default app;
