/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * LogoDesigner - Enhanced logo builder for teams
 * Features: resizable icons, multiple icons, text customization
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Circle, Hexagon, Shield, Square, Star,
    Zap, Trophy, Target, Flame, Heart,
    Download, RotateCcw, Palette,
    Plus, Trash2
} from 'lucide-react';

interface LogoDesignerProps {
    teamName: string;
    teamColor: string;
    onLogoGenerated?: (dataUrl: string) => void;
}

interface LogoIcon {
    id: string;
    iconType: string;
    size: number;
    rotation: number;
    positionY: 'top' | 'center' | 'bottom';
}

// Available shapes
const SHAPES = [
    { id: 'circle', icon: Circle, name: 'Círculo' },
    { id: 'shield', icon: Shield, name: 'Escudo' },
    { id: 'hexagon', icon: Hexagon, name: 'Hexágono' },
    { id: 'square', icon: Square, name: 'Cuadrado' },
    { id: 'star', icon: Star, name: 'Estrella' },
];

// Available sport icons
const ICONS = [
    { id: 'trophy', icon: Trophy, name: 'Trofeo' },
    { id: 'zap', icon: Zap, name: 'Rayo' },
    { id: 'target', icon: Target, name: 'Diana' },
    { id: 'flame', icon: Flame, name: 'Llama' },
    { id: 'heart', icon: Heart, name: 'Corazón' },
    { id: 'star', icon: Star, name: 'Estrella' },
];

// Preset color palettes
const COLOR_PALETTES = [
    { primary: '#3B82F6', secondary: '#1E40AF', name: 'Azul' },
    { primary: '#10B981', secondary: '#047857', name: 'Verde' },
    { primary: '#F59E0B', secondary: '#D97706', name: 'Naranja' },
    { primary: '#EF4444', secondary: '#B91C1C', name: 'Rojo' },
    { primary: '#8B5CF6', secondary: '#6D28D9', name: 'Violeta' },
    { primary: '#EC4899', secondary: '#BE185D', name: 'Rosa' },
    { primary: '#06B6D4', secondary: '#0891B2', name: 'Cian' },
    { primary: '#84CC16', secondary: '#65A30D', name: 'Lima' },
];

// Available fonts
const FONTS = [
    { id: 'inter', name: 'Inter', value: 'Inter, sans-serif' },
    { id: 'arial-black', name: 'Arial Black', value: '"Arial Black", sans-serif' },
    { id: 'impact', name: 'Impact', value: 'Impact, sans-serif' },
    { id: 'georgia', name: 'Georgia', value: 'Georgia, serif' },
    { id: 'courier', name: 'Courier', value: '"Courier New", monospace' },
];

