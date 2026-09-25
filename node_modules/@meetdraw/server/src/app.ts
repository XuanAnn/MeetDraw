import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import roomRoutes from './routes/room.routes';
import monitorRoutes from './routes/monitor.routes';
import { ENV } from './config/env';

export const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV,
  });
});

// REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Server-Hosted Room Monitor Dashboard & APIs
app.use('/monitor', monitorRoutes);
app.use('/api/monitor', monitorRoutes);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});
