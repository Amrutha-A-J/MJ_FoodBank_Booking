import express from 'express';
import cors from 'cors'; // add this
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
import volunteerSlotsRoutes from './routes/volunteerSlots';
import { initializeSlots } from './data';
import pool from './db';

dotenv.config();

const app = express();

// ⭐ Add CORS middleware before routes
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173', // allow your frontend
  credentials: true
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
app.use('/volunteer-slots', volunteerSlotsRoutes);

const PORT = 4000;

async function init() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to the database successfully!');
    client.release();

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to the database:', err);
    process.exit(1);
  }
}

init();
