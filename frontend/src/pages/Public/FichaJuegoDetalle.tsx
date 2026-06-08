import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Calendar,
    Download,
    FileText,
    Image as ImageIcon,
    Loader2,
    Package,
    Scroll,
    Shapes,
    User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import PublicEditorialShell from '@/components/layout/PublicEditorialShell';
import { buildApiUrl } from '@/utils/url';

interface TaxonomiaInfo {
    id: number;
    categoria: string;
    nombre: string;
    descripcion: string | null;
}

interface GameDetail {
    id: number;
    title: string;
    sport_id: number | null;
    sport_name: string | null;
    sport_categoria: string | null;
    materiales: string | null;
    reglas: string | null;
    pictogramas_materiales: number[] | null;
    pictogramas_reglas: number[] | null;
    has_graphics: boolean;
    docente_nombre: string | null;
    published_at: string | null;
    taxonomias?: TaxonomiaInfo[];
}

const categoryColors: Record<string, string> = {
    alternativo: 'bg-purple-100 text-purple-900 border-purple-300',
    popular: 'bg-orange-100 text-orange-900 border-orange-300',
    tradicional: 'bg-green-100 text-green-900 border-green-300',
    convencional: 'bg-blue-100 text-blue-900 border-blue-300',
};

const categoryNames: Record<string, string> = {
    alternativo: 'Alternativo',
    popular: 'Popular',
    tradicional: 'Tradicional',
    convencional: 'Convencional',
};

function formatDate(dateStr: string | null) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function getPictogramUrl(pictoId: number) {
    return `https://static.arasaac.org/pictograms/${pictoId}/${pictoId}_500.png`;
}

