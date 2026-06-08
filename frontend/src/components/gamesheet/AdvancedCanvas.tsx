/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * Advanced Canvas Component using Konva.js - Accessibility Enhanced
 */

import React, { useRef, useState, useEffect } from 'react';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage as KonvaStage } from 'konva/lib/Stage';
import { Stage, Layer, Line, Circle, Rect, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import { SPORT_FIELDS, getSportFieldSvgDataUrl } from '@/utils/sportFields';
import { Pencil, Circle as CircleIcon, Square, Eraser, Undo2, Redo2, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccessibilityStore, strokeWidthValues } from '@/store/accessibilityStore';

interface CanvasShape {
    id: string;
    tool: 'pen' | 'circle' | 'rect';
    points?: number[];
    x?: number;
    y?: number;
    radius?: number;
    width?: number;
    height?: number;
    stroke: string;
    strokeWidth: number;
}

interface AdvancedCanvasProps {
    onExport: (dataUrl: string) => void;
    width?: number;
    height?: number;
}

const FieldBackground: React.FC<{ fieldId: string | null }> = ({ fieldId }) => {
    const field = SPORT_FIELDS.find(f => f.id === fieldId);
    const svgDataUrl = field ? getSportFieldSvgDataUrl(field.svg) : null;
    const [image] = useImage(svgDataUrl || '');

    if (!image) return null;

    return <KonvaImage image={image} width={800} height={500} listening={false} />;
};

export default function AdvancedCanvas({ onExport, width = 800, height = 500 }: AdvancedCanvasProps) {
    const stageRef = useRef<KonvaStage | null>(null);
    const [tool, setTool] = useState<'pen' | 'circle' | 'rect' | 'eraser'>('pen');
    const [color, setColor] = useState('#000000');
    const [shapes, setShapes] = useState<CanvasShape[]>([]);
    const [history, setHistory] = useState<CanvasShape[][]>([[]]);
    const [historyStep, setHistoryStep] = useState(0);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentShape, setCurrentShape] = useState<CanvasShape | null>(null);
    const [selectedField, setSelectedField] = useState<string | null>(null);

    // Accessibility store
    const { highVisibilityMode, highContrast, strokeWidth, toggleHighVisibilityMode, setStrokeWidth } = useAccessibilityStore();
    const currentStrokeWidth = strokeWidthValues[strokeWidth];

    // Colors - extended palette for accessibility
    const COLORS = highVisibilityMode
        ? ['#000000', '#FFFF00', '#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#FFFFFF']
        : ['#000000', '#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FFA500', '#FFFFFF'];

    // Size classes for high visibility mode
    const buttonSize = highVisibilityMode ? 'lg' : 'sm';
    const colorSize = highVisibilityMode ? 'w-14 h-14' : 'w-8 h-8';
    const iconSize = highVisibilityMode ? 'h-6 w-6' : 'h-4 w-4';

    useEffect(() => {
        if (onExport && stageRef.current) {
            const dataUrl = stageRef.current.toDataURL();
            onExport(dataUrl);
        }
    }, [onExport, shapes, selectedField]);

    const handleMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (tool === 'eraser') return;

        setIsDrawing(true);
        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;

        const newShape: CanvasShape = {
            id: Date.now().toString(),
            tool: tool as 'pen' | 'circle' | 'rect',
            stroke: color,
            strokeWidth: currentStrokeWidth,
        };

        if (tool === 'pen') {
            newShape.points = [pos.x, pos.y];
        } else if (tool === 'circle') {
            newShape.x = pos.x;
            newShape.y = pos.y;
            newShape.radius = 0;
        } else if (tool === 'rect') {
            newShape.x = pos.x;
            newShape.y = pos.y;
            newShape.width = 0;
            newShape.height = 0;
        }

        setCurrentShape(newShape);
    };

    const handleMouseMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (!isDrawing || !currentShape) return;

        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;

        if (currentShape.tool === 'pen' && currentShape.points) {
            setCurrentShape({
                ...currentShape,
                points: [...currentShape.points, pos.x, pos.y]
            });
        } else if (currentShape.tool === 'circle' && currentShape.x !== undefined && currentShape.y !== undefined) {
            const dx = pos.x - currentShape.x;
            const dy = pos.y - currentShape.y;
            const radius = Math.sqrt(dx * dx + dy * dy);
            setCurrentShape({ ...currentShape, radius });
        } else if (currentShape.tool === 'rect' && currentShape.x !== undefined && currentShape.y !== undefined) {
            setCurrentShape({
                ...currentShape,
                width: pos.x - currentShape.x,
                height: pos.y - currentShape.y
            });
        }
    };

    const handleMouseUp = () => {
        if (!isDrawing || !currentShape) return;

        setIsDrawing(false);
        const newShapes = [...shapes, currentShape];
        setShapes(newShapes);

        // Update history
        const newHistory = history.slice(0, historyStep + 1);
        setHistory([...newHistory, newShapes]);
        setHistoryStep(historyStep + 1);

        setCurrentShape(null);
    };

    const handleClick = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (tool !== 'eraser') return;

        const stage = e.target.getStage();
        if (!stage) return;
        const clickedOnEmpty = e.target === stage;
        if (clickedOnEmpty) return;

        // Find shape to remove
        const shapeId = e.target.id();
        const newShapes = shapes.filter(s => s.id !== shapeId);
        setShapes(newShapes);

        const newHistory = history.slice(0, historyStep + 1);
        setHistory([...newHistory, newShapes]);
        setHistoryStep(historyStep + 1);
    };

    const handleUndo = () => {
        if (historyStep === 0) return;
        setHistoryStep(historyStep - 1);
        setShapes(history[historyStep - 1]);
    };

    const handleRedo = () => {
        if (historyStep >= history.length - 1) return;
        setHistoryStep(historyStep + 1);
        setShapes(history[historyStep + 1]);
    };

    const handleClear = () => {
        if (window.confirm('¿Borrar todo el dibujo?')) {
            setShapes([]);
            setHistory([[]]);
            setHistoryStep(0);
        }
    };

    return (
        <div className={`space-y-4 ${highContrast ? 'canvas-high-contrast' : ''}`}>
            {/* Accessibility Toggle Bar */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-2 border-amber-300 dark:border-amber-700">
                <Button
                    size={buttonSize}
                    variant={highVisibilityMode ? 'default' : 'outline'}
                    onClick={toggleHighVisibilityMode}
                    className={`gap-2 ${highVisibilityMode ? 'bg-amber-500 hover:bg-amber-600 text-black' : ''}`}
                    aria-pressed={highVisibilityMode}
                    aria-label="Activar modo alta visibilidad"
                >
                    <Eye className={iconSize} aria-hidden="true" />
                    <span className="font-semibold">Alta Visibilidad</span>
                </Button>

                {/* Stroke Width Selector */}
                <div className="flex items-center gap-2 ml-4">
                    <span className={`font-medium ${highVisibilityMode ? 'text-lg' : 'text-sm'}`}>Grosor:</span>
                    <div className="flex gap-1">
                        <Button
                            size={buttonSize}
                            variant={strokeWidth === 'normal' ? 'default' : 'outline'}
                            onClick={() => setStrokeWidth('normal')}
                            aria-label="Grosor normal"
                        >
                            Fino
                        </Button>
                        <Button
                            size={buttonSize}
                            variant={strokeWidth === 'thick' ? 'default' : 'outline'}
                            onClick={() => setStrokeWidth('thick')}
                            aria-label="Grosor grueso"
                        >
                            Medio
                        </Button>
                        <Button
                            size={buttonSize}
                            variant={strokeWidth === 'extra' ? 'default' : 'outline'}
                            onClick={() => setStrokeWidth('extra')}
                            aria-label="Grosor extra grueso"
                        >
                            Grueso
                        </Button>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className={`flex flex-wrap gap-3 p-4 bg-lme-surface-soft rounded-lg border-2 ${highContrast ? 'border-yellow-400' : 'border-lme-border'}`}>
                {/* Tools with labels */}
                <div className="flex gap-2">
                    <Button
                        size={buttonSize}
                        variant={tool === 'pen' ? 'default' : 'outline'}
                        onClick={() => setTool('pen')}
                        className="gap-2"
                        aria-pressed={tool === 'pen'}
                        aria-label="Herramienta lápiz"
                    >
                        <Pencil className={iconSize} aria-hidden="true" />
                        {highVisibilityMode && <span>Lápiz</span>}
                    </Button>
                    <Button
                        size={buttonSize}
                        variant={tool === 'circle' ? 'default' : 'outline'}
                        onClick={() => setTool('circle')}
                        className="gap-2"
                        aria-pressed={tool === 'circle'}
                        aria-label="Herramienta círculo"
                    >
                        <CircleIcon className={iconSize} aria-hidden="true" />
                        {highVisibilityMode && <span>Círculo</span>}
                    </Button>
                    <Button
                        size={buttonSize}
                        variant={tool === 'rect' ? 'default' : 'outline'}
                        onClick={() => setTool('rect')}
                        className="gap-2"
                        aria-pressed={tool === 'rect'}
                        aria-label="Herramienta rectángulo"
                    >
                        <Square className={iconSize} aria-hidden="true" />
                        {highVisibilityMode && <span>Rectángulo</span>}
                    </Button>
                    <Button
                        size={buttonSize}
                        variant={tool === 'eraser' ? 'destructive' : 'outline'}
                        onClick={() => setTool('eraser')}
                        className="gap-2"
                        aria-pressed={tool === 'eraser'}
                        aria-label="Herramienta borrador"
                    >
                        <Eraser className={iconSize} aria-hidden="true" />
                        {highVisibilityMode && <span>Borrar</span>}
                    </Button>
                </div>

                {/* Colors - larger in high visibility mode */}
                <div className="flex gap-2 items-center" role="radiogroup" aria-label="Selección de color">
                    {COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={`${colorSize} rounded-lg border-4 transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-mint ${color === c ? 'border-mint ring-4 ring-mint/30 scale-110' : 'border-lme-border'
                                }`}
                            style={{ backgroundColor: c }}
                            role="radio"
                            aria-checked={color === c}
                            aria-label={`Color ${c}`}
                        />
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-auto">
                    <Button
                        size={buttonSize}
                        variant="ghost"
                        onClick={handleUndo}
                        disabled={historyStep === 0}
                        className="gap-2"
                        aria-label="Deshacer"
                    >
                        <Undo2 className={iconSize} aria-hidden="true" />
                        {highVisibilityMode && <span>Deshacer</span>}
                    </Button>
                    <Button
                        size={buttonSize}
                        variant="ghost"
                        onClick={handleRedo}
                        disabled={historyStep >= history.length - 1}
                        className="gap-2"
                        aria-label="Rehacer"
                    >
                        <Redo2 className={iconSize} aria-hidden="true" />
                        {highVisibilityMode && <span>Rehacer</span>}
                    </Button>
                    <Button
                        size={buttonSize}
                        variant="ghost"
                        onClick={handleClear}
                        className="gap-2 text-red-500 hover:text-red-600"
                        aria-label="Borrar todo"
                    >
                        <Trash2 className={iconSize} aria-hidden="true" />
                        {highVisibilityMode && <span>Limpiar</span>}
                    </Button>
                </div>
            </div>

            {/* Field Selector */}
            <div className={`flex gap-2 overflow-x-auto p-3 bg-lme-surface-soft rounded-lg border-2 ${highContrast ? 'border-yellow-400' : 'border-lme-border'}`}>
                <button
                    onClick={() => setSelectedField(null)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${!selectedField
                            ? 'bg-mint text-white'
                            : highContrast
                                ? 'bg-gray-800 text-yellow-300 border-2 border-yellow-400'
                                : 'bg-lme-surface text-ink'
                        } ${highVisibilityMode ? 'text-lg' : 'text-sm'}`}
                    aria-pressed={!selectedField}
                >
                    Sin Campo
                </button>
                {SPORT_FIELDS.map(field => (
                    <button
                        key={field.id}
                        onClick={() => setSelectedField(field.id)}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${selectedField === field.id
                                ? 'bg-mint text-white'
                                : highContrast
                                    ? 'bg-gray-800 text-yellow-300 border-2 border-yellow-400'
                                    : 'bg-lme-surface text-ink'
                            } ${highVisibilityMode ? 'text-lg' : 'text-sm'}`}
                        aria-pressed={selectedField === field.id}
                    >
                        {field.name}
                    </button>
                ))}
            </div>

            {/* Canvas */}
            <div className={`border-4 rounded-lg overflow-hidden ${highContrast ? 'border-yellow-400 bg-gray-900' : 'border-lme-border bg-white'}`}>
                <Stage
                    ref={stageRef}
                    width={width}
                    height={height}
                    onMouseDown={handleMouseDown}
                    onMousemove={handleMouseMove}
                    onMouseup={handleMouseUp}
                    onClick={handleClick}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                >
                    <Layer>
                        {/* Background Field */}
                        <FieldBackground fieldId={selectedField} />

                        {/* Drawn Shapes */}
                        {shapes.map(shape => {
                            if (shape.tool === 'pen' && shape.points) {
                                return (
                                    <Line
                                        key={shape.id}
                                        id={shape.id}
                                        points={shape.points}
                                        stroke={shape.stroke}
                                        strokeWidth={shape.strokeWidth}
                                        tension={0.5}
                                        lineCap="round"
                                        lineJoin="round"
                                    />
                                );
                            } else if (shape.tool === 'circle' && shape.x && shape.y && shape.radius) {
                                return (
                                    <Circle
                                        key={shape.id}
                                        id={shape.id}
                                        x={shape.x}
                                        y={shape.y}
                                        radius={shape.radius}
                                        stroke={shape.stroke}
                                        strokeWidth={shape.strokeWidth}
                                    />
                                );
                            } else if (shape.tool === 'rect' && shape.x && shape.y && shape.width && shape.height) {
                                return (
                                    <Rect
                                        key={shape.id}
                                        id={shape.id}
                                        x={shape.x}
                                        y={shape.y}
                                        width={shape.width}
                                        height={shape.height}
                                        stroke={shape.stroke}
                                        strokeWidth={shape.strokeWidth}
                                    />
                                );
                            }
                            return null;
                        })}

                        {/* Current Shape Being Drawn */}
                        {currentShape && (
                            <>
                                {currentShape.tool === 'pen' && currentShape.points && (
                                    <Line
                                        points={currentShape.points}
                                        stroke={currentShape.stroke}
                                        strokeWidth={currentShape.strokeWidth}
                                        tension={0.5}
                                        lineCap="round"
                                        lineJoin="round"
                                    />
                                )}
                                {currentShape.tool === 'circle' && currentShape.x && currentShape.y && (
                                    <Circle
                                        x={currentShape.x}
                                        y={currentShape.y}
                                        radius={currentShape.radius || 0}
                                        stroke={currentShape.stroke}
                                        strokeWidth={currentShape.strokeWidth}
                                    />
                                )}
                                {currentShape.tool === 'rect' && currentShape.x && currentShape.y && (
                                    <Rect
                                        x={currentShape.x}
                                        y={currentShape.y}
                                        width={currentShape.width || 0}
                                        height={currentShape.height || 0}
                                        stroke={currentShape.stroke}
                                        strokeWidth={currentShape.strokeWidth}
                                    />
                                )}
                            </>
                        )}
                    </Layer>
                </Stage>
            </div>

            <p className={`text-sub ${highVisibilityMode ? 'text-lg' : 'text-xs'}`}>
                Usa las herramientas para dibujar. Selecciona un campo deportivo como fondo si lo necesitas.
                {highVisibilityMode && ' Modo alta visibilidad activado.'}
            </p>
        </div>
    );
}
