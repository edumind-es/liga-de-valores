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

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Palette, Shield, Upload, X } from 'lucide-react';
import { equiposApi } from '@/api/equipos';
import { ligasApi } from '@/api/ligas';
import { type Liga } from '@/types/liga';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormSectionCard } from '@/components/workspace/FormSectionCard';
import { toast } from 'sonner';
import { authenticatedFetch } from '@/api/client';

export default function CrearEquipo() {
    const { ligaId } = useParams<{ ligaId: string }>();
    const navigate = useNavigate();
    const [liga, setLiga] = useState<Liga | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        nombre: '',
        color_principal: '#3B82F6',
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    useEffect(() => {
        if (ligaId) {
            ligasApi.getById(parseInt(ligaId, 10)).then(setLiga).catch(() => setError('Liga no encontrada'));
        }
    }, [ligaId]);

    const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
            setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        setLogoFile(null);
        setLogoPreview(null);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!ligaId) return;

        if (!formData.nombre.trim()) {
            setError('El nombre del equipo es obligatorio');
            toast.error('El nombre del equipo es obligatorio');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const equipo = await equiposApi.create({
                ...formData,
                liga_id: parseInt(ligaId, 10),
            });

            if (logoFile && equipo.id) {
                try {
                    const uploadFormData = new FormData();
                    uploadFormData.append('file', logoFile);

                    await authenticatedFetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/equipos/${equipo.id}/logo`, {
                        method: 'POST',
                        body: uploadFormData,
                    });
                    toast.success('Equipo y logo creados correctamente');
                } catch {
                    toast.warning('Equipo creado, pero error al subir logo');
                }
            } else {
                toast.success('Equipo creado correctamente');
            }

            navigate(`/ligas/${ligaId}/equipos`);
        } catch {
            const errorMsg = 'Error al crear el equipo';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    if (!liga) return <div className="p-8 text-center">Cargando...</div>;

    return (
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
            <Button variant="ghost" size="sm" asChild className="w-fit pl-0 hover:bg-transparent">
                <Link to={`/ligas/${ligaId}/equipos`}>
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Volver a equipos
                </Link>
            </Button>

            <PageHeader
                title="Nuevo equipo"
                description={`Añade un nuevo equipo a ${liga.nombre}`}
                eyebrow="Alta de equipo"
            >
                <Badge variant="secondary">Paso único</Badge>
                <Badge variant="outline">Identidad y color</Badge>
            </PageHeader>

            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <Card className="border-red-500/35 bg-red-500/10">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-red-100">{error}</p>
                        </CardContent>
                    </Card>
                )}

                <FormSectionCard
                    title="Identidad del equipo"
                    description="Define el nombre visible y la referencia básica con la que aparecerá en listados, partidos y clasificación."
                    icon={Shield}
                    tone="mint"
                >
                    <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre del equipo *</Label>
                        <Input
                            id="nombre"
                            name="nombre"
                            required
                            placeholder="Ej: Los Leones"
                            value={formData.nombre}
                            onChange={(event) => setFormData({ ...formData, nombre: event.target.value })}
                        />
                        <p className="text-xs text-sub">Usa un nombre claro y reconocible para el alumnado.</p>
                    </div>
                </FormSectionCard>

                <FormSectionCard
                    title="Identidad visual"
                    description="Configura color principal y logo para que el equipo se identifique mejor en paneles y cruces de partidos."
                    icon={Palette}
                    tone="sky"
                    contentClassName="space-y-6"
                >
                    <div className="space-y-2">
                        <Label htmlFor="color">Color principal</Label>
                        <div className="flex flex-col gap-3 rounded-2xl border border-lme-border/70 bg-[rgba(11,24,44,0.5)] p-4 sm:flex-row sm:items-center">
                            <Input
                                type="color"
                                id="color"
                                name="color_principal"
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
                        {logoPreview ? (
                            <div className="inline-flex rounded-2xl border border-lme-border/70 bg-[rgba(11,24,44,0.5)] p-4">
                                <div className="relative">
                                    <img
                                        src={logoPreview}
                                        alt="Vista previa del logo"
                                        className="h-32 w-32 rounded-xl border border-lme-border object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRemoveLogo}
                                        className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white transition-colors hover:bg-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <label htmlFor="logo" className="block cursor-pointer">
                                <div className="rounded-2xl border-2 border-dashed border-lme-border bg-[rgba(11,24,44,0.35)] p-5 transition-colors hover:border-sky hover:bg-sky/5">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                        <div className="rounded-2xl border border-lme-border/70 bg-white/5 p-3">
                                            <Upload className="h-5 w-5 text-sub" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-ink">Seleccionar imagen</p>
                                            <p className="text-xs text-sub">JPG, PNG o WebP · máximo 5MB</p>
                                        </div>
                                    </div>
                                    <Input
                                        type="file"
                                        id="logo"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleLogoChange}
                                    />
                                </div>
                            </label>
                        )}
                    </div>
                </FormSectionCard>

                <div className="flex flex-wrap justify-end gap-3">
                    <Button variant="outline" type="button" asChild>
                        <Link to={`/ligas/${ligaId}/equipos`}>Cancelar</Link>
                    </Button>
                    <Button type="submit" disabled={isLoading} className="min-w-[140px]">
                        {isLoading ? 'Creando...' : 'Crear equipo'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
