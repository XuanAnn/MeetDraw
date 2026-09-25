import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { roomMonitorStore } from '../monitor/room.monitor.store';

export class MonitorController {
  // 1. Serve Dashboard HTML
  static serveDashboard(req: Request, res: Response): void {
    // Try multiple possible locations for monitor.dashboard.html (dev vs compiled dist)
    const candidates = [
      path.join(__dirname, '../monitor/monitor.dashboard.html'),
      path.join(__dirname, '../../src/monitor/monitor.dashboard.html'),
      path.join(process.cwd(), 'src/monitor/monitor.dashboard.html'),
      path.join(process.cwd(), 'server/src/monitor/monitor.dashboard.html'),
    ];

    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.sendFile(filePath);
      }
    }

    res.status(500).send('<h3>Error: monitor.dashboard.html template not found on server</h3>');
  }

  // 2. Get list of all rooms overview
  static getRooms(req: Request, res: Response): void {
    try {
      const rooms = roomMonitorStore.getAllRoomsOverview();
      res.json(rooms);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get rooms' });
    }
  }

  // 3. Get full snapshot of a specific room
  static getRoomSnapshot(req: Request, res: Response): void {
    try {
      const roomId = (Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId) || '';
      if (!roomId) {
        res.status(400).json({ error: 'Missing roomId' });
        return;
      }

      const snapshot = roomMonitorStore.getRoomSnapshot(roomId);
      if (!snapshot) {
        res.status(404).json({ error: `Room ${roomId} not found in monitor` });
        return;
      }

      res.json(snapshot);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get room snapshot' });
    }
  }
}
