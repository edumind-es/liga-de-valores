import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { Loader2, Send, Download, Image as ImageIcon, BookOpen, Eye, CheckCircle2, RotateCcw } from 'lucide-react';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import AdvancedCanvas from '@/components/gamesheet/AdvancedCanvas';
import PictogramSearch from '@/components/gamesheet/PictogramSearch';
import type { Pictogram } from '@/utils/arasaac';
import { useAccessibilityStore } from '@/store/accessibilityStore';
import { buildApiUrl } from '@/utils/url';

interface Sport {
    id: number;
    nombre: string;
}

const SUBMISSION_POLICY_NOTICE_VERSION =
    import.meta.env.VITE_SUBMISSION_POLICY_NOTICE_VERSION || '2026-04-02';

export default function GeneradorFichas() {
    const { ligaId } = useParams();
    const [formData, setFormData] = useState({
        nombreAlumno: '',
        nombreJuego: '',
        reglas: '',
        materiales: '',
        sportId: '',
    });
    const [sports, setSports] = useState<Sport[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [enviado, setEnviado] = useState(false);      // pantalla de confirmación
    const [nombreJuegoEnviado, setNombreJuegoEnviado] = useState('');
    const sendingRef = useRef(false);                   // bloqueo síncrono anti-doble-clic
    const [canvasDataUrl, setCanvasDataUrl] = useState('');
    const [materialesPictograms, setMaterialesPictograms] = useState<Pictogram[]>([]);
    const [reglasPictograms, setReglasPictograms] = useState<Pictogram[]>([]);
    const [showMaterialesPictos, setShowMaterialesPictos] = useState(false);
    const [showReglasPictos, setShowReglasPictos] = useState(false);
    const [showLanguageWarning, setShowLanguageWarning] = useState(false);
    const [languageWarningMessage, setLanguageWarningMessage] = useState("");
    const [policyNoticeAccepted, setPolicyNoticeAccepted] = useState(false);
    const [communityGuidelinesAccepted, setCommunityGuidelinesAccepted] = useState(false);

    // Accessibility
    const { highVisibilityMode, toggleHighVisibilityMode, resetAccessibility } = useAccessibilityStore();

    // Dynamic classes for high visibility mode
    const labelClass = highVisibilityMode ? 'text-xl font-bold' : '';
    const inputClass = highVisibilityMode ? 'text-xl h-14 border-2 border-yellow-400' : '';
    const textareaClass = highVisibilityMode ? 'text-xl border-2 border-yellow-400' : '';
    const buttonSize = highVisibilityMode ? 'lg' : 'sm';
    const pictoSize = highVisibilityMode ? 'w-20 h-20' : 'w-12 h-12';

    useEffect(() => {
        // Fetch sports
        const fetchSports = async () => {
            try {
                const res = await axios.get(buildApiUrl('/tipos-deporte/'));
                setSports(res.data);
            } catch (e) {
                console.error("Error fetching sports", e);
            }
        };
        fetchSports();
    }, []);

    const handleCanvasExport = (dataUrl: string) => {
        setCanvasDataUrl(dataUrl);
    };

    const addPictogramToMateriales = (pictogram: Pictogram) => {
        setMaterialesPictograms([...materialesPictograms, pictogram]);
        // Optional: Append text to textarea? No, keep it separate visual.
    };

    const addPictogramToReglas = (pictogram: Pictogram) => {
        setReglasPictograms([...reglasPictograms, pictogram]);
    };

    const getBase64ImageFromUrl = (imageUrl: string): Promise<string | null> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous"; // Important for ARASAAC
            img.src = imageUrl;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL("image/png"));
                } else {
                    resolve(null);
                }
            };
            img.onerror = (e) => {
                console.error("Error loading image", imageUrl, e);
                resolve(null);
            };
        });
    };

    const generatePDF = async (isAnonymous: boolean): Promise<jsPDF> => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth(); // usually 210

        // Title
        doc.setFontSize(22);
        doc.text('Ficha de Juego', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(12);
        if (isAnonymous) {
            doc.text(`Autor: (Anónimo)`, 20, 40);
        } else {
            doc.text(`Alumno/a: ${formData.nombreAlumno}`, 20, 40);
        }

        // Sport name
        const sportName = sports.find(s => s.id.toString() === formData.sportId)?.nombre || '';
        if (sportName) {
            doc.text(`Deporte: ${sportName}`, 140, 40);
        }

        // Content
        doc.setLineWidth(0.5);
        doc.line(20, 45, 190, 45);

        doc.setFontSize(16);
        doc.text(`Juego: ${formData.nombreJuego}`, 20, 60);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Materiales:', 20, 80);
        doc.setFont('helvetica', 'normal');

        const splitMateriales = doc.splitTextToSize(formData.materiales, 170);
        doc.text(splitMateriales, 20, 87);

        let yPos = 87 + (splitMateriales.length * 7);

        // Add materials pictograms if any
        if (materialesPictograms.length > 0 && yPos < 250) {
            yPos += 5;
            let xPos = 20;

            // Fetch all images first
            const imagePromises = materialesPictograms.slice(0, 5).map(p => getBase64ImageFromUrl(p.url));
            const images = await Promise.all(imagePromises);

            images.forEach((imgData) => {
                if (xPos + 30 > 190) {
                    xPos = 20;
                    yPos += 35;
                }
                if (imgData) {
                    doc.addImage(imgData, 'PNG', xPos, yPos, 30, 30);
                }
                xPos += 35;
            });
            // Adjust yPos after images
            if (images.some(i => i !== null)) yPos += 35;
        }

        doc.setFont('helvetica', 'bold');
        doc.text('Reglas / Descripción:', 20, yPos + 10);
        doc.setFont('helvetica', 'normal');

        const splitReglas = doc.splitTextToSize(formData.reglas, 170);
        doc.text(splitReglas, 20, yPos + 17);

        yPos = yPos + 17 + (splitReglas.length * 7);

        // Add reglas pictograms if any
        if (reglasPictograms.length > 0 && yPos < 250) {
            yPos += 5;
            let xPos = 20;

            // Fetch all images first
            const imagePromises = reglasPictograms.slice(0, 5).map(p => getBase64ImageFromUrl(p.url));
            const images = await Promise.all(imagePromises);

            images.forEach((imgData) => {
                if (xPos + 30 > 190) {
                    xPos = 20;
                    yPos += 35;
                }
                if (imgData) {
                    doc.addImage(imgData, 'PNG', xPos, yPos, 30, 30);
                }
                xPos += 35;
            });
            if (images.some(i => i !== null)) yPos += 35;
        }

        // Add Canvas Drawing
        if (canvasDataUrl) {
            // Check existing space
            if (yPos > 180) { // If near bottom, new page
                doc.addPage();
                yPos = 20;
            } else {
                yPos += 20;
            }

            doc.setFont('helvetica', 'bold');
            doc.text('Representación Gráfica:', 20, yPos);

            // Add image
            // Canvas usually large, fit width
            doc.addImage(canvasDataUrl, 'PNG', 20, yPos + 5, 170, 100);
        }

        return doc;
    };

    const handleDownload = async () => {
        if (!formData.nombreAlumno || !formData.nombreJuego) {
            toast.error("Por favor completa al menos el nombre del alumno y del juego.");
            return;
        }
        try {
            const doc = await generatePDF(false);
            doc.save(`Ficha_${formData.nombreJuego.replace(/\s+/g, '_')}.pdf`);
            toast.success("PDF descargado correctamente");
        } catch (error) {
            console.error(error);
            toast.error("Error al generar el PDF");
        }
    };

    const handleSend = async (startForce: boolean | unknown = false) => {
        const force = startForce === true;

        // Bloqueo síncrono: evita doble envío aunque React no haya re-renderizado aún
        if (sendingRef.current) return;
        sendingRef.current = true;

        if (!formData.nombreAlumno || !formData.nombreJuego) {
            sendingRef.current = false;
            toast.error("Por favor completa el nombre del alumno y del juego.");
            return;
        }
        if (!policyNoticeAccepted || !communityGuidelinesAccepted) {
            sendingRef.current = false;
            toast.error("Debes aceptar el aviso legal y las normas de uso para continuar.");
            return;
        }

        try {
            setIsSending(true);

            const data = new FormData();

            // Datos estructurados (el backend genera el PDF)
            data.append('liga_id', ligaId || '0');
            data.append('student_name', formData.nombreAlumno);
            data.append('game_name', formData.nombreJuego);
            data.append('materiales', formData.materiales);
            data.append('reglas', formData.reglas);
            if (formData.sportId) data.append('sport_id', formData.sportId);

            if (force) {
                data.append('force_language', 'true');
            }
            data.append('policy_notice_accepted', policyNoticeAccepted ? 'true' : 'false');
            data.append('community_guidelines_accepted', communityGuidelinesAccepted ? 'true' : 'false');
            data.append('policy_notice_version', SUBMISSION_POLICY_NOTICE_VERSION);

            // Pictogramas como JSON
            if (materialesPictograms.length > 0) {
                const pictoIds = materialesPictograms.map(p => p.id);
                data.append('pictogramas_materiales', JSON.stringify(pictoIds));
            }
            if (reglasPictograms.length > 0) {
                const pictoIds = reglasPictograms.map(p => p.id);
                data.append('pictogramas_reglas', JSON.stringify(pictoIds));
            }

            // Representación gráfica (canvas como imagen)
            if (canvasDataUrl) {
                const response = await fetch(canvasDataUrl);
                const blob = await response.blob();
                data.append('representacion_grafica', blob, 'dibujo.png');
            }

            const response = await axios.post(buildApiUrl('/tools/send-game-sheet'), data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            setNombreJuegoEnviado(formData.nombreJuego);
            setEnviado(true);
            setShowLanguageWarning(false);
            if (response.data?.moderation_required) {
                toast.warning("La ficha se ha enviado con revisión preventiva de contenido visual.");
            }
        } catch (error: unknown) {
            console.error("Error sending ficha:", error);

            if (axios.isAxiosError(error) && error.response?.status === 400 && error.response?.data) {
                const detail = typeof error.response.data === 'object'
                    ? (error.response.data as { detail?: string }).detail
                    : undefined;
                if (typeof detail === 'string') {
                    if (detail.startsWith("LANGUAGE_MISMATCH:")) {
                        setLanguageWarningMessage(detail.replace("LANGUAGE_MISMATCH: ", ""));
                        setShowLanguageWarning(true);
                        return;
                    }
                    if (detail.startsWith("POLICY_BLOCKED_LANGUAGE:")) {
                        toast.error(detail.replace("POLICY_BLOCKED_LANGUAGE: ", ""));
                        return;
                    }
                    if (detail.startsWith("POLICY_ACK_REQUIRED:")) {
                        toast.error(detail.replace("POLICY_ACK_REQUIRED: ", ""));
                        return;
                    }
                }
            }

            toast.error("Error al enviar la ficha.");
        } finally {
            setIsSending(false);
            sendingRef.current = false;
        }
    };

    const handleNuevaFicha = () => {
        // Resetea todo el formulario para enviar una nueva ficha
        setEnviado(false);
        setNombreJuegoEnviado('');
        setFormData({ nombreAlumno: '', nombreJuego: '', reglas: '', materiales: '', sportId: '' });
        setCanvasDataUrl('');
        setMaterialesPictograms([]);
        setReglasPictograms([]);
        setPolicyNoticeAccepted(false);
        setCommunityGuidelinesAccepted(false);
    };


    return (
        <div className="container max-w-6xl mx-auto py-8 px-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl text-center text-primary flex items-center justify-center gap-2">
                        <BookOpen className="w-8 h-8" /> Generador de Ficha de Juego
                    </CardTitle>
                    <CardDescription className="text-center">
                        Crea tu ficha de juego. Enviaremos una copia a tu profesor y otra <strong>anónima</strong> por si se publica en el repositorio escolar.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* ── Pantalla de confirmación post-envío ── */}
                    {enviado && (
                        <div className="flex flex-col items-center justify-center py-12 gap-6 text-center">
                            <div className={`rounded-full p-5 ${highVisibilityMode ? 'bg-green-200' : 'bg-green-100 dark:bg-green-900/30'}`}>
                                <CheckCircle2 className={`text-green-600 dark:text-green-400 ${highVisibilityMode ? 'h-20 w-20' : 'h-14 w-14'}`} />
                            </div>
                            <div className="space-y-2">
                                <h2 className={`font-bold text-green-700 dark:text-green-400 ${highVisibilityMode ? 'text-3xl' : 'text-2xl'}`}>
                                    ¡Ficha enviada!
                                </h2>
                                <p className={`text-muted-foreground ${highVisibilityMode ? 'text-xl' : 'text-base'}`}>
                                    Tu ficha <strong>"{nombreJuegoEnviado}"</strong> ha llegado al docente correctamente.
                                </p>
                                <p className={`text-muted-foreground ${highVisibilityMode ? 'text-lg' : 'text-sm'}`}>
                                    No hace falta volver a enviarla.
                                </p>
                            </div>
                            <Button
                                size={highVisibilityMode ? 'lg' : 'default'}
                                variant="outline"
                                onClick={handleNuevaFicha}
                                className={`gap-2 ${highVisibilityMode ? 'text-xl py-6 px-8' : ''}`}
                            >
                                <RotateCcw className={highVisibilityMode ? 'h-6 w-6' : 'h-4 w-4'} />
                                Enviar otra ficha
                            </Button>
                        </div>
                    )}
                    {/* ── Formulario (oculto tras el envío) ── */}
                    {!enviado && <>
                    {/* Accessibility Bar */}
                    <div className="flex flex-wrap items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-2 border-amber-300 dark:border-amber-700">
                        <Button
                            size={buttonSize}
                            variant={highVisibilityMode ? 'default' : 'outline'}
                            onClick={toggleHighVisibilityMode}
                            className={`gap-2 ${highVisibilityMode ? 'bg-amber-500 hover:bg-amber-600 text-black text-lg' : ''}`}
                            aria-pressed={highVisibilityMode}
                        >
                            <Eye className={highVisibilityMode ? 'h-6 w-6' : 'h-5 w-5'} />
                            <span className="font-semibold">Alta Visibilidad</span>
                        </Button>
                        {highVisibilityMode && (
                            <>
                                <span className="text-lg font-medium text-amber-700 dark:text-amber-300">
                                    ✓ Modo activado: controles ampliados
                                </span>
                                <Button
                                    size={buttonSize}
                                    variant="outline"
                                    onClick={resetAccessibility}
                                    className="gap-2 border-amber-400 bg-white/80 text-amber-900 hover:bg-white"
                                >
                                    Restaurar vista normal
                                </Button>
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="nombreAlumno" className={labelClass}>Nombre del Alumno/a</Label>
                            <Input
                                id="nombreAlumno"
                                placeholder="Tu nombre completo"
                                value={formData.nombreAlumno}
                                onChange={(e) => setFormData({ ...formData, nombreAlumno: e.target.value })}
                                className={inputClass}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="nombreJuego" className={labelClass}>Nombre del Juego</Label>
                            <Input
                                id="nombreJuego"
                                placeholder="Nombre de tu propuesta"
                                value={formData.nombreJuego}
                                onChange={(e) => setFormData({ ...formData, nombreJuego: e.target.value })}
                                className={inputClass}
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label className={labelClass}>Deporte (Opcional)</Label>
                            <SearchableSelect
                                value={formData.sportId}
                                onValueChange={(value) => setFormData({ ...formData, sportId: value })}
                                placeholder="Selecciona un deporte..."
                                searchPlaceholder="Buscar deporte por nombre o codigo..."
                                emptyText="No se encontraron deportes"
                                allowClear
                                clearLabel="Quitar deporte seleccionado"
                                triggerClassName={highVisibilityMode ? 'text-xl h-14 border-2 border-yellow-400' : ''}
                                panelClassName={highVisibilityMode ? 'text-xl' : ''}
                                options={sports.map((sport) => ({
                                    value: sport.id.toString(),
                                    label: sport.nombre,
                                    description: `Deporte disponible: ${sport.nombre}`,
                                    keywords: [sport.nombre],
                                }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="materiales" className={labelClass}>Materiales necesarios</Label>
                            <Button
                                size={buttonSize}
                                variant="outline"
                                onClick={() => setShowMaterialesPictos(!showMaterialesPictos)}
                            >
                                <ImageIcon className={highVisibilityMode ? 'w-6 h-6 mr-2' : 'w-4 h-4 mr-2'} />
                                {showMaterialesPictos ? 'Ocultar' : 'Añadir'} Pictogramas
                            </Button>
                        </div>
                        <Textarea
                            id="materiales"
                            placeholder="¿Qué materiales necesitas?"
                            value={formData.materiales}
                            onChange={(e) => setFormData({ ...formData, materiales: e.target.value })}
                            className={textareaClass}
                        />
                        {showMaterialesPictos && (
                            <PictogramSearch onSelect={addPictogramToMateriales} compact />
                        )}
                        {materialesPictograms.length > 0 && (
                            <div className={`flex gap-3 flex-wrap p-3 rounded ${highVisibilityMode ? 'bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-400' : 'bg-slate-50 dark:bg-slate-800'}`}>
                                {materialesPictograms.map((picto, idx) => (
                                    <div key={idx} className="relative group">
                                        <img
                                            src={picto.url}
                                            alt={picto.title}
                                            className={`${pictoSize} border-2 rounded bg-white`}
                                            title={picto.title}
                                        />
                                        <div
                                            className={`absolute -top-2 -right-2 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity ${highVisibilityMode ? 'w-8 h-8 text-lg' : 'w-5 h-5 text-xs'}`}
                                            onClick={() => setMaterialesPictograms(prev => prev.filter((_, i) => i !== idx))}
                                        >
                                            ✕
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="reglas" className={labelClass}>Reglas y Descripción</Label>
                            <Button
                                size={buttonSize}
                                variant="outline"
                                onClick={() => setShowReglasPictos(!showReglasPictos)}
                            >
                                <ImageIcon className={highVisibilityMode ? 'w-6 h-6 mr-2' : 'w-4 h-4 mr-2'} />
                                {showReglasPictos ? 'Ocultar' : 'Añadir'} Pictogramas
                            </Button>
                        </div>
                        <Textarea
                            id="reglas"
                            placeholder="Explica cómo se juega, las reglas principales, variantes..."
                            className={`min-h-[150px] ${textareaClass}`}
                            value={formData.reglas}
                            onChange={(e) => setFormData({ ...formData, reglas: e.target.value })}
                        />
                        {showReglasPictos && (
                            <PictogramSearch onSelect={addPictogramToReglas} compact />
                        )}
                        {reglasPictograms.length > 0 && (
                            <div className={`flex gap-3 flex-wrap p-3 rounded ${highVisibilityMode ? 'bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-400' : 'bg-slate-50 dark:bg-slate-800'}`}>
                                {reglasPictograms.map((picto, idx) => (
                                    <div key={idx} className="relative group">
                                        <img
                                            src={picto.url}
                                            alt={picto.title}
                                            className={`${pictoSize} border-2 rounded bg-white`}
                                            title={picto.title}
                                        />
                                        <div
                                            className={`absolute -top-2 -right-2 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity ${highVisibilityMode ? 'w-8 h-8 text-lg' : 'w-5 h-5 text-xs'}`}
                                            onClick={() => setReglasPictograms(prev => prev.filter((_, i) => i !== idx))}
                                        >
                                            ✕
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Representación Gráfica (Canvas Avanzado)</Label>
                        <AdvancedCanvas onExport={handleCanvasExport} width={800} height={500} />
                        <p className="text-xs text-muted-foreground text-center">
                            Usa las herramientas de dibujo, selecciona campos deportivos y crea tu diagrama.
                        </p>
                    </div>

                    <div className={`rounded-lg border p-4 space-y-3 ${highVisibilityMode ? 'border-amber-400 bg-amber-100/60 dark:bg-amber-950/40' : 'border-slate-200 bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700'}`}>
                        <p className={`${highVisibilityMode ? 'text-lg font-semibold' : 'text-sm font-semibold'}`}>
                            Uso responsable y aviso legal
                        </p>
                        <p className={`${highVisibilityMode ? 'text-base' : 'text-xs'} text-muted-foreground`}>
                            Este formulario es educativo. El contenido ofensivo, violento u obsceno no está permitido.
                            Las fichas enviadas pueden revisarse de forma preventiva para proteger al alumnado y al profesorado.
                        </p>
                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="policy_notice"
                                checked={policyNoticeAccepted}
                                onCheckedChange={(checked) => setPolicyNoticeAccepted(checked === true)}
                                className={highVisibilityMode ? 'h-6 w-6 mt-1' : 'mt-1'}
                            />
                            <label htmlFor="policy_notice" className={`${highVisibilityMode ? 'text-base' : 'text-sm'} leading-relaxed cursor-pointer`}>
                                He leído y acepto el aviso legal y la política de privacidad de EDUmind.
                            </label>
                        </div>
                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="community_guidelines"
                                checked={communityGuidelinesAccepted}
                                onCheckedChange={(checked) => setCommunityGuidelinesAccepted(checked === true)}
                                className={highVisibilityMode ? 'h-6 w-6 mt-1' : 'mt-1'}
                            />
                            <label htmlFor="community_guidelines" className={`${highVisibilityMode ? 'text-base' : 'text-sm'} leading-relaxed cursor-pointer`}>
                                Me comprometo a usar lenguaje respetuoso y contenido apropiado para el entorno escolar.
                            </label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Enlaces:
                            {" "}
                            <a
                                className="underline hover:no-underline"
                                href="https://edumind.es/es/aviso-legal"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Aviso legal
                            </a>
                            {" · "}
                            <a
                                className="underline hover:no-underline"
                                href="https://edumind.es/es/privacidad"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Privacidad
                            </a>
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <Button
                            variant="outline"
                            size={buttonSize}
                            className={`flex-1 ${highVisibilityMode ? 'text-xl py-6' : ''}`}
                            onClick={handleDownload}
                        >
                            <Download className={highVisibilityMode ? 'w-6 h-6 mr-2' : 'w-4 h-4 mr-2'} /> Descargar PDF
                        </Button>
                        <Button
                            size={buttonSize}
                            className={`flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 ${highVisibilityMode ? 'text-xl py-6' : ''}`}
                            onClick={handleSend}
                            disabled={isSending || !policyNoticeAccepted || !communityGuidelinesAccepted}
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className={`mr-2 animate-spin ${highVisibilityMode ? 'h-6 w-6' : 'h-4 w-4'}`} /> Procesando...
                                </>
                            ) : (
                                <>
                                    <Send className={highVisibilityMode ? 'w-6 h-6 mr-2' : 'w-4 h-4 mr-2'} /> Enviar al Docente
                                </>
                            )}
                        </Button>
                    </div>
                    </>}
                </CardContent>
            </Card>

            <Dialog open={showLanguageWarning} onOpenChange={setShowLanguageWarning}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>⚠️ Revisión de Idioma</DialogTitle>
                        <DialogDescription className="pt-2">
                            {languageWarningMessage || "El idioma detectado no coincide con el requerido por la liga."}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:justify-end">
                        <Button variant="outline" onClick={() => setShowLanguageWarning(false)}>
                            Revisar y Corregir
                        </Button>
                        <Button variant="destructive" onClick={() => handleSend(true)}>
                            Enviar de Todas Formas
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
