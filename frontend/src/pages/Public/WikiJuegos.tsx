import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    FileText,
    Filter,
    Loader2,
    Search,
    Shapes,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import PublicEditorialShell from '@/components/layout/PublicEditorialShell';
import { buildApiUrl } from '@/utils/url';

interface WikiGame {
    id: number;
    title: string;
    sport_id: number | null;
    sport_name: string | null;
    sport_categoria: string | null;
    docente_nombre: string | null;
    has_graphics: boolean;
    has_pictograms: boolean;
    published_at: string | null;
}

interface Category {
    codigo: string;
    nombre: string;
    count: number;
}

interface Sport {
    id: number;
    nombre: string;
}

interface TaxonomiaOption {
    id: number;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    cluster: string | null;
}

interface TaxonomiaGroup {
    categoria: string;
    nombre: string;
    opciones: TaxonomiaOption[];
}

const categoryColors: Record<string, string> = {
    alternativo: 'bg-purple-100 text-purple-900 border-purple-300',
    popular: 'bg-orange-100 text-orange-900 border-orange-300',
    tradicional: 'bg-green-100 text-green-900 border-green-300',
    convencional: 'bg-blue-100 text-blue-900 border-blue-300',
};

const categoryLabels: Record<string, string> = {
    alternativo: 'Alternativo',
    popular: 'Popular',
    tradicional: 'Tradicional',
    convencional: 'Convencional',
};

const editorialSelectTriggerClassName =
    'min-h-11 border-[var(--editorial-border)] bg-[var(--editorial-paper)] text-[var(--editorial-ink)] shadow-[0_1px_2px_rgba(24,39,75,0.08)] focus:ring-[#4f76b6]';
const editorialSelectPanelClassName =
    'border-[var(--editorial-border)] bg-[rgba(246,242,234,0.98)] shadow-[0_20px_45px_rgba(24,39,75,0.16)] backdrop-blur-md';
const editorialSelectOptionClassName =
    'text-[var(--editorial-ink)] hover:bg-[rgba(39,76,136,0.08)]';

