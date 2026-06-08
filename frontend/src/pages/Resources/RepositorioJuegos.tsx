import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { BookOpen, Calendar, Download, Search, Shapes } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import PublicEditorialShell from '@/components/layout/PublicEditorialShell';
import { buildApiUrl } from '@/utils/url';

interface GameResource {
    id: number;
    title: string;
    sport_name: string;
    created_at: string;
}

interface Sport {
    id: number;
    nombre: string;
}

const editorialSelectTriggerClassName =
    'min-h-11 border-[var(--editorial-border)] bg-[var(--editorial-paper)] text-[var(--editorial-ink)] shadow-[0_1px_2px_rgba(24,39,75,0.08)] focus:ring-[#4f76b6]';
const editorialSelectPanelClassName =
    'border-[var(--editorial-border)] bg-[rgba(246,242,234,0.98)] shadow-[0_20px_45px_rgba(24,39,75,0.16)] backdrop-blur-md';
const editorialSelectOptionClassName =
    'text-[var(--editorial-ink)] hover:bg-[rgba(39,76,136,0.08)]';

export default function RepositorioJuegos() {
    const [games, setGames] = useState<GameResource[]>([]);
    const [filteredGames, setFilteredGames] = useState<GameResource[]>([]);
    const [sports, setSports] = useState<Sport[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSport, setSelectedSport] = useState<string>('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sportsRes, gamesRes] = await Promise.all([
                    axios.get(buildApiUrl('/tipos-deporte/')),
                    axios.get(buildApiUrl('/game-resources/repository')),
                ]);

                setSports(sportsRes.data);
                setGames(gamesRes.data);
                setFilteredGames(gamesRes.data);
            } catch (error) {
                console.error('Error fetching repository data:', error);
            } finally {
                setLoading(false);
            }
        };

        void fetchData();
    }, []);

    useEffect(() => {
        let result = games;

        if (selectedSport !== 'all') {
            result = result.filter(
                (game) => game.sport_name === sports.find((sport) => sport.id.toString() === selectedSport)?.nombre,
            );
        }

        if (searchTerm.trim()) {
            const needle = searchTerm.trim().toLowerCase();
            result = result.filter((game) => game.title.toLowerCase().includes(needle));
        }

        setFilteredGames(result);
    }, [games, searchTerm, selectedSport, sports]);

    const sportOptions = useMemo(
        () =>
            sports.map((sport) => ({
                value: sport.id.toString(),
                label: sport.nombre,
                keywords: [sport.nombre],
            })),
        [sports],
    );

    const latestGame = useMemo(
        () =>
            [...games].sort(
                (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
            )[0],
        [games],
    );

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedSport('all');
    };

    const handleDownload = async (gameId: number, title: string) => {
        try {
            const response = await axios.get(
                buildApiUrl(`/game-resources/download-anonymous/${gameId}`),
                { responseType: 'blob' },
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Ficha_Anonima_${title.replace(/\s+/g, '_')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file', error);
        }
    };

    return (
        <PublicEditorialShell
            title="Repositorio de Juegos"
            eyebrow="Descarga y reutilización"
            description="Biblioteca anónima de fichas publicadas por la comunidad educativa, pensada para reutilizar rápido en aula."
        >
            <Card variant="editorial" className="editorial-card">
                <CardContent className="grid gap-4 pt-6 md:grid-cols-2 xl:grid-cols-4">
                    <StatTile
                        label="Fichas"
                        value={games.length}
                        support="Repositorio completo"
                        icon={BookOpen}
                    />
                    <StatTile
                        label="Resultados"
                        value={filteredGames.length}
                        support="Tras aplicar filtros"
                        icon={Search}
                    />
                    <StatTile
                        label="Deportes"
                        value={sports.length}
                        support="Catálogo cubierto"
                        icon={Shapes}
                    />
                    <StatTile
                        label="Última alta"
                        value={latestGame ? format(new Date(latestGame.created_at), 'dd MMM', { locale: es }) : '-'}
                        support={latestGame ? 'Nueva ficha incorporada' : 'Sin fichas recientes'}
                        icon={Calendar}
                    />
                </CardContent>
            </Card>

            <Card variant="editorial" className="editorial-card">
                <CardHeader className="border-b border-[var(--editorial-border)]">
                    <CardTitle className="text-[var(--editorial-ink)]">Encontrar una ficha</CardTitle>
                    <CardDescription className="text-[var(--editorial-muted)]">
                        Busca por nombre y filtra por deporte con selector textual para localizar materiales concretos.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <div className="grid gap-4 md:grid-cols-[1fr_320px_auto]">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--editorial-muted)]" />
                            <Input
                                variant="editorial"
                                placeholder="Buscar juegos por nombre"
                                className="pl-9"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                        </div>
                        <SearchableSelect
                            value={selectedSport === 'all' ? '' : selectedSport}
                            onValueChange={(value) => setSelectedSport(value || 'all')}
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
                        <Button
                            type="button"
                            variant="editorialOutline"
                            onClick={clearFilters}
                            disabled={!searchTerm.trim() && selectedSport === 'all'}
                        >
                            Limpiar
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-[#5d6f8f]">
                            {filteredGames.length} resultado{filteredGames.length !== 1 ? 's' : ''} visible{filteredGames.length !== 1 ? 's' : ''}
                        </p>
                        {selectedSport !== 'all' && (
                            <Badge variant="outline" className="border-[#b6c9e5] bg-[#eef4ff] text-[#2b4d7f]">
                                {sportOptions.find((option) => option.value === selectedSport)?.label || 'Deporte'}
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <Card variant="editorial" className="editorial-card">
                    <CardContent className="py-20 text-center text-[#5d6f8f]">Cargando repositorio...</CardContent>
                </Card>
            ) : filteredGames.length === 0 ? (
                <Card variant="editorial" className="editorial-card">
                    <CardContent className="py-20 text-center">
                        <p className="text-xl font-medium text-[#445977]">No se encontraron juegos</p>
                        <p className="mt-2 text-sm text-[#5d6f8f]">Ajusta filtros para ver resultados.</p>
                        <Button className="mt-6" variant="editorialOutline" onClick={clearFilters}>
                            Mostrar todo
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredGames.map((game) => (
                        <Card key={game.id} variant="editorial" className="editorial-card group">
                            <CardHeader>
                                <div className="mb-2 flex justify-between items-start">
                                    <Badge variant="secondary" className="bg-[#dce9ff] text-[#244575] hover:bg-[#dce9ff]">
                                        {game.sport_name}
                                    </Badge>
                                </div>
                                <CardTitle className="line-clamp-2 text-xl text-[#20304a] transition-colors group-hover:text-[#315b9a]">
                                    {game.title}
                                </CardTitle>
                                <CardDescription className="mt-2 flex items-center gap-2 text-[#5d6f8f]">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(game.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                                </CardDescription>
                            </CardHeader>
                            <CardFooter className="pt-4">
                                <Button
                                    className="w-full"
                                    variant="editorialOutline"
                                    onClick={() => void handleDownload(game.id, game.title)}
                                >
                                    <Download className="h-4 w-4" />
                                    Descargar ficha anónima
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            <Card variant="editorial" className="editorial-card">
                <CardContent className="flex items-center gap-3 py-5 text-[#425776]">
                    <BookOpen className="h-5 w-5 text-[#315b9a]" />
                    <p className="text-sm">
                        Este repositorio está diseñado para reutilización rápida en aula: descarga directa sin exponer datos personales.
                    </p>
                </CardContent>
            </Card>
        </PublicEditorialShell>
    );
}

function StatTile({
    label,
    value,
    support,
    icon: Icon,
}: {
    label: string;
    value: string | number;
    support: string;
    icon: typeof BookOpen;
}) {
    return (
        <div className="rounded-xl border border-[var(--editorial-border)] bg-[color-mix(in_srgb,var(--editorial-card)_88%,white_12%)] p-4">
            <p className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--editorial-muted)]">
                <span>{label}</span>
                <Icon className="h-4 w-4 text-[#3b659d]" aria-hidden="true" />
            </p>
            <p className="mt-2 text-3xl font-bold text-[var(--editorial-ink)]">{value}</p>
            <p className="mt-1 text-xs text-[var(--editorial-muted)]">{support}</p>
        </div>
    );
}
