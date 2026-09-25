import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import {
  ToolType,
  WhiteboardEvent,
  FabricObjectData,
  CursorPayload,
  ObjectCreatePayload,
  ObjectUpdatePayload,
  ObjectDeletePayload,
} from '@meetdraw/shared';
import {
  generateObjectId,
  serializeFabricObject,
  deserializeFabricObject,
} from '../utils/fabric-helpers';
import { peerManager } from '../services/webrtc.service';
import { createLogger } from '../utils/logger';

const log = createLogger('useWhiteboard');

export interface WhiteboardOptions {
  canvasElementId: string;
  userId: string;
  username: string;
  userColor?: string;
  onSnapshotChange?: (json: string) => void;
}

const STICKY_COLORS = ['#fef08a', '#bae6fd', '#bbf7d0', '#fbcfe8']; // Yellow, Blue, Green, Pink

export function useWhiteboard(options: WhiteboardOptions) {
  const { canvasElementId, userId, username, userColor = '#4f46e5' } = options;

  const canvasRef = useRef<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [strokeColor, setStrokeColor] = useState<string>('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [fillColor, setFillColor] = useState<string>('transparent');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Undo / Redo history stacks
  const undoStack = useRef<WhiteboardEvent[]>([]);
  const redoStack = useRef<WhiteboardEvent[]>([]);

  // Remote cursors: userId -> { x, y, username, color }
  const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorPayload>>(new Map());

  // Flag to avoid broadcasting incoming remote changes back to peers
  const isApplyingRemoteRef = useRef<boolean>(false);

  // Drawing state for shapes and panning
  const isDrawingShape = useRef(false);
  const isPanning = useRef(false);
  const lastPanPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const shapeOrigin = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeShape = useRef<fabric.Object | null>(null);

  // 1. Initialize Fabric Canvas
  useEffect(() => {
    const el = document.getElementById(canvasElementId) as HTMLCanvasElement;
    if (!el) return;

    const parent = el.parentElement;
    const width = parent ? parent.clientWidth : 1400;
    const height = parent ? parent.clientHeight : 900;

    const canvas = new fabric.Canvas(canvasElementId, {
      width,
      height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    canvasRef.current = canvas;

    // Window resize handler
    const handleResize = () => {
      if (!canvasRef.current || !parent) return;
      canvasRef.current.setWidth(parent.clientWidth);
      canvasRef.current.setHeight(parent.clientHeight);
      canvasRef.current.renderAll();
    };
    window.addEventListener('resize', handleResize);

    // Mouse wheel zoom
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 5) zoom = 5;
      if (zoom < 0.2) zoom = 0.2;
      canvas.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), zoom);
      setZoomLevel(Math.round(zoom * 100));
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    bindCanvasEvents(canvas);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
      canvasRef.current = null;
    };
  }, [canvasElementId]);

  // Update Drawing Mode & Brush Properties
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (activeTool === 'pen') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
    } else if (activeTool === 'highlighter') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      // semi-transparent RGBA color
      canvas.freeDrawingBrush.color = strokeColor.startsWith('#')
        ? strokeColor + '55' // ~33% opacity
        : strokeColor;
      canvas.freeDrawingBrush.width = Math.max(strokeWidth * 4, 16);
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
    } else if (activeTool === 'pan') {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = 'grab';
    } else {
      canvas.isDrawingMode = false;
      canvas.selection = activeTool === 'select';
      canvas.defaultCursor = activeTool === 'select' ? 'default' : 'crosshair';
    }
  }, [activeTool, strokeColor, strokeWidth]);

  // 2. Bind Canvas Events (Mouse & Objects)
  const bindCanvasEvents = (canvas: fabric.Canvas) => {
    // When freehand path created
    canvas.on('path:created', (e: any) => {
      if (isApplyingRemoteRef.current) return;
      const path = e.path as fabric.Object;
      path.id = generateObjectId('path');
      const payload: ObjectCreatePayload = { object: serializeFabricObject(path) };

      const event: WhiteboardEvent<ObjectCreatePayload> = {
        id: generateObjectId('evt'),
        type: 'CREATE',
        userId,
        timestamp: Date.now(),
        payload,
      };

      undoStack.current.push(event);
      redoStack.current = [];
      setCanUndo(true);
      setCanRedo(false);

      peerManager.broadcastWhiteboardEvent(event);
    });

    // Object modified
    canvas.on('object:modified', (e) => {
      if (isApplyingRemoteRef.current) return;
      const target = e.target;
      if (!target || !target.id) return;

      const payload: ObjectUpdatePayload = {
        id: target.id,
        changes: serializeFabricObject(target),
      };

      const event: WhiteboardEvent<ObjectUpdatePayload> = {
        id: generateObjectId('evt'),
        type: 'UPDATE',
        userId,
        timestamp: Date.now(),
        payload,
      };

      undoStack.current.push(event);
      redoStack.current = [];
      setCanUndo(true);
      setCanRedo(false);

      peerManager.broadcastWhiteboardEvent(event);
    });

    // Mouse Down
    canvas.on('mouse:down', (o) => {
      const evt = o.e as MouseEvent;

      // Pan Tool handling
      if (activeTool === 'pan' || evt.button === 1) {
        isPanning.current = true;
        canvas.defaultCursor = 'grabbing';
        lastPanPos.current = { x: evt.clientX, y: evt.clientY };
        return;
      }

      if (canvas.isDrawingMode) return;
      const pointer = canvas.getPointer(o.e);

      // Sticky Note Creation
      if (activeTool === 'sticky') {
        const randomBg = STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
        const stickyRect = new fabric.Rect({
          width: 160,
          height: 160,
          fill: randomBg,
          rx: 8,
          ry: 8,
          shadow: new fabric.Shadow({
            color: 'rgba(0,0,0,0.3)',
            blur: 15,
            offsetX: 4,
            offsetY: 8,
          }),
        });

        const stickyText = new fabric.IText('New Idea / Task\n(Double click to edit)', {
          fontSize: 14,
          fill: '#1e293b',
          fontFamily: 'Plus Jakarta Sans',
          left: 12,
          top: 14,
          width: 136,
        });

        const stickyGroup = new fabric.Group([stickyRect, stickyText], {
          left: pointer.x - 80,
          top: pointer.y - 80,
          subTargetCheck: true,
        });

        stickyGroup.id = generateObjectId('sticky');
        canvas.add(stickyGroup);
        canvas.setActiveObject(stickyGroup);
        canvas.renderAll();

        const payload: ObjectCreatePayload = { object: serializeFabricObject(stickyGroup) };
        const event: WhiteboardEvent<ObjectCreatePayload> = {
          id: generateObjectId('evt'),
          type: 'CREATE',
          userId,
          timestamp: Date.now(),
          payload,
        };

        undoStack.current.push(event);
        peerManager.broadcastWhiteboardEvent(event);
        setActiveTool('select');
        return;
      }

      // Rectangle
      if (activeTool === 'rect') {
        isDrawingShape.current = true;
        shapeOrigin.current = { x: pointer.x, y: pointer.y };
        const rect = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth,
          rx: 6,
          ry: 6,
          selectable: false,
        });
        rect.id = generateObjectId('rect');
        activeShape.current = rect;
        canvas.add(rect);
      } else if (activeTool === 'circle') {
        isDrawingShape.current = true;
        shapeOrigin.current = { x: pointer.x, y: pointer.y };
        const circle = new fabric.Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 0,
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth,
          selectable: false,
        });
        circle.id = generateObjectId('circle');
        activeShape.current = circle;
        canvas.add(circle);
      } else if (activeTool === 'line') {
        isDrawingShape.current = true;
        shapeOrigin.current = { x: pointer.x, y: pointer.y };
        const line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: strokeColor,
          strokeWidth,
          selectable: false,
        });
        line.id = generateObjectId('line');
        activeShape.current = line;
        canvas.add(line);
      } else if (activeTool === 'text') {
        const text = new fabric.IText('Add Text', {
          left: pointer.x,
          top: pointer.y,
          fill: strokeColor,
          fontSize: 22,
          fontFamily: 'Plus Jakarta Sans',
        });
        text.id = generateObjectId('text');
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();

        const payload: ObjectCreatePayload = { object: serializeFabricObject(text) };
        const event: WhiteboardEvent<ObjectCreatePayload> = {
          id: generateObjectId('evt'),
          type: 'CREATE',
          userId,
          timestamp: Date.now(),
          payload,
        };
        undoStack.current.push(event);
        peerManager.broadcastWhiteboardEvent(event);
        setActiveTool('select');
      } else if (activeTool === 'eraser') {
        if (o.target) {
          const targetId = o.target.id;
          canvas.remove(o.target);
          canvas.renderAll();

          if (targetId) {
            const payload: ObjectDeletePayload = { ids: [targetId] };
            const event: WhiteboardEvent<ObjectDeletePayload> = {
              id: generateObjectId('evt'),
              type: 'DELETE',
              userId,
              timestamp: Date.now(),
              payload,
            };
            undoStack.current.push(event);
            peerManager.broadcastWhiteboardEvent(event);
          }
        }
      }
    });

    // Mouse Move
    canvas.on('mouse:move', (o) => {
      const evt = o.e as MouseEvent;

      // Panning active
      if (isPanning.current) {
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += evt.clientX - lastPanPos.current.x;
          vpt[5] += evt.clientY - lastPanPos.current.y;
          canvas.requestRenderAll();
        }
        lastPanPos.current = { x: evt.clientX, y: evt.clientY };
        return;
      }

      const pointer = canvas.getPointer(o.e);

      // Broadcast cursor coordinates
      const cursorPayload: CursorPayload = {
        x: pointer.x,
        y: pointer.y,
        userId,
        username,
        color: userColor,
      };
      peerManager.broadcastCursor({
        id: generateObjectId('cursor'),
        type: 'CURSOR',
        userId,
        timestamp: Date.now(),
        payload: cursorPayload,
      });

      if (!isDrawingShape.current || !activeShape.current) return;
      const origin = shapeOrigin.current;

      if (activeTool === 'rect') {
        const rect = activeShape.current as fabric.Rect;
        const width = Math.abs(pointer.x - origin.x);
        const height = Math.abs(pointer.y - origin.y);
        rect.set({
          left: Math.min(origin.x, pointer.x),
          top: Math.min(origin.y, pointer.y),
          width,
          height,
        });
        canvas.renderAll();
      } else if (activeTool === 'circle') {
        const circle = activeShape.current as fabric.Circle;
        const radius = Math.sqrt(Math.pow(pointer.x - origin.x, 2) + Math.pow(pointer.y - origin.y, 2)) / 2;
        circle.set({
          left: Math.min(origin.x, pointer.x),
          top: Math.min(origin.y, pointer.y),
          radius,
        });
        canvas.renderAll();
      } else if (activeTool === 'line') {
        const line = activeShape.current as fabric.Line;
        line.set({ x2: pointer.x, y2: pointer.y });
        canvas.renderAll();
      }
    });

    // Mouse Up
    canvas.on('mouse:up', () => {
      if (isPanning.current) {
        isPanning.current = false;
        canvas.defaultCursor = activeTool === 'pan' ? 'grab' : 'default';
      }

      if (isDrawingShape.current && activeShape.current) {
        const shape = activeShape.current;
        shape.set({ selectable: true });
        shape.setCoords();
        canvas.renderAll();

        const payload: ObjectCreatePayload = { object: serializeFabricObject(shape) };
        const event: WhiteboardEvent<ObjectCreatePayload> = {
          id: generateObjectId('evt'),
          type: 'CREATE',
          userId,
          timestamp: Date.now(),
          payload,
        };

        undoStack.current.push(event);
        redoStack.current = [];
        setCanUndo(true);
        setCanRedo(false);

        peerManager.broadcastWhiteboardEvent(event);

        isDrawingShape.current = false;
        activeShape.current = null;
      }
    });
  };

  // Zoom Helpers
  const zoomIn = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let zoom = canvas.getZoom() * 1.2;
    if (zoom > 5) zoom = 5;
    canvas.setZoom(zoom);
    setZoomLevel(Math.round(zoom * 100));
    canvas.renderAll();
  }, []);

  const zoomOut = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let zoom = canvas.getZoom() / 1.2;
    if (zoom < 0.2) zoom = 0.2;
    canvas.setZoom(zoom);
    setZoomLevel(Math.round(zoom * 100));
    canvas.renderAll();
  }, []);

  const resetZoom = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setZoom(1);
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    setZoomLevel(100);
    canvas.renderAll();
  }, []);

  // 3. Apply Incoming Remote Whiteboard Event
  const applyRemoteEvent = useCallback(async (event: WhiteboardEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (event.type === 'CURSOR') {
      const cursor = event.payload as CursorPayload;
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.set(cursor.userId, cursor);
        return next;
      });
      return;
    }

    isApplyingRemoteRef.current = true;
    try {
      switch (event.type) {
        case 'CREATE': {
          const { object } = event.payload as ObjectCreatePayload;
          const existing = canvas.getObjects().find((o) => o.id === object.id);
          if (!existing) {
            const fabricObj = await deserializeFabricObject(object);
            if (fabricObj) {
              canvas.add(fabricObj);
              canvas.renderAll();
            }
          }
          break;
        }
        case 'UPDATE': {
          const { id, changes } = event.payload as ObjectUpdatePayload;
          const target = canvas.getObjects().find((o) => o.id === id);
          if (target) {
            target.set(changes as any);
            target.setCoords();
            canvas.renderAll();
          }
          break;
        }
        case 'DELETE': {
          const { ids } = event.payload as ObjectDeletePayload;
          const toRemove = canvas.getObjects().filter((o) => o.id && ids.includes(o.id));
          toRemove.forEach((o) => canvas.remove(o));
          canvas.renderAll();
          break;
        }
        case 'CLEAR': {
          canvas.clear();
          canvas.backgroundColor = '#ffffff';
          canvas.renderAll();
          break;
        }
        default:
          break;
      }
    } finally {
      isApplyingRemoteRef.current = false;
    }
  }, []);

  // Undo & Redo
  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || undoStack.current.length === 0) return;

    const event = undoStack.current.pop();
    if (!event) return;

    redoStack.current.push(event);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);

    if (event.type === 'CREATE') {
      const { object } = event.payload as ObjectCreatePayload;
      const target = canvas.getObjects().find((o) => o.id === object.id);
      if (target) {
        canvas.remove(target);
        canvas.renderAll();
        peerManager.broadcastWhiteboardEvent({
          id: generateObjectId('evt'),
          type: 'DELETE',
          userId,
          timestamp: Date.now(),
          payload: { ids: [object.id] },
        });
      }
    }
  }, [userId]);

  const redo = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || redoStack.current.length === 0) return;

    const event = redoStack.current.pop();
    if (!event) return;

    undoStack.current.push(event);
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);

    if (event.type === 'CREATE') {
      const { object } = event.payload as ObjectCreatePayload;
      const fabricObj = await deserializeFabricObject(object);
      if (fabricObj) {
        canvas.add(fabricObj);
        canvas.renderAll();
        peerManager.broadcastWhiteboardEvent(event);
      }
    }
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();

    const event: WhiteboardEvent = {
      id: generateObjectId('evt'),
      type: 'CLEAR',
      userId,
      timestamp: Date.now(),
      payload: {},
    };

    undoStack.current.push(event);
    setCanUndo(true);
    peerManager.broadcastWhiteboardEvent(event);
  }, [userId]);

  const deleteSelected = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    const ids: string[] = [];
    activeObjects.forEach((obj) => {
      if (obj.id) ids.push(obj.id);
      canvas.remove(obj);
    });
    canvas.discardActiveObject();
    canvas.renderAll();

    if (ids.length > 0) {
      const event: WhiteboardEvent<ObjectDeletePayload> = {
        id: generateObjectId('evt'),
        type: 'DELETE',
        userId,
        timestamp: Date.now(),
        payload: { ids },
      };
      undoStack.current.push(event);
      setCanUndo(true);
      peerManager.broadcastWhiteboardEvent(event);
    }
  }, [userId]);

  const getCanvasData = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas ? JSON.stringify(canvas.toJSON(['id'])) : '';
  }, []);

  const loadCanvasData = useCallback((jsonData: string) => {
    const canvas = canvasRef.current;
    if (!canvas || !jsonData) return;
    canvas.loadFromJSON(jsonData, () => {
      canvas.renderAll();
    });
  }, []);

  return {
    canvasRef,
    activeTool,
    setActiveTool,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    fillColor,
    setFillColor,
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    undo,
    redo,
    clearCanvas,
    deleteSelected,
    canUndo,
    canRedo,
    applyRemoteEvent,
    remoteCursors,
    getCanvasData,
    loadCanvasData,
  };
}