function formatDate(dateStr: string | null) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export default function WikiJuegos() {
    const [searchParams] = useSearchParams();

    const [games, setGames] = useState<WikiGame[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [sports, setSports] = useState<Sport[]>([]);
    const [taxonomias, setTaxonomias] = useState<TaxonomiaGroup[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('categoria') || 'all');
    const [selectedSport, setSelectedSport] = useState(searchParams.get('sport') || 'all');
    const [selectedTaxonomia, setSelectedTaxonomia] = useState(searchParams.get('taxonomia') || 'all');

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const fetchCategories = useCallback(async () => {
        try {
            const res = await axios.get(buildApiUrl('/game-resources/categorias'));
            setCategories(res.data);
        } catch {
            console.error('Error fetching categories');
        }
    }, []);

    const fetchSports = useCallback(async () => {
        try {
            const res = await axios.get(buildApiUrl('/tipos-deporte/'));
            setSports(res.data);
        } catch {
            console.error('Error fetching sports');
        }
    }, []);

    const fetchTaxonomias = useCallback(async () => {
        try {
            const res = await axios.get(buildApiUrl('/taxonomias/'));
            setTaxonomias(res.data);
        } catch {
            console.error('Error fetching taxonomias');
        }
    }, []);

    const fetchGames = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit: 12 };
            if (selectedCategory !== 'all') params.categoria = selectedCategory;
            if (selectedSport !== 'all') params.sport_id = selectedSport;
            if (selectedTaxonomia !== 'all') params.taxonomia_id = selectedTaxonomia;
            if (search.trim()) params.search = search.trim();

            const res = await axios.get(buildApiUrl('/game-resources/wiki'), { params });
            setGames(res.data.items);
            setTotalPages(res.data.pages);
            setTotal(res.data.total);
        } catch {
            toast.error('Error al cargar los juegos');
        } finally {
            setLoading(false);
        }
    }, [page, search, selectedCategory, selectedSport, selectedTaxonomia]);

    useEffect(() => {
        void fetchCategories();
        void fetchSports();
        void fetchTaxonomias();
    }, [fetchCategories, fetchSports, fetchTaxonomias]);

    useEffect(() => {
        void fetchGames();
    }, [fetchGames]);

    const sportOptions = useMemo(
        () =>
            sports.map((sport) => ({
                value: sport.id.toString(),
                label: sport.nombre,
                keywords: [sport.nombre],
            })),
        [sports],
    );

    const taxonomiaOptions = useMemo(
        () =>
            taxonomias.flatMap((group) =>
                group.opciones.map((option) => ({
                    value: option.id.toString(),
                    label: option.nombre,
                    description: `${group.nombre}${option.cluster ? ` · ${option.cluster}` : ''}`,
                    keywords: [group.nombre, group.categoria, option.codigo, option.cluster ?? ''],
                })),
            ),
        [taxonomias],
    );

    const totalTaxonomias = useMemo(
        () => taxonomias.reduce((count, group) => count + group.opciones.length, 0),
        [taxonomias],
    );

    const activeFiltersCount = [
        search.trim(),
        selectedCategory !== 'all',
        selectedSport !== 'all',
        selectedTaxonomia !== 'all',
    ].filter(Boolean).length;

    const clearFilters = () => {
        setSearch('');
        setSelectedCategory('all');
        setSelectedSport('all');
        setSelectedTaxonomia('all');
        setPage(1);
    };

    const statItems = [
        {
            label: 'Resultados',
            value: total,
            support: 'Fichas publicadas',
            icon: BookOpen,
        },
        {
            label: 'Deportes',
            value: sports.length,
            support: 'Catálogo disponible',
            icon: Shapes,
        },
        {
            label: 'Taxonomías',
            value: totalTaxonomias,
            support: 'Criterios pedagógicos',
            icon: FileText,
        },
        {
            label: 'Filtros activos',
            value: activeFiltersCount,
            support: activeFiltersCount === 0 ? 'Vista completa' : 'Búsqueda afinada',
            icon: Filter,
        },
    ];

    return (
        <PublicEditorialShell
            title="Wiki de Juegos"
            eyebrow="Biblioteca colaborativa"
            description="Explora fichas creadas por la comunidad docente y encuentra propuestas por deporte, categoría y taxonomía pedagógica."
            actions={
                <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                        <span key={category.codigo} className="editorial-chip">
                            {categoryLabels[category.codigo] || category.nombre} ({category.count})
                        </span>
                    ))}
                </div>
            }
        >
            <Card variant="editorial" className="editorial-card">
                <CardContent className="grid gap-4 pt-6 md:grid-cols-2 xl:grid-cols-4">
                    {statItems.map((item) => (
                        <div
                            key={item.label}
                            className="rounded-xl border border-[var(--editorial-border)] bg-[color-mix(in_srgb,var(--editorial-card)_88%,white_12%)] p-4"
                        >
                            <p className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--editorial-muted)]">
                                <span>{item.label}</span>
                                <item.icon className="h-4 w-4 text-[#3b659d]" aria-hidden="true" />
                            </p>
                            <p className="mt-2 text-3xl font-bold text-[var(--editorial-ink)]">{item.value}</p>
                            <p className="mt-1 text-xs text-[var(--editorial-muted)]">{item.support}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card variant="editorial" className="editorial-card">
                <CardHeader className="border-b border-[var(--editorial-border)]">
                    <CardTitle className="text-[var(--editorial-ink)]">Filtrar biblioteca</CardTitle>
                    <CardDescription className="text-[var(--editorial-muted)]">
                        Busca por texto y afina por categoría, deporte o taxonomía sin perder contexto.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <div className="grid gap-4 xl:grid-cols-[1.3fr_220px_280px_320px_auto]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--editorial-muted)]" />
                            <Input
                                variant="editorial"
                                placeholder="Buscar juegos, dinámicas o palabras clave"
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                                className="pl-10"
                            />
                        </div>

                        <Select
                            value={selectedCategory}
                            onValueChange={(value) => {
                                setSelectedCategory(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger variant="editorial">
                                <Filter className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Categoría" />
                            </SelectTrigger>
                            <SelectContent variant="editorial">
                                <SelectItem value="all">Todas las categorías</SelectItem>
                                {categories.map((category) => (
                                    <SelectItem key={category.codigo} value={category.codigo}>
                                        {category.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <SearchableSelect
                            value={selectedSport === 'all' ? '' : selectedSport}
                            onValueChange={(value) => {
                                setSelectedSport(value || 'all');
                                setPage(1);
                            }}
                            options={sportOptions}
                            placeholder="Filtrar por deporte"
                            searchPlaceholder="Buscar deporte..."
                            emptyText="No hay deportes con ese nombre"
                            allowClear={selectedSport !== 'all'}
                            clearLabel="Quitar deporte"
                            triggerClassName={editorialSelectTriggerClassName}
                            panelClassName={editorialSelectPanelClassName}
                            optionClassName={editorialSelectOptionClassName}
                        />

                        <SearchableSelect
                            value={selectedTaxonomia === 'all' ? '' : selectedTaxonomia}
                            onValueChange={(value) => {
                                setSelectedTaxonomia(value || 'all');
                                setPage(1);
                            }}
                            options={taxonomiaOptions}
                            placeholder="Filtrar por taxonomía"
                            searchPlaceholder="Buscar taxonomía..."
                            emptyText="No hay taxonomías con ese criterio"
                            allowClear={selectedTaxonomia !== 'all'}
                            clearLabel="Quitar taxonomía"
                            triggerClassName={editorialSelectTriggerClassName}
                            panelClassName={editorialSelectPanelClassName}
                            optionClassName={editorialSelectOptionClassName}
                        />

                        <Button
                            type="button"
                            variant="editorialOutline"
                            onClick={clearFilters}
                            disabled={activeFiltersCount === 0}
                        >
                            Limpiar
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-[var(--editorial-muted)]">
                            {total} juego{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {selectedCategory !== 'all' && (
                                <Badge variant="outline" className="border-[#b6c9e5] bg-[#eef4ff] text-[#2b4d7f]">
                                    {categoryLabels[selectedCategory] || selectedCategory}
                                </Badge>
                            )}
                            {selectedSport !== 'all' && (
                                <Badge variant="outline" className="border-[#b6c9e5] bg-[#eef4ff] text-[#2b4d7f]">
                                    {sportOptions.find((option) => option.value === selectedSport)?.label || 'Deporte'}
                                </Badge>
                            )}
                            {selectedTaxonomia !== 'all' && (
                                <Badge variant="outline" className="border-[#b6c9e5] bg-[#eef4ff] text-[#2b4d7f]">
                                    {taxonomiaOptions.find((option) => option.value === selectedTaxonomia)?.label || 'Taxonomía'}
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <Card variant="editorial" className="editorial-card">
                    <CardContent className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-[#315b9a]" />
                    </CardContent>
                </Card>
            ) : games.length === 0 ? (
                <Card variant="editorial" className="editorial-card">
                    <CardContent className="py-16 text-center">
                        <BookOpen className="mx-auto mb-4 h-12 w-12 text-[#5d6f8f]" />
                        <p className="text-xl text-[#445977]">No hay juegos para estos filtros</p>
                        <p className="mt-2 text-sm text-[#5d6f8f]">
                            Ajusta búsqueda o categorías para encontrar fichas.
                        </p>
                        <Button className="mt-6" variant="editorialOutline" onClick={clearFilters}>
                            Ver todo el catálogo
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {games.map((game) => (
                        <Card
                            key={game.id}
                            variant="editorial"
                            className="editorial-card overflow-hidden transition-shadow hover:shadow-[0_20px_36px_rgba(24,39,75,0.12)]"
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <CardTitle className="line-clamp-2 text-lg text-[#20304a]">
                                            {game.title}
                                        </CardTitle>
                                        {game.sport_name && (
                                            <CardDescription className="mt-1 text-[#5d6f8f]">
                                                {game.sport_name}
                                            </CardDescription>
                                        )}
                                    </div>
                                    {game.sport_categoria && (
                                        <Badge
                                            variant="outline"
                                            className={categoryColors[game.sport_categoria] || ''}
                                        >
                                            {categoryLabels[game.sport_categoria] || game.sport_categoria}
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-2 text-sm text-[#5d6f8f]">
                                    {game.docente_nombre ? (
                                        <span>Por {game.docente_nombre}</span>
                                    ) : (
                                        <span>Contribución anónima</span>
                                    )}
                                    {game.published_at && (
                                        <>
                                            <span>•</span>
                                            <span>{formatDate(game.published_at)}</span>
                                        </>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {game.has_graphics && (
                                        <Badge variant="outline" className="border-[#b8d6c4] bg-[#e8f6ef] text-[#2f6f4f]">
                                            Con gráfica
                                        </Badge>
                                    )}
                                    {game.has_pictograms && (
                                        <Badge variant="outline" className="border-[#d8c9aa] bg-[#f7efe1] text-[#8b611f]">
                                            Con pictogramas
                                        </Badge>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Link to={`/wiki-juegos/${game.id}`} className="flex-1">
                                        <Button variant="editorialOutline" className="w-full">
                                            <Eye className="h-4 w-4" />
                                            Ver ficha
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="editorialOutline"
                                        onClick={() => void handleDownloadPdf(game)}
                                        aria-label={`Descargar PDF de ${game.title}`}
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <Card variant="editorial" className="editorial-card">
                    <CardContent className="flex flex-wrap items-center justify-center gap-4 py-5">
                        <Button
                            variant="editorialOutline"
                            disabled={page === 1}
                            onClick={() => setPage((currentPage) => currentPage - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                        </Button>
                        <span className="text-sm text-[#5d6f8f]">
                            Página {page} de {totalPages}
                        </span>
                        <Button
                            variant="editorialOutline"
                            disabled={page === totalPages}
                            onClick={() => setPage((currentPage) => currentPage + 1)}
                        >
                            Siguiente
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            )}
        </PublicEditorialShell>
    );

    async function handleDownloadPdf(game: WikiGame) {
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
    }
}