export default function LogoDesigner({ teamName, teamColor, onLogoGenerated }: LogoDesignerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedShape, setSelectedShape] = useState('shield');
    const [primaryColor, setPrimaryColor] = useState(teamColor || '#3B82F6');
    const [secondaryColor, setSecondaryColor] = useState('#1E40AF');

    // Enhanced icon state - support multiple icons
    const [icons, setIcons] = useState<LogoIcon[]>([
        { id: '1', iconType: 'trophy', size: 40, rotation: 0, positionY: 'center' }
    ]);
    const [selectedIconToAdd, setSelectedIconToAdd] = useState('trophy');

    // Enhanced text state
    const [displayText, setDisplayText] = useState(teamName.toUpperCase());
    const [textFont, setTextFont] = useState('inter');
    const [textColor, setTextColor] = useState('#FFFFFF');
    const [textPositionY, setTextPositionY] = useState(50); // Offset from center

    const getPositionY = useCallback((pos: 'top' | 'center' | 'bottom', center: number): number => {
        switch (pos) {
            case 'top': return center - 35;
            case 'center': return center - 10;
            case 'bottom': return center + 20;
            default: return center - 10;
        }
    }, []);

    const drawShape = useCallback((
        ctx: CanvasRenderingContext2D,
        shape: string,
        x: number,
        y: number,
        radius: number,
        primary: string,
        secondary: string
    ) => {
        const gradient = ctx.createRadialGradient(x, y - 30, 0, x, y + 30, radius * 1.2);
        gradient.addColorStop(0, primary);
        gradient.addColorStop(1, secondary);

        ctx.fillStyle = gradient;
        ctx.strokeStyle = secondary;
        ctx.lineWidth = 5;

        switch (shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;

            case 'shield':
                ctx.beginPath();
                ctx.moveTo(x, y - radius);
                ctx.bezierCurveTo(x + radius, y - radius, x + radius, y, x + radius * 0.8, y + radius * 0.5);
                ctx.lineTo(x, y + radius);
                ctx.lineTo(x - radius * 0.8, y + radius * 0.5);
                ctx.bezierCurveTo(x - radius, y, x - radius, y - radius, x, y - radius);
                ctx.fill();
                ctx.stroke();
                break;

            case 'hexagon':
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i - Math.PI / 2;
                    const px = x + radius * Math.cos(angle);
                    const py = y + radius * Math.sin(angle);
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case 'square': {
                const halfSize = radius * 0.85;
                ctx.beginPath();
                ctx.roundRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2, 20);
                ctx.fill();
                ctx.stroke();
                break;
            }

            case 'star':
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const outerAngle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                    const innerAngle = outerAngle + Math.PI / 5;
                    const outerX = x + radius * Math.cos(outerAngle);
                    const outerY = y + radius * Math.sin(outerAngle);
                    const innerX = x + radius * 0.5 * Math.cos(innerAngle);
                    const innerY = y + radius * 0.5 * Math.sin(innerAngle);
                    if (i === 0) ctx.moveTo(outerX, outerY);
                    else ctx.lineTo(outerX, outerY);
                    ctx.lineTo(innerX, innerY);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
        }
    }, []);

    const drawIcon = useCallback((
        ctx: CanvasRenderingContext2D,
        icon: string,
        x: number,
        y: number,
        size: number,
        color: string
    ) => {
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        const half = size / 2;

        switch (icon) {
            case 'trophy':
                ctx.beginPath();
                ctx.moveTo(x - half * 0.6, y - half);
                ctx.lineTo(x + half * 0.6, y - half);
                ctx.lineTo(x + half * 0.4, y);
                ctx.lineTo(x + half * 0.2, y + half * 0.3);
                ctx.lineTo(x + half * 0.4, y + half);
                ctx.lineTo(x - half * 0.4, y + half);
                ctx.lineTo(x - half * 0.2, y + half * 0.3);
                ctx.lineTo(x - half * 0.4, y);
                ctx.closePath();
                ctx.fill();
                break;

            case 'zap':
                ctx.beginPath();
                ctx.moveTo(x + half * 0.2, y - half);
                ctx.lineTo(x - half * 0.4, y);
                ctx.lineTo(x, y);
                ctx.lineTo(x - half * 0.2, y + half);
                ctx.lineTo(x + half * 0.4, y);
                ctx.lineTo(x, y);
                ctx.closePath();
                ctx.fill();
                break;

            case 'target':
                ctx.beginPath();
                ctx.arc(x, y, half, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(x, y, half * 0.6, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(x, y, half * 0.2, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'flame':
                ctx.beginPath();
                ctx.moveTo(x, y + half);
                ctx.bezierCurveTo(x - half, y + half * 0.5, x - half * 0.5, y - half * 0.5, x, y - half);
                ctx.bezierCurveTo(x + half * 0.5, y - half * 0.5, x + half, y + half * 0.5, x, y + half);
                ctx.fill();
                break;

            case 'heart':
                ctx.beginPath();
                ctx.moveTo(x, y + half * 0.8);
                ctx.bezierCurveTo(x - half, y, x - half, y - half * 0.8, x, y - half * 0.4);
                ctx.bezierCurveTo(x + half, y - half * 0.8, x + half, y, x, y + half * 0.8);
                ctx.fill();
                break;

            case 'star':
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const outerAngle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                    const innerAngle = outerAngle + Math.PI / 5;
                    const outerX = x + half * Math.cos(outerAngle);
                    const outerY = y + half * Math.sin(outerAngle);
                    const innerX = x + half * 0.4 * Math.cos(innerAngle);
                    const innerY = y + half * 0.4 * Math.sin(innerAngle);
                    if (i === 0) ctx.moveTo(outerX, outerY);
                    else ctx.lineTo(outerX, outerY);
                    ctx.lineTo(innerX, innerY);
                }
                ctx.closePath();
                ctx.fill();
                break;
        }
    }, []);

    const drawLogo = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = 300;
        const center = size / 2;

        ctx.clearRect(0, 0, size, size);

        ctx.save();
        drawShape(ctx, selectedShape, center, center, 120, primaryColor, secondaryColor);
        ctx.restore();

        icons.forEach(icon => {
            ctx.save();
            const iconY = getPositionY(icon.positionY, center);
            ctx.translate(center, iconY);
            ctx.rotate((icon.rotation * Math.PI) / 180);
            ctx.translate(-center, -iconY);
            drawIcon(ctx, icon.iconType, center, iconY, icon.size, '#FFFFFF');
            ctx.restore();
        });

        ctx.save();
        ctx.fillStyle = textColor;
        const selectedFont = FONTS.find(f => f.id === textFont)?.value || 'Inter, sans-serif';
        const fontSize = Math.max(14, 28 - (displayText.length - 5) * 1.5);
        ctx.font = `bold ${fontSize}px ${selectedFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const maxWidth = 240;
        let text = displayText;
        while (ctx.measureText(text).width > maxWidth && text.length > 1) {
            text = text.slice(0, -1);
        }
        ctx.fillText(text, center, center + textPositionY);
        ctx.restore();

        onLogoGenerated?.(canvas.toDataURL('image/png'));
    }, [
        displayText,
        drawIcon,
        drawShape,
        getPositionY,
        icons,
        onLogoGenerated,
        primaryColor,
        secondaryColor,
        selectedShape,
        textColor,
        textFont,
        textPositionY,
    ]);

    // Draw logo on canvas
    useEffect(() => {
        drawLogo();
    }, [drawLogo]);

    const addIcon = () => {
        if (icons.length >= 3) return;
        setIcons([...icons, {
            id: Date.now().toString(),
            iconType: selectedIconToAdd,
            size: 35,
            rotation: 0,
            positionY: icons.length === 0 ? 'center' : icons.length === 1 ? 'top' : 'bottom'
        }]);
    };

    const updateIcon = (id: string, updates: Partial<LogoIcon>) => {
        setIcons(icons.map(icon =>
            icon.id === id ? { ...icon, ...updates } : icon
        ));
    };

    const removeIcon = (id: string) => {
        setIcons(icons.filter(icon => icon.id !== id));
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const link = document.createElement('a');
        link.download = `logo_${teamName.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const handleReset = () => {
        setSelectedShape('shield');
        setIcons([{ id: '1', iconType: 'trophy', size: 40, rotation: 0, positionY: 'center' }]);
        setPrimaryColor(teamColor || '#3B82F6');
        setSecondaryColor('#1E40AF');
        setDisplayText(teamName.toUpperCase());
        setTextFont('inter');
        setTextColor('#FFFFFF');
        setTextPositionY(50);
    };

    const applyPalette = (palette: typeof COLOR_PALETTES[0]) => {
        setPrimaryColor(palette.primary);
        setSecondaryColor(palette.secondary);
    };

    return (
        <Card className="border-lme-border">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Palette className="h-5 w-5 text-vio" />
                    Diseñador de Logo
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Preview - Larger canvas */}
                <div className="flex justify-center">
                    <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-inner">
                        <canvas
                            ref={canvasRef}
                            width={300}
                            height={300}
                            className="rounded-xl"
                        />
                    </div>
                </div>

                <Tabs defaultValue="shape" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="shape">Forma</TabsTrigger>
                        <TabsTrigger value="icon">Iconos</TabsTrigger>
                        <TabsTrigger value="text">Texto</TabsTrigger>
                        <TabsTrigger value="colors">Colores</TabsTrigger>
                    </TabsList>

                    <TabsContent value="shape" className="space-y-4 pt-4">
                        <div className="grid grid-cols-5 gap-2">
                            {SHAPES.map((shape) => (
                                <Button
                                    key={shape.id}
                                    variant={selectedShape === shape.id ? 'default' : 'outline'}
                                    size="icon"
                                    className="h-12 w-12"
                                    onClick={() => setSelectedShape(shape.id)}
                                    title={shape.name}
                                >
                                    <shape.icon className="h-6 w-6" />
                                </Button>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="icon" className="space-y-4 pt-4">
                        {/* Add new icon */}
                        <div className="flex gap-2 items-center">
                            <div className="grid grid-cols-6 gap-1 flex-1">
                                {ICONS.map((icon) => (
                                    <Button
                                        key={icon.id}
                                        variant={selectedIconToAdd === icon.id ? 'default' : 'outline'}
                                        size="icon"
                                        className="h-10 w-10"
                                        onClick={() => setSelectedIconToAdd(icon.id)}
                                        title={icon.name}
                                    >
                                        <icon.icon className="h-5 w-5" />
                                    </Button>
                                ))}
                            </div>
                            <Button
                                size="sm"
                                onClick={addIcon}
                                disabled={icons.length >= 3}
                                className="gap-1"
                            >
                                <Plus className="h-4 w-4" /> Añadir
                            </Button>
                        </div>

                        {/* Icon list */}
                        <div className="space-y-3">
                            {icons.map((icon, idx) => (
                                <div key={icon.id} className="p-3 bg-lme-surface-soft rounded-lg border border-lme-border space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">
                                            Icono {idx + 1}: {ICONS.find(i => i.id === icon.iconType)?.name}
                                        </span>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-red-500"
                                            onClick={() => removeIcon(icon.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs">Tamaño: {icon.size}px</Label>
                                        <Slider
                                            value={[icon.size]}
                                            onValueChange={(v) => updateIcon(icon.id, { size: v[0] })}
                                            min={20}
                                            max={80}
                                            step={5}
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-xs">Rotación: {icon.rotation}°</Label>
                                            <Slider
                                                value={[icon.rotation]}
                                                onValueChange={(v) => updateIcon(icon.id, { rotation: v[0] })}
                                                min={0}
                                                max={360}
                                                step={15}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Posición</Label>
                                            <Select
                                                value={icon.positionY}
                                                onValueChange={(v) => updateIcon(icon.id, { positionY: v as 'top' | 'center' | 'bottom' })}
                                            >
                                                <SelectTrigger className="w-24 h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="top">Arriba</SelectItem>
                                                    <SelectItem value="center">Centro</SelectItem>
                                                    <SelectItem value="bottom">Abajo</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="text" className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="text">Texto del logo</Label>
                            <Input
                                id="text"
                                value={displayText}
                                onChange={(e) => setDisplayText(e.target.value.toUpperCase())}
                                className="text-center font-bold uppercase"
                                placeholder="NOMBRE EQUIPO"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipografía</Label>
                                <Select value={textFont} onValueChange={setTextFont}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FONTS.map(font => (
                                            <SelectItem key={font.id} value={font.id}>
                                                {font.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Color del texto</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        value={textColor}
                                        onChange={(e) => setTextColor(e.target.value)}
                                        className="w-12 h-10 p-1 cursor-pointer"
                                    />
                                    <Input
                                        value={textColor}
                                        onChange={(e) => setTextColor(e.target.value)}
                                        className="flex-1 font-mono text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Posición vertical: {textPositionY > 0 ? `+${textPositionY}` : textPositionY}</Label>
                            <Slider
                                value={[textPositionY]}
                                onValueChange={(v) => setTextPositionY(v[0])}
                                min={-60}
                                max={80}
                                step={5}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="colors" className="space-y-4 pt-4">
                        <div className="space-y-3">
                            <Label className="text-sm">Paletas predefinidas</Label>
                            <div className="grid grid-cols-4 gap-2">
                                {COLOR_PALETTES.map((palette) => (
                                    <button
                                        key={palette.name}
                                        className="h-10 rounded-lg border-2 border-transparent hover:border-white/50 transition-all overflow-hidden"
                                        style={{
                                            background: `linear-gradient(135deg, ${palette.primary} 50%, ${palette.secondary} 50%)`
                                        }}
                                        onClick={() => applyPalette(palette)}
                                        title={palette.name}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="primary">Color primario</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        id="primary"
                                        value={primaryColor}
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                        className="w-12 h-10 p-1 cursor-pointer"
                                    />
                                    <Input
                                        value={primaryColor}
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                        className="flex-1 font-mono text-xs"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="secondary">Color secundario</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        id="secondary"
                                        value={secondaryColor}
                                        onChange={(e) => setSecondaryColor(e.target.value)}
                                        className="w-12 h-10 p-1 cursor-pointer"
                                    />
                                    <Input
                                        value={secondaryColor}
                                        onChange={(e) => setSecondaryColor(e.target.value)}
                                        className="flex-1 font-mono text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Actions */}
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleReset}
                    >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Resetear
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleDownload}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
