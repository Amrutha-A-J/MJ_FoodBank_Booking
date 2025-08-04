import express from 'express';
import cors from 'cors'; // add this
import usersRoutes from './routes/users';
import slotsRoutes from './routes/slots';
import bookingsRoutes from './routes/bookings';
import holidaysRoutes from './routes/holidays';
import { initializeSlots } from './data';

const app = express();

// ⭐ Add CORS middleware before routes
app.use(cors({
  origin: 'http://localhost:5173', // allow your frontend
  credentials: true
}));

app.use(express.json());

initializeSlots();

app.use('/users', usersRoutes);
app.use('/slots', slotsRoutes);
app.use('/bookings', bookingsRoutes);
app.use('/holidays', holidaysRoutes);


const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
