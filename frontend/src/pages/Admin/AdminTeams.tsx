/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 */

import { useEffect, useMemo, useState } from 'react';
import { Edit, Palette, Shield, Trash2, Trophy } from 'lucide-react';
import { equiposApi } from '@/api/equipos';
import { PageHeader } from '@/components/layout/PageHeader';
import { MetricCard } from '@/components/workspace/MetricCard';
import { ListToolbar } from '@/components/workspace/ListToolbar';
import EmptyState from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { type Equipo } from '@/types/liga';

interface TeamUpdateData {
    nombre?: string;
    color_principal?: string;
}

export default function AdminTeams() {
    const [teams, setTeams] = useState<Equipo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTeam, setSelectedTeam] = useState<Equipo | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState<TeamUpdateData>({});
    const [searchValue, setSearchValue] = useState('');

    useEffect(() => {
        void loadTeams();
    }, []);

    const loadTeams = async () => {
        setIsLoading(true);
        try {
            const data = await equiposApi.getAllAdmin(0, 100);
            setTeams(data);
        } catch (error) {
            console.error('Error loading teams:', error);
            toast.error('Error al cargar equipos');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTeams = useMemo(() => {
        const needle = searchValue.trim().toLowerCase();
        if (!needle) return teams;

        return teams.filter((team) =>
            [team.nombre, `liga ${team.liga_id}`, String(team.id), team.color_principal ?? '']
                .join(' ')
                .toLowerCase()
                .includes(needle),
        );
    }, [searchValue, teams]);

    const activeLeagues = useMemo(
        () => new Set(teams.map((team) => team.liga_id)).size,
        [teams],
    );
    const teamsWithColor = useMemo(
        () => teams.filter((team) => Boolean(team.color_principal)).length,
        [teams],
    );
    const topTeam = useMemo(
        () => [...teams].sort((a, b) => b.puntos_totales - a.puntos_totales)[0],
        [teams],
    );

    const handleEdit = (team: Equipo) => {
        setSelectedTeam(team);
        setFormData({
            nombre: team.nombre,
            color_principal: team.color_principal || '#1d4ed8',
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (team: Equipo) => {
        if (!confirm(`¿Estás seguro de eliminar el equipo "${team.nombre}"? Esta acción no se puede deshacer.`)) return;

        try {
            await equiposApi.delete(team.id);
            toast.success('Equipo eliminado correctamente');
            void loadTeams();
        } catch (error) {
            console.error('Error deleting team:', error);
            toast.error('Error al eliminar equipo');
        }
    };

    const handleSave = async () => {
        if (!selectedTeam) return;

        try {
            await equiposApi.update(selectedTeam.id, formData);
            toast.success('Equipo actualizado correctamente');
            setIsDialogOpen(false);
            setSelectedTeam(null);
            void loadTeams();
        } catch (error) {
            console.error('Error updating team:', error);
            toast.error('Error al actualizar equipo');
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-8">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-56" />
                    <Skeleton className="h-4 w-80" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => (
                        <Skeleton key={item} className="h-32 rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Gestión de Equipos"
                description="Supervisa la base de equipos, depura datos visibles y corrige identidades visuales sin salir del panel."
                eyebrow="Administración global"
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Equipos"
                    value={teams.length}
                    support="Registros disponibles"
                    icon={Shield}
                    tone="mint"
                />
                <MetricCard
                    label="Ligas activas"
                    value={activeLeagues}
                    support="Con equipos asociados"
                    icon={Trophy}
                    tone="sky"
                />
                <MetricCard
                    label="Identidad visual"
                    value={teamsWithColor}
                    support="Equipos con color principal"
                    icon={Palette}
                    tone="vio"
                />
                <MetricCard
                    label="Equipo líder"
                    value={topTeam ? `${topTeam.puntos_totales} pts` : '-'}
                    support={topTeam?.nombre || 'Sin resultados'}
                    icon={Trophy}
                    tone="amber"
                />
            </div>

            <ListToolbar
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder="Buscar por equipo, liga, ID o color"
                summary={`Mostrando ${filteredTeams.length} de ${teams.length} equipos en ${activeLeagues} ligas.`}
            >
                <Badge variant="outline">Edición rápida</Badge>
                <Badge variant="secondary">Color y nombre</Badge>
            </ListToolbar>

            <Card className="border-lme-border/90 bg-[rgba(10,20,38,0.72)] shadow-[0_18px_40px_rgba(3,10,28,0.18)]">
                <CardHeader className="border-b border-lme-border/70">
                    <CardTitle>Registro general</CardTitle>
                    <CardDescription>
                        Vista global de equipos con acceso rápido a edición de nombre y color.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {teams.length === 0 ? (
                        <EmptyState
                            icon={Shield}
                            title="Todavía no hay equipos registrados"
                            description="Cuando se creen equipos en las ligas aparecerán aquí para su revisión administrativa."
                        />
                    ) : filteredTeams.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-lg font-semibold text-ink">No hemos encontrado equipos con ese criterio</p>
                            <p className="mt-2 text-sm text-sub">Prueba con otro nombre, liga o identificador.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto p-4">
                            <Table className="overflow-hidden rounded-2xl">
                                <TableHeader>
                                    <TableRow className="border-lme-border/80 hover:bg-transparent">
                                        <TableHead className="w-[90px]">ID</TableHead>
                                        <TableHead>Equipo</TableHead>
                                        <TableHead>Liga</TableHead>
                                        <TableHead>Color</TableHead>
                                        <TableHead className="text-center">Puntos</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTeams.map((team, index) => (
                                        <TableRow
                                            key={team.id}
                                            className={index % 2 === 1 ? 'bg-[rgba(255,255,255,0.02)]' : ''}
                                        >
                                            <TableCell className="font-medium text-sub">#{team.id}</TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-ink">{team.nombre}</p>
                                                    <p className="text-xs text-sub">
                                                        {team.ganados} G · {team.empatados} E · {team.perdidos} P
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">Liga {team.liga_id}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        className="h-5 w-5 rounded-full border border-white/20 shadow-[0_0_0_3px_rgba(255,255,255,0.04)]"
                                                        style={{ backgroundColor: team.color_principal || '#94a3b8' }}
                                                        aria-hidden="true"
                                                    />
                                                    <span className="text-sm text-sub">
                                                        {team.color_principal || 'Sin definir'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-mint">
                                                {team.puntos_totales}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(team)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDelete(team)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Eliminar
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Editar equipo</DialogTitle>
                        <DialogDescription>
                            Ajusta el nombre visible y la identidad cromática del equipo seleccionado.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 py-2">
                        <div className="rounded-2xl border border-lme-border/80 bg-[rgba(255,255,255,0.03)] p-4">
                            <div className="flex items-center gap-4">
                                <span
                                    className="h-16 w-16 rounded-2xl border border-white/15"
                                    style={{ backgroundColor: formData.color_principal || '#1d4ed8' }}
                                    aria-hidden="true"
                                />
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sub">Vista previa</p>
                                    <p className="mt-2 truncate text-xl font-bold text-ink">
                                        {formData.nombre || 'Nombre del equipo'}
                                    </p>
                                    <p className="text-sm text-sub">
                                        {selectedTeam ? `Liga ${selectedTeam.liga_id}` : 'Sin liga'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                            <div className="space-y-2">
                                <Label htmlFor="team-name">Nombre visible</Label>
                                <Input
                                    id="team-name"
                                    value={formData.nombre || ''}
                                    onChange={(event) => setFormData({ ...formData, nombre: event.target.value })}
                                    placeholder="Ej. Lobos de 6º"
                                />
                            </div>

                            <div className="space-y-2 md:w-48">
                                <Label htmlFor="team-color">Color principal</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="team-color"
                                        type="color"
                                        value={formData.color_principal || '#1d4ed8'}
                                        onChange={(event) => setFormData({ ...formData, color_principal: event.target.value })}
                                        className="w-16 p-1"
                                    />
                                    <Input
                                        value={formData.color_principal || ''}
                                        onChange={(event) => setFormData({ ...formData, color_principal: event.target.value })}
                                        placeholder="#1D4ED8"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave}>
                            Guardar cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
