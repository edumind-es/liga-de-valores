/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit, FileText, ImageIcon, Save, Shapes, Trash2 } from 'lucide-react';
import { apiClient } from '@/api/client';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getImageUrl } from '@/utils/url';

interface Sport {
    id: number;
    nombre: string;
    codigo: string;
    descripcion?: string;
    vt_file?: string;
    logo_file?: string;
}

export default function AdminSports() {
    const [sports, setSports] = useState<Sport[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [vtFile, setVtFile] = useState<File | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    const fetchSports = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.client.get('/tipos-deporte/');
            setSports(res.data);
        } catch (error) {
            console.error('Error fetching sports', error);
            toast.error('Error al cargar deportes');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchSports();
    }, [fetchSports]);

    const filteredSports = useMemo(() => {
        const needle = searchValue.trim().toLowerCase();
        if (!needle) return sports;

        return sports.filter((sport) =>
            [sport.nombre, sport.codigo, sport.descripcion ?? '']
                .join(' ')
                .toLowerCase()
                .includes(needle),
        );
    }, [searchValue, sports]);

    const sportsWithLogo = useMemo(
        () => sports.filter((sport) => Boolean(sport.logo_file)).length,
        [sports],
    );
    const sportsWithVt = useMemo(
        () => sports.filter((sport) => Boolean(sport.vt_file)).length,
        [sports],
    );
    const sportsWithDescription = useMemo(
        () => sports.filter((sport) => Boolean(sport.descripcion?.trim())).length,
        [sports],
    );

    const handleEdit = (sport: Sport) => {
        setSelectedSport(sport);
        setEditName(sport.nombre);
        setEditDesc(sport.descripcion || '');
        setVtFile(null);
        setLogoFile(null);
        setIsDialogOpen(true);
    };

    const handleDelete = async (sport: Sport) => {
        if (!confirm(`¿Estás seguro de eliminar el deporte "${sport.nombre}"? Esta acción no se puede deshacer.`)) return;

        try {
            await apiClient.client.delete(`/tipos-deporte/${sport.id}`);
            toast.success('Deporte eliminado correctamente');
            void fetchSports();
        } catch (error) {
            console.error('Error deleting sport', error);
            toast.error('Error al eliminar el deporte');
        }
    };

    const handleSave = async () => {
        if (!selectedSport) return;

        const formData = new FormData();
        formData.append('nombre', editName);
        formData.append('descripcion', editDesc);
        if (vtFile) formData.append('vt_file', vtFile);
        if (logoFile) formData.append('logo_file', logoFile);

        try {
            await apiClient.client.put(`/tipos-deporte/${selectedSport.id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            toast.success('Deporte actualizado correctamente');
            setIsDialogOpen(false);
            setSelectedSport(null);
            void fetchSports();
        } catch (error) {
            console.error('Error updating sport', error);
            toast.error('Error al actualizar el deporte');
        }
    };

    if (loading) {
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
                title="Administración de Deportes"
                description="Gestiona catálogo, material visual y recursos de apoyo para mantener consistente la capa deportiva."
                eyebrow="Administración global"
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Deportes"
                    value={sports.length}
                    support="Tipos activos en catálogo"
                    icon={Shapes}
                    tone="mint"
                />
                <MetricCard
                    label="Con logo"
                    value={sportsWithLogo}
                    support="Identidad visual cargada"
                    icon={ImageIcon}
                    tone="sky"
                />
                <MetricCard
                    label="Con Visual Thinking"
                    value={sportsWithVt}
                    support="Archivo PDF disponible"
                    icon={FileText}
                    tone="vio"
                />
                <MetricCard
                    label="Con descripción"
                    value={sportsWithDescription}
                    support="Texto visible al profesorado"
                    icon={Edit}
                    tone="amber"
                />
            </div>

            <ListToolbar
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder="Buscar por nombre, código o descripción"
                summary={`Mostrando ${filteredSports.length} de ${sports.length} deportes del catálogo.`}
            >
                <Badge variant="outline">Logo</Badge>
                <Badge variant="secondary">PDF VT</Badge>
                <Badge variant="accent">Edición directa</Badge>
            </ListToolbar>

            <Card className="border-lme-border/90 bg-[rgba(10,20,38,0.72)] shadow-[0_18px_40px_rgba(3,10,28,0.18)]">
                <CardHeader className="border-b border-lme-border/70">
                    <CardTitle>Catálogo editable</CardTitle>
                    <CardDescription>
                        Revisa textos, logos y documentación pedagógica de cada deporte.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {sports.length === 0 ? (
                        <EmptyState
                            icon={Shapes}
                            title="No hay deportes cargados"
                            description="Cuando exista catálogo aparecerá aquí para su mantenimiento y edición administrativa."
                        />
                    ) : filteredSports.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-lg font-semibold text-ink">No hay deportes que coincidan con la búsqueda</p>
                            <p className="mt-2 text-sm text-sub">Prueba con otro nombre, código o fragmento de descripción.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto p-4">
                            <Table className="overflow-hidden rounded-2xl">
                                <TableHeader>
                                    <TableRow className="border-lme-border/80 hover:bg-transparent">
                                        <TableHead>Deporte</TableHead>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Logo</TableHead>
                                        <TableHead>Visual Thinking</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSports.map((sport, index) => (
                                        <TableRow
                                            key={sport.id}
                                            className={index % 2 === 1 ? 'bg-[rgba(255,255,255,0.02)]' : ''}
                                        >
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-ink">{sport.nombre}</p>
                                                    <p className="line-clamp-2 text-xs text-sub">
                                                        {sport.descripcion?.trim() || 'Sin descripción editorial.'}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{sport.codigo}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {sport.logo_file ? (
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={getImageUrl(sport.logo_file)}
                                                            alt={`Logo de ${sport.nombre}`}
                                                            className="h-12 w-12 rounded-xl border border-white/10 bg-white/90 p-2 object-contain"
                                                            onError={(event) => {
                                                                event.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                        <Badge variant="success">Disponible</Badge>
                                                    </div>
                                                ) : (
                                                    <Badge variant="secondary">Sin logo</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {sport.vt_file ? (
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        <a
                                                            href={getImageUrl(sport.vt_file)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                            Ver PDF
                                                        </a>
                                                    </Button>
                                                ) : (
                                                    <Badge variant="secondary">Sin archivo</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(sport)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDelete(sport)}
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
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Editar deporte</DialogTitle>
                        <DialogDescription>
                            Actualiza el contenido editorial y los recursos visuales del deporte seleccionado.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 py-2">
                        <div className="rounded-2xl border border-lme-border/80 bg-[rgba(255,255,255,0.03)] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sub">Deporte</p>
                                    <p className="mt-2 text-xl font-bold text-ink">{editName || selectedSport?.nombre || 'Sin nombre'}</p>
                                    <p className="text-sm text-sub">{selectedSport?.codigo || 'Código no disponible'}</p>
                                </div>
                                {selectedSport?.logo_file && (
                                    <img
                                        src={getImageUrl(selectedSport.logo_file)}
                                        alt={`Logo actual de ${selectedSport.nombre}`}
                                        className="h-16 w-16 rounded-2xl border border-white/10 bg-white/90 p-2 object-contain"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="sport-name">Nombre visible</Label>
                            <Input
                                id="sport-name"
                                value={editName}
                                onChange={(event) => setEditName(event.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="sport-description">Descripción</Label>
                            <Textarea
                                id="sport-description"
                                value={editDesc}
                                onChange={(event) => setEditDesc(event.target.value)}
                                rows={5}
                                placeholder="Resume reglas clave, identidad del deporte o información útil para el profesorado."
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 rounded-2xl border border-lme-border/80 bg-[rgba(255,255,255,0.03)] p-4">
                                <Label className="text-sm font-semibold text-ink">Logo del deporte</Label>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) => setLogoFile(event.target.files?.[0] || null)}
                                />
                                <p className="text-xs text-sub">PNG, JPG o SVG con fondo claro si es posible.</p>
                            </div>

                            <div className="space-y-2 rounded-2xl border border-lme-border/80 bg-[rgba(255,255,255,0.03)] p-4">
                                <Label className="text-sm font-semibold text-ink">Visual Thinking</Label>
                                <Input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(event) => setVtFile(event.target.files?.[0] || null)}
                                />
                                <p className="text-xs text-sub">Sube el PDF explicativo visible en recursos.</p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={!editName.trim()}>
                            <Save className="h-4 w-4" />
                            Guardar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
