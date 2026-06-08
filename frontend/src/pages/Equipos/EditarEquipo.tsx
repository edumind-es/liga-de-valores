/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import {
    ArrowLeft,
    Copy,
    ExternalLink,
    Key,
    RefreshCw,
    Save,
    Shield,
    ShieldAlert,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { equiposApi } from '@/api/equipos';
import { ligasApi } from '@/api/ligas';
import { type Equipo, type Liga } from '@/types/liga';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { FormSectionCard } from '@/components/workspace/FormSectionCard';
import { toast } from 'sonner';
import { getImageUrl } from '@/utils/url';
import { authenticatedFetch } from '@/api/client';

export default function EditarEquipo() {
    const { ligaId, equipoId } = useParams<{ ligaId: string; equipoId: string }>();
    const navigate = useNavigate();
    const [liga, setLiga] = useState<Liga | null>(null);
    const [equipo, setEquipo] = useState<Equipo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        color_principal: '#3B82F6',
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const loadData = useCallback(async (lId: number, eId: number) => {
        try {
            const [ligaData, equipoData] = await Promise.all([
                ligasApi.getById(lId),
                equiposApi.getById(eId),
            ]);
            setLiga(ligaData);
            setEquipo(equipoData);
            setFormData({
                nombre: equipoData.nombre,
                color_principal: equipoData.color_principal || '#3B82F6',
            });
            if (equipoData.logo_filename) {
                setPreviewUrl(getImageUrl(`/static/uploads/${equipoData.logo_filename}`));
            }
        } catch {
            toast.error('Error al cargar los datos');
            navigate(`/ligas/${lId}/equipos`);
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        if (ligaId && equipoId) {
            void loadData(parseInt(ligaId, 10), parseInt(equipoId, 10));
        }
    }, [ligaId, equipoId, loadData]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Solo se permiten archivos de imagen');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen no puede superar 5MB');
            return;
        }

        setLogoFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const handleRemoveLogo = async () => {
        if (!equipoId) return;

        try {
            const response = await authenticatedFetch(
                `${import.meta.env.VITE_API_URL || '/api/v1'}/equipos/${equipoId}/logo`,
                {
                    method: 'DELETE',
                },
            );

            if (!response.ok) {
                throw new Error('Error al eliminar logo');
            }

            setPreviewUrl(null);
            setLogoFile(null);
            setEquipo((prev) => prev ? { ...prev, logo_filename: undefined } : prev);
            toast.success('Logo eliminado correctamente');
        } catch {
            toast.error('Error al eliminar el logo');
        }
    };

    const handleCancelPreview = () => {
        setLogoFile(null);
        if (equipo?.logo_filename) {
            setPreviewUrl(getImageUrl(`/static/uploads/${equipo.logo_filename}`));
        } else {
            setPreviewUrl(null);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!ligaId || !equipoId) return;

        setIsSaving(true);
        try {
            const updatedEquipo = await equiposApi.update(parseInt(equipoId, 10), {
                ...formData,
            });
            setEquipo((prev) => prev ? { ...prev, ...updatedEquipo } : updatedEquipo);

            if (logoFile) {
                try {
                    const uploadFormData = new FormData();
                    uploadFormData.append('file', logoFile);

                    await authenticatedFetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/equipos/${equipoId}/logo`, {
                        method: 'POST',
                        body: uploadFormData,
                    });
                    toast.success('Equipo y logo actualizados correctamente');
                } catch {
                    toast.warning('Equipo actualizado, pero error al subir logo');
                }
            } else {
                toast.success('Equipo actualizado correctamente');
            }

            navigate(`/ligas/${ligaId}/equipos`);
        } catch {
            toast.error('Error al actualizar el equipo');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRegenerateToken = async () => {
        if (!window.confirm('¿Estás seguro de que deseas regenerar el token de acceso? El QR anterior dejará de funcionar inmediatamente.')) {
            return;
        }

        try {
            if (!equipoId) return;
            const response = await equiposApi.regenerateToken(parseInt(equipoId, 10));
            setEquipo((prev) => prev ? { ...prev, acceso_token: response.acceso_token } : prev);
            toast.success('Token regenerado correctamente. El nuevo acceso ya está activo.');
        } catch {
            toast.error('Error al regenerar el token');
        }
    };

    if (isLoading) return <div className="p-8 text-center text-sub">Cargando...</div>;
    if (!liga || !equipo) return <div className="p-8 text-center text-red-500">No encontrado</div>;

    const teamAccessUrl = equipo.acceso_token ? `${window.location.origin}/team/${equipo.acceso_token}` : '';

    return (
        <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 animate-in fade-in duration-500">
            <Button variant="ghost" size="sm" asChild className="w-fit pl-0 hover:bg-transparent">
                <Link to={`/ligas/${ligaId}/equipos`}>
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Volver a equipos
                </Link>
            </Button>

            <PageHeader
                title="Editar equipo"
                description={`Actualiza identidad, logo y acceso de ${equipo.nombre}.`}
                eyebrow="Detalle de equipo"
            >
                <Badge variant="outline">ID {equipo.id}</Badge>
                <Badge variant="secondary">{liga.nombre}</Badge>
            </PageHeader>

            <form onSubmit={handleSubmit} className="space-y-5">
                <FormSectionCard
                    title="Identidad del equipo"
                    description="Mantén el nombre y la imagen del equipo alineados con la competición y el portal del alumnado."
                    icon={Shield}
                    tone="mint"
                    contentClassName="space-y-6"
                >
                    <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre del equipo</Label>
                        <Input
                            id="nombre"
                            value={formData.nombre}
                            onChange={(event) => setFormData({ ...formData, nombre: event.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="color">Color principal</Label>
                        <div className="flex flex-col gap-3 rounded-2xl border border-lme-border/70 bg-[rgba(11,24,44,0.5)] p-4 sm:flex-row sm:items-center">
                            <Input
                                type="color"
                                id="color"
                                className="h-12 w-24 cursor-pointer p-1"
                                value={formData.color_principal}
                                onChange={(event) => setFormData({ ...formData, color_principal: event.target.value })}
                            />
                            <div className="flex items-center gap-3">
                                <div
                                    className="h-10 w-10 rounded-xl border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                                    style={{ backgroundColor: formData.color_principal }}
                                />
                                <div>
                                    <p className="text-sm font-medium text-ink">Vista previa del color</p>
                                    <p className="font-mono text-xs text-sub">{formData.color_principal}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="logo">Logo del equipo (opcional)</Label>
                        {previewUrl ? (
                            <div className="space-y-3">
                                <div className="inline-flex rounded-2xl border border-lme-border/70 bg-[rgba(11,24,44,0.5)] p-4">
                                    <div className="relative">
                                        <img
                                            src={previewUrl}
                                            alt="Logo del equipo"
                                            className="h-32 w-32 rounded-xl border border-lme-border object-cover"
                                        />
                                        {logoFile && (
                                            <button
                                                type="button"
                                                onClick={handleCancelPreview}
                                                className="absolute -right-2 -top-2 rounded-full bg-slate-600 p-1 text-white transition-colors hover:bg-slate-500"
                                                title="Cancelar cambio"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <label htmlFor="logo" className="cursor-pointer">
                                        <div className="flex items-center gap-2 rounded-full border border-lme-border bg-[rgba(11,24,44,0.42)] px-4 py-2 transition-colors hover:border-sky hover:bg-sky/10">
                                            <Upload className="h-4 w-4 text-sub" />
                                            <span className="text-sm text-sub">Cambiar logo</span>
                                        </div>
                                        <Input
                                            type="file"
                                            id="logo"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                    </label>

                                    {equipo.logo_filename && !logoFile && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleRemoveLogo}
                                            className="text-red-300 hover:text-red-200"
                                        >
                                            <Trash2 className="mr-1 h-4 w-4" />
                                            Eliminar logo
                                        </Button>
                                    )}
                                </div>

                                {logoFile && (
                                    <p className="text-xs text-mint">Nuevo logo seleccionado: {logoFile.name}</p>
                                )}
                            </div>
                        ) : (
                            <label htmlFor="logo" className="block cursor-pointer">
                                <div className="rounded-2xl border-2 border-dashed border-lme-border bg-[rgba(11,24,44,0.35)] p-5 transition-colors hover:border-sky hover:bg-sky/5">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                        <div className="rounded-2xl border border-lme-border/70 bg-white/5 p-3">
                                            <Upload className="h-5 w-5 text-sub" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-ink">Seleccionar logo</p>
                                            <p className="text-xs text-sub">JPG, PNG o WebP · max 5MB</p>
                                        </div>
                                    </div>
                                    <Input
                                        type="file"
                                        id="logo"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </label>
                        )}
                    </div>
                </FormSectionCard>

                <Card className="border-red-500/25 bg-[rgba(74,12,18,0.24)] shadow-[0_18px_40px_rgba(3,10,28,0.18)]">
                    <CardContent className="space-y-6 p-6">
                        <div className="flex items-start gap-3">
                            <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3">
                                <ShieldAlert className="h-5 w-5 text-red-300" />
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-red-100">Zona de acceso del alumnado</p>
                                <p className="mt-1 text-sm text-red-100/75">
                                    Gestiona el enlace del equipo y regenera el token si necesitas invalidar el acceso anterior.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
                            <div className="flex flex-col items-center rounded-2xl border border-lme-border/70 bg-[rgba(255,255,255,0.92)] p-4 text-center">
                                {equipo.acceso_token ? (
                                    <>
                                        <div style={{ height: 'auto', margin: '0 auto', maxWidth: 160, width: '100%' }}>
                                            <QRCode
                                                size={256}
                                                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                                value={teamAccessUrl}
                                                viewBox="0 0 256 256"
                                            />
                                        </div>
                                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">QR activo</p>
                                        <p className="mt-2 max-w-[160px] break-all text-xs font-mono text-slate-700">
                                            {equipo.acceso_token}
                                        </p>
                                    </>
                                ) : (
                                    <div className="flex h-40 w-40 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
                                        Sin token
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-2xl border border-lme-border/70 bg-[rgba(11,24,44,0.5)] p-4">
                                    <div className="flex items-center gap-2">
                                        <Key className="h-4 w-4 text-red-200" />
                                        <p className="text-sm font-semibold text-ink">Enlace del equipo</p>
                                    </div>
                                    <code className="mt-3 block overflow-x-auto rounded-xl border border-lme-border/70 bg-[rgba(8,14,30,0.78)] px-3 py-3 text-xs text-ink">
                                        {teamAccessUrl || 'Sin enlace disponible'}
                                    </code>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                if (!teamAccessUrl) return;
                                                navigator.clipboard.writeText(teamAccessUrl);
                                                toast.success('Enlace copiado al portapapeles');
                                            }}
                                            disabled={!teamAccessUrl}
                                        >
                                            <Copy className="mr-2 h-4 w-4" />
                                            Copiar
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                if (!teamAccessUrl) return;
                                                window.open(teamAccessUrl, '_blank', 'noopener,noreferrer');
                                            }}
                                            disabled={!teamAccessUrl}
                                        >
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Abrir portal
                                        </Button>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-red-100">Regenerar token</p>
                                            <p className="mt-1 text-xs text-red-100/75">
                                                Úsalo si sospechas que el acceso se ha compartido fuera del grupo previsto.
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="border-red-300/30 text-red-100 hover:text-white"
                                            onClick={handleRegenerateToken}
                                        >
                                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                            Regenerar acceso
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-wrap justify-end gap-3 border-t border-lme-border/60 pt-2">
                    <Button variant="outline" type="button" asChild>
                        <Link to={`/ligas/${ligaId}/equipos`}>Cancelar</Link>
                    </Button>
                    <Button type="submit" disabled={isSaving} className="min-w-[160px]">
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