export default function FichaJuegoDetalle() {
    const { id } = useParams();
    const [game, setGame] = useState<GameDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [graphicsUrl, setGraphicsUrl] = useState<string | null>(null);

    const fetchGame = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(buildApiUrl(`/game-resources/wiki/${id}`));
            setGame(res.data);
            setGraphicsUrl(res.data.has_graphics ? buildApiUrl(`/game-resources/wiki/${id}/graphics`) : null);
        } catch {
            toast.error('Error al cargar la ficha');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void fetchGame();
    }, [fetchGame]);

    const statItems = useMemo(() => {
        if (!game) return [];

        return [
            {
                label: 'Deporte',
                value: game.sport_name || 'Sin asignar',
                support: game.sport_categoria ? categoryNames[game.sport_categoria] || game.sport_categoria : 'Sin categoría',
                icon: Shapes,
            },
            {
                label: 'Publicación',
                value: game.published_at ? formatDate(game.published_at) : 'Sin fecha',
                support: game.docente_nombre ? `Por ${game.docente_nombre}` : 'Contribución anónima',
                icon: Calendar,
            },
            {
                label: 'Pictogramas',
                value: (game.pictogramas_materiales?.length || 0) + (game.pictogramas_reglas?.length || 0),
                support: 'Apoyo visual integrado',
                icon: FileText,
            },
            {
                label: 'Recursos',
                value: game.has_graphics ? 'Con gráfica' : 'Sin gráfica',
                support: game.taxonomias?.length ? `${game.taxonomias.length} taxonomías` : 'Sin taxonomías',
                icon: ImageIcon,
            },
        ];
    }, [game]);

    const handleDownloadPdf = async () => {
        if (!game) return;
        try {
            const res = await axios.get(buildApiUrl(`/game-resources/wiki/${game.id}/pdf`), {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `Ficha_${game.title.replace(/\s+/g, '_')}.pdf`;
            link.click();
            window.URL.revokeObjectURL(url);
            toast.success('PDF descargado');
        } catch {
            toast.error('Error al descargar el PDF');
        }
    };

    if (loading) {
        return (
            <PublicEditorialShell title="Ficha de juego" description="Cargando contenido">
                <Card variant="editorial" className="editorial-card">
                    <CardContent className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-[#315b9a]" />
                    </CardContent>
                </Card>
            </PublicEditorialShell>
        );
    }

    if (!game) {
        return (
            <PublicEditorialShell title="Ficha no encontrada" description="No se pudo recuperar esta entrada de la wiki.">
                <Card variant="editorial" className="editorial-card">
                    <CardContent className="py-12 text-center">
                        <p className="mb-4 text-xl text-[#4b5f7f]">Ficha no encontrada</p>
                        <Link to="/wiki-juegos">
                            <Button variant="editorialOutline">
                                <ArrowLeft className="h-4 w-4" />
                                Volver a la wiki
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </PublicEditorialShell>
        );
    }

    return (
        <PublicEditorialShell
            title={game.title}
            description={game.sport_name || 'Ficha de juego'}
            eyebrow="Detalle de recurso"
            actions={
                <div className="flex flex-wrap gap-2">
                    <Link to="/wiki-juegos">
                        <Button variant="editorialOutline">
                            <ArrowLeft className="h-4 w-4" />
                            Volver
                        </Button>
                    </Link>
                    <Button onClick={handleDownloadPdf} variant="editorialOutline">
                        <Download className="h-4 w-4" />
                        Descargar PDF
                    </Button>
                </div>
            }
        >
            <Card variant="editorial" className="editorial-card">
                <CardHeader className="pb-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {game.sport_categoria && (
                                    <Badge
                                        variant="outline"
                                        className={`${categoryColors[game.sport_categoria]} px-3 py-1 text-sm`}
                                    >
                                        {categoryNames[game.sport_categoria] || game.sport_categoria}
                                    </Badge>
                                )}
                                {game.has_graphics && (
                                    <Badge variant="outline" className="border-[#b8d6c4] bg-[#e8f6ef] text-[#2f6f4f]">
                                        Con representación gráfica
                                    </Badge>
                                )}
                            </div>
                            <CardTitle className="font-display text-3xl text-[#213452]">
                                {game.title}
                            </CardTitle>
                            <div className="flex flex-wrap gap-4 text-sm text-[#5d6f8f]">
                                {game.docente_nombre && (
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        <span>Por {game.docente_nombre}</span>
                                    </div>
                                )}
                                {game.published_at && (
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>{formatDate(game.published_at)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {statItems.map((item) => (
                        <div
                            key={item.label}
                            className="rounded-xl border border-[var(--editorial-border)] bg-[color-mix(in_srgb,var(--editorial-card)_88%,white_12%)] p-4"
                        >
                            <p className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--editorial-muted)]">
                                <span>{item.label}</span>
                                <item.icon className="h-4 w-4 text-[#3b659d]" aria-hidden="true" />
                            </p>
                            <p className="mt-2 text-lg font-bold text-[var(--editorial-ink)]">{item.value}</p>
                            <p className="mt-1 text-xs text-[var(--editorial-muted)]">{item.support}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {game.materiales && (
                <SectionCard
                    title="Materiales necesarios"
                    description="Listado base para preparar la sesión antes de poner el juego en marcha."
                    icon={Package}
                    accentClassName="text-amber-600"
                >
                    <p className="whitespace-pre-wrap leading-relaxed text-[#324766]">
                        {game.materiales}
                    </p>

                    {game.pictogramas_materiales && game.pictogramas_materiales.length > 0 && (
                        <>
                            <Separator className="my-6 bg-[var(--editorial-border)]" />
                            <div className="flex flex-wrap gap-3">
                                {game.pictogramas_materiales.map((pictoId, index) => (
                                    <img
                                        key={index}
                                        src={getPictogramUrl(pictoId)}
                                        alt={`Pictograma de material ${index + 1}`}
                                        className="h-16 w-16 rounded-xl border border-[var(--editorial-border)] bg-white p-1"
                                        loading="lazy"
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </SectionCard>
            )}

            {game.reglas && (
                <SectionCard
                    title="Reglas y desarrollo"
                    description="Narrativa completa para explicar la dinámica del juego con claridad."
                    icon={Scroll}
                    accentClassName="text-blue-600"
                >
                    <p className="whitespace-pre-wrap leading-relaxed text-[#324766]">
                        {game.reglas}
                    </p>

                    {game.pictogramas_reglas && game.pictogramas_reglas.length > 0 && (
                        <>
                            <Separator className="my-6 bg-[var(--editorial-border)]" />
                            <div className="flex flex-wrap gap-3">
                                {game.pictogramas_reglas.map((pictoId, index) => (
                                    <img
                                        key={index}
                                        src={getPictogramUrl(pictoId)}
                                        alt={`Pictograma de regla ${index + 1}`}
                                        className="h-16 w-16 rounded-xl border border-[var(--editorial-border)] bg-white p-1"
                                        loading="lazy"
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </SectionCard>
            )}

            {game.has_graphics && graphicsUrl && (
                <SectionCard
                    title="Representación gráfica"
                    description="Apoyo visual para entender de un vistazo espacios, organización o desarrollo."
                    icon={ImageIcon}
                    accentClassName="text-green-600"
                >
                    <div className="flex justify-center rounded-2xl border border-[var(--editorial-border)] bg-white p-4">
                        <img
                            src={graphicsUrl}
                            alt="Representación gráfica del juego"
                            className="max-h-[500px] max-w-full object-contain"
                        />
                    </div>
                </SectionCard>
            )}

            {game.taxonomias && game.taxonomias.length > 0 && (
                <SectionCard
                    title="Clasificación pedagógica"
                    description="Etiquetas que ayudan a ubicar la propuesta dentro de la lógica metodológica de la biblioteca."
                    icon={FileText}
                    accentClassName="text-[#3b659d]"
                >
                    <div className="flex flex-wrap gap-2">
                        {game.taxonomias.map((taxonomia) => (
                            <Badge
                                key={taxonomia.id}
                                variant="secondary"
                                className="bg-[#e0ebff] px-3 py-1 text-sm text-[#264777]"
                                title={taxonomia.descripcion || ''}
                            >
                                {taxonomia.nombre}
                            </Badge>
                        ))}
                    </div>
                </SectionCard>
            )}
        </PublicEditorialShell>
    );
}

function SectionCard({
    title,
    description,
    icon: Icon,
    accentClassName,
    children,
}: {
    title: string;
    description: string;
    icon: typeof Package;
    accentClassName?: string;
    children: React.ReactNode;
}) {
    return (
        <Card variant="editorial" className="editorial-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-[#25426e]">
                    <Icon className={`h-5 w-5 ${accentClassName || ''}`} />
                    {title}
                </CardTitle>
                <CardDescription className="text-[#5d6f8f]">
                    {description}
                </CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}
