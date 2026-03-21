"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";

export function useCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const fabricCanvas = useRef<fabric.Canvas | null>(null);
  const rafRenderRef = useRef<number | null>(null);
  const historyTimerRef = useRef<number | null>(null);
  const isDrawingShape = useRef(false);
  const shapeOrigin = useRef({ x: 0, y: 0 });
  const activeShape = useRef<fabric.Object | null>(null);

  const activeTool = useAppStore((s) => s.activeTool);
  const strokeColor = useAppStore((s) => s.strokeColor);
  const strokeWidth = useAppStore((s) => s.strokeWidth);
  const pushHistory = useAppStore((s) => s.pushHistory);
  const historyIndex = useAppStore((s) => s.historyIndex);
  const canvasHistory = useAppStore((s) => s.canvasHistory);
  const clearHistory = useAppStore((s) => s.clearHistory);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Update undo/redo availability
  useEffect(() => {
    setCanUndo(historyIndex > 0);
    setCanRedo(historyIndex < canvasHistory.length - 1);
  }, [historyIndex, canvasHistory.length]);

  const scheduleRender = useCallback(() => {
    if (rafRenderRef.current !== null) return;
    rafRenderRef.current = window.requestAnimationFrame(() => {
      rafRenderRef.current = null;
      fabricCanvas.current?.requestRenderAll();
    });
  }, []);

  const saveState = useCallback(() => {
    if (!fabricCanvas.current) return;
    const json = JSON.stringify(fabricCanvas.current.toJSON());
    pushHistory(json);
  }, [pushHistory]);

  const queueSaveState = useCallback(() => {
    if (historyTimerRef.current) {
      window.clearTimeout(historyTimerRef.current);
    }
    historyTimerRef.current = window.setTimeout(() => {
      historyTimerRef.current = null;
      saveState();
    }, 180);
  }, [saveState]);

  // Initialize Fabric.js
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Dynamic import fabric
    const initCanvas = async () => {
      const fabricModule = await import("fabric");
      const fabric = fabricModule.fabric || fabricModule;

      if (fabricCanvas.current) {
        fabricCanvas.current.dispose();
      }

      const container = containerRef.current!;
      const rect = container.getBoundingClientRect();

      const canvas = new fabric.Canvas(canvasRef.current!, {
        width: rect.width,
        height: rect.height - 100, // Leave room for actions
        backgroundColor: "#FFFFFF",
        isDrawingMode: true,
        selection: false,
        renderOnAddRemove: false,
        enableRetinaScaling: false,
      });

      // Configure pen
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = strokeWidth;

      fabricCanvas.current = canvas;

      // Save initial state
      const json = JSON.stringify(canvas.toJSON());
      pushHistory(json);

      // Save state after drawing
      canvas.on("object:added", () => {
        if (!isDrawingShape.current) {
          queueSaveState();
        }
      });

      canvas.on("object:modified", () => {
        queueSaveState();
      });

      // Handle resize
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          canvas.setWidth(width);
          canvas.setHeight(height - 100);
          scheduleRender();
        }
      });

      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
        canvas.dispose();
      };
    };

    initCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update drawing mode based on active tool
  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    // Reset all modes
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.defaultCursor = "crosshair";
    canvas.hoverCursor = "crosshair";

    // Remove all event listeners for shape drawing
    canvas.off("mouse:down");
    canvas.off("mouse:move");
    canvas.off("mouse:up");

    if (activeTool === "pen") {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
      canvas.defaultCursor = "crosshair";
    } else if (activeTool === "eraser") {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = "#FFFFFF";
      canvas.freeDrawingBrush.width = strokeWidth * 3;
      canvas.defaultCursor = "cell";
    } else if (activeTool === "rect" || activeTool === "circle" || activeTool === "line") {
      setupShapeDrawing(canvas, activeTool, strokeColor, strokeWidth);
    } else if (activeTool === "text") {
      setupTextTool(canvas, strokeColor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, strokeColor, strokeWidth]);

  // Update brush settings
  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;
    if (canvas.isDrawingMode && activeTool === "pen") {
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
    } else if (canvas.isDrawingMode && activeTool === "eraser") {
      canvas.freeDrawingBrush.color = "#FFFFFF";
      canvas.freeDrawingBrush.width = strokeWidth * 3;
    }
  }, [strokeColor, strokeWidth, activeTool]);

  function setupShapeDrawing(
    canvas: fabric.Canvas,
    tool: "rect" | "circle" | "line",
    color: string,
    width: number
  ) {
    canvas.on("mouse:down", (opt: fabric.IEvent<MouseEvent>) => {
      const pointer = canvas.getPointer(opt.e);
      isDrawingShape.current = true;
      shapeOrigin.current = { x: pointer.x, y: pointer.y };

      // Dynamic import fabric for shape creation
      import("fabric").then((fabricModule) => {
        const fabric = fabricModule.fabric || fabricModule;

        let shape: fabric.Object;
        if (tool === "rect") {
          shape = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: "transparent",
            stroke: color,
            strokeWidth: width,
            selectable: false,
          });
        } else if (tool === "circle") {
          shape = new fabric.Ellipse({
            left: pointer.x,
            top: pointer.y,
            rx: 0,
            ry: 0,
            fill: "transparent",
            stroke: color,
            strokeWidth: width,
            selectable: false,
          });
        } else {
          shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: color,
            strokeWidth: width,
            selectable: false,
          });
        }

        canvas.add(shape);
        activeShape.current = shape;
        scheduleRender();
      });
    });

    canvas.on("mouse:move", (opt: fabric.IEvent<MouseEvent>) => {
      if (!isDrawingShape.current || !activeShape.current) return;
      const pointer = canvas.getPointer(opt.e);
      const shape = activeShape.current;

      if (tool === "rect") {
        const rect = shape as fabric.Rect;
        const w = pointer.x - shapeOrigin.current.x;
        const h = pointer.y - shapeOrigin.current.y;
        rect.set({
          left: w > 0 ? shapeOrigin.current.x : pointer.x,
          top: h > 0 ? shapeOrigin.current.y : pointer.y,
          width: Math.abs(w),
          height: Math.abs(h),
        });
      } else if (tool === "circle") {
        const ellipse = shape as fabric.Ellipse;
        const rx = Math.abs(pointer.x - shapeOrigin.current.x) / 2;
        const ry = Math.abs(pointer.y - shapeOrigin.current.y) / 2;
        ellipse.set({
          left: Math.min(pointer.x, shapeOrigin.current.x),
          top: Math.min(pointer.y, shapeOrigin.current.y),
          rx,
          ry,
        });
      } else if (tool === "line") {
        const line = shape as fabric.Line;
        line.set({ x2: pointer.x, y2: pointer.y });
      }

      scheduleRender();
    });

    canvas.on("mouse:up", () => {
      if (isDrawingShape.current) {
        isDrawingShape.current = false;
        activeShape.current = null;
        queueSaveState();
      }
    });
  }

  function setupTextTool(canvas: fabric.Canvas, color: string) {
    canvas.defaultCursor = "text";
    canvas.hoverCursor = "text";

    canvas.on("mouse:down", (opt: fabric.IEvent<MouseEvent>) => {
      const pointer = canvas.getPointer(opt.e);
      // Check if clicking on existing object
      const target = canvas.findTarget(opt.e, false);
      if (target) return;

      import("fabric").then((fabricModule) => {
        const fabric = fabricModule.fabric || fabricModule;
        const text = new fabric.IText("Type here", {
          left: pointer.x,
          top: pointer.y,
          fontSize: 16,
          fontFamily: "Plus Jakarta Sans",
          fill: color,
          selectable: true,
          editable: true,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        queueSaveState();
      });
    });
  }

  const handleUndo = useCallback(() => {
    const json = useAppStore.getState().undo();
    if (json && fabricCanvas.current) {
      fabricCanvas.current.loadFromJSON(JSON.parse(json), () => {
        scheduleRender();
      });
    }
  }, [scheduleRender]);

  const handleRedo = useCallback(() => {
    const json = useAppStore.getState().redo();
    if (json && fabricCanvas.current) {
      fabricCanvas.current.loadFromJSON(JSON.parse(json), () => {
        scheduleRender();
      });
    }
  }, [scheduleRender]);

  const handleClear = useCallback(() => {
    if (!fabricCanvas.current) return;
    fabricCanvas.current.clear();
    fabricCanvas.current.backgroundColor = "#FFFFFF";
    scheduleRender();
    clearHistory();
    queueSaveState();
  }, [clearHistory, queueSaveState, scheduleRender]);

  const handleExportPng = useCallback(() => {
    if (!fabricCanvas.current) return;
    const dataUrl = fabricCanvas.current.toDataURL({
      format: "png",
      multiplier: 2,
    });
    const link = document.createElement("a");
    link.download = "sketch.png";
    link.href = dataUrl;
    link.click();
  }, []);

  return {
    fabricCanvas,
    handleUndo,
    handleRedo,
    handleClear,
    handleExportPng,
    canUndo,
    canRedo,
  };
}
