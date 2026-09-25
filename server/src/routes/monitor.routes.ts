import { Router } from 'express';
import { MonitorController } from '../controllers/monitor.controller';

const router = Router();

// GET /monitor - Serve UI Dashboard directly from server
router.get('/', MonitorController.serveDashboard);

// API Endpoints (supporting /api/monitor/rooms and /monitor/api/rooms)
router.get('/rooms', MonitorController.getRooms);
router.get('/rooms/:roomId', MonitorController.getRoomSnapshot);
router.get('/api/rooms', MonitorController.getRooms);
router.get('/api/rooms/:roomId', MonitorController.getRoomSnapshot);

export default router;
