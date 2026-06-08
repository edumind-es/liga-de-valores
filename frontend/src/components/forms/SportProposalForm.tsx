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

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { buildApiUrl } from "@/utils/url";

// Schema validation
const formSchema = z.object({
    nombre: z.string().min(2, "El nombre del deporte debe tener al menos 2 caracteres"),
    tipo_marcador: z.enum(["goles", "sets", "puntos", "tries", "carreras"], {
        message: "Debes seleccionar un tipo de marcador",
    }),
    caracteristicas_adicionales: z.string().optional(),
    descripcion: z.string().min(20, "Por favor, añade una descripción más detallada (mínimo 20 caracteres)"),
    web: z.string().url("Por favor, introduce una URL válida (ej: https://...)").optional().or(z.literal("")),
    email: z.string().email("Introduce un email válido para contactarte"),
    tiempo_regulacion: z.string().optional(),
    tiempo_limite: z.string().optional(),
    tiempo_posesion_segundos: z.string().optional(),
    cambio_campo_tiempo_min: z.string().optional(),
    cambio_campo_puntos: z.string().optional(),
    puntos_para_ganar: z.string().optional(),
    puntos_por_set: z.string().optional(),
    sets_para_ganar: z.string().optional(),
    botones_puntuacion: z.string().optional(),
    objetivo_nombre: z.string().optional(),
    objetivo_max: z.string().optional(),
    objetivo_icono: z.string().optional(),
    permite_empate: z.boolean().optional(),
    config_json: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function SportProposalForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nombre: "",
            tipo_marcador: undefined,
            caracteristicas_adicionales: "",
            descripcion: "",
            web: "",
            email: "",
            tiempo_regulacion: "",
            tiempo_limite: "",
            tiempo_posesion_segundos: "",
            cambio_campo_tiempo_min: "",
            cambio_campo_puntos: "",
            puntos_para_ganar: "",
            puntos_por_set: "",
            sets_para_ganar: "",
            botones_puntuacion: "",
            objetivo_nombre: "",
            objetivo_max: "",
            objetivo_icono: "",
            permite_empate: true,
            config_json: "",
        },
    });

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);
        setError(null);

        try {
            // Build structured config for marcador (optional)
            let configFromJson: Record<string, unknown> = {};
            if (data.config_json && data.config_json.trim()) {
                try {
                    const parsed = JSON.parse(data.config_json);
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                        configFromJson = parsed as Record<string, unknown>;
                    }
                } catch {
                    setError("La configuración avanzada no es un JSON válido.");
                    return;
                }
            }

            const config: Record<string, unknown> = {};
            const parseNumber = (value?: string) => {
                if (!value) return undefined;
                const n = Number(value);
                return Number.isFinite(n) ? n : undefined;
            };
            const setIfNumber = (key: string, value?: string) => {
                const n = parseNumber(value);
                if (n !== undefined) config[key] = n;
            };

            setIfNumber('tiempo_regulacion', data.tiempo_regulacion);
            setIfNumber('tiempo_limite', data.tiempo_limite);
            setIfNumber('tiempo_posesion_segundos', data.tiempo_posesion_segundos);
            setIfNumber('cambio_campo_tiempo_min', data.cambio_campo_tiempo_min);
            setIfNumber('cambio_campo_puntos', data.cambio_campo_puntos);
            setIfNumber('puntos_para_ganar', data.puntos_para_ganar);

            if (data.puntos_por_set) {
                const parts = data.puntos_por_set.split(/[, ]+/).map(v => Number(v)).filter(v => Number.isFinite(v) && v > 0);
                if (parts.length === 1) {
                    config['puntos_por_set'] = parts[0];
                } else if (parts.length > 1) {
                    config['puntos_por_set'] = parts;
                }
            }

            setIfNumber('sets_para_ganar', data.sets_para_ganar);

            if (data.botones_puntuacion) {
                const buttons = data.botones_puntuacion
                    .split(/[, ]+/)
                    .map(v => Number(v))
                    .filter(v => Number.isFinite(v) && v > 0)
                    .sort((a, b) => a - b);
                if (buttons.length > 0) {
                    config['botones_puntuacion'] = Array.from(new Set(buttons));
                }
            }

            if (data.objetivo_nombre) {
                const objetivo: Record<string, unknown> = {
                    nombre: data.objetivo_nombre,
                };
                const max = parseNumber(data.objetivo_max);
                if (max !== undefined) objetivo.max = max;
                if (data.objetivo_icono) objetivo.icono = data.objetivo_icono;
                config['objetivos_adicionales'] = [objetivo];
            }

            if (typeof data.permite_empate === 'boolean') {
                config['permite_empate'] = data.permite_empate;
            }

            const mergedConfig = { ...config, ...configFromJson };
            const config_sugerida = Object.keys(mergedConfig).length > 0 ? mergedConfig : null;

            // Map frontend form data to backend schema
            const payload = {
                nombre: data.nombre,
                tipo_marcador: data.tipo_marcador,
                descripcion: data.descripcion,
                caracteristicas_adicionales: data.caracteristicas_adicionales || null,
                config_sugerida,
                web_url: data.web || null, // Handle optional field: send null if empty string
                email_contacto: data.email
            };

            console.log('Enviando propuesta con payload:', payload);

            const response = await fetch(buildApiUrl('/sport-proposals/'), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error("Error al enviar el formulario");
            }

            const createdProposal = await response.json();

            // Upload logo if provided
            if (logoFile && createdProposal.id) {
                const formData = new FormData();
                formData.append('file', logoFile);

                await fetch(buildApiUrl(`/sport-proposals/${createdProposal.id}/logo`), {
                    method: "POST",
                    body: formData,
                });
            }

            setIsSuccess(true);
            form.reset();
            setLogoFile(null);
            setLogoPreview(null);
        } catch (err) {
            setError("Hubo un error al enviar tu propuesta. Por favor, inténtalo de nuevo.");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-green-50/50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl text-center space-y-4 animate-in fade-in duration-500">
                <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">¡Propuesta Recibida!</h3>
                <p className="text-gray-600 dark:text-gray-300 max-w-md">
                    Gracias por contribuir a EDUmind. Hemos recibido tu propuesta de deporte y la revisaremos en breve. Te contactaremos si necesitamos más detalles.
                </p>
                <button
                    onClick={() => setIsSuccess(false)}
                    className="mt-4 px-6 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                >
                    Enviar otra propuesta
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
                {/* Nombre del Deporte */}
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-900 dark:text-gray-100">
                        Nombre del Deporte <span className="text-red-500">*</span>
                    </label>
                    <input
                        {...form.register("nombre")}
                        placeholder="Ej: Pickleball, Kin-Ball..."
                        className="flex h-10 w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-zinc-950 dark:placeholder:text-gray-400 dark:focus-visible:ring-blue-500"
                    />
                    {form.formState.errors.nombre && (
                        <p className="text-sm font-medium text-red-500 dark:text-red-400">
                            {form.formState.errors.nombre.message}
                        </p>
                    )}
                </div>

                {/* Tipo de Marcador */}
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-900 dark:text-gray-100">
                        Tipo de Marcador <span className="text-red-500">*</span>
                    </label>
                    <select
                        {...form.register("tipo_marcador")}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-zinc-950 dark:placeholder:text-gray-400 dark:focus:ring-blue-500"
                    >
                        <option value="" disabled hidden>Selecciona cómo se puntúa...</option>
                        <option value="goles">Goles (Fútbol, Balonmano, Hockey...)</option>
                        <option value="sets">Sets (Voleibol, Bádminton, Tenis...)</option>
                        <option value="puntos">Puntos (Baloncesto, Vóley playa...)</option>
                        <option value="tries">Tries/Ensayos (Rugby, Tag Rugby...)</option>
                        <option value="carreras">Carreras (Béisbol, Softball...)</option>
                    </select>
                    {form.formState.errors.tipo_marcador && (
                        <p className="text-sm font-medium text-red-500 dark:text-red-400">
                            {form.formState.errors.tipo_marcador.message}
                        </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Esto determinará la estructura básica del marcador en la app.
                    </p>
                </div>

                {/* Características Adicionales del Marcador */}
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-900 dark:text-gray-100">
                        Características Adicionales del Marcador (Opcional)
                    </label>
                    <textarea
                        {...form.register("caracteristicas_adicionales")}
                        rows={3}
                        placeholder="Ej: Sets a 27 puntos, tiempo de 5 minutos por periodo, penaltis al final..."
                        className="flex w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-zinc-950 dark:placeholder:text-gray-400 dark:focus-visible:ring-blue-500 resize-none"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Si el marcador necesita algo especial (ej: tiempos, puntos variables), descríbelo aquí.
                    </p>
                </div>

                {/* Configuración estructurada del marcador */}
                <div className="space-y-3 rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-900/10 p-4">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Configuración del marcador (opcional)</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Si rellenas estos campos, el sistema podrá automatizar el marcador sin interpretar texto libre.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Tiempo regulacion (min)</label>
                            <input
                                {...form.register("tiempo_regulacion")}
                                inputMode="numeric"
                                placeholder="Ej: 40"
                                className="flex h-9 w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Tiempo limite (min)</label>
                            <input
                                {...form.register("tiempo_limite")}
                                inputMode="numeric"
                                placeholder="Ej: 10"
                                className="flex h-9 w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Tiempo de posesion (seg)</label>
                            <input
                                {...form.register("tiempo_posesion_segundos")}
                                inputMode="numeric"
                                placeholder="Ej: 12"
                                className="flex h-9 w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Cambio de campo cada (min)</label>
                            <input
                                {...form.register("cambio_campo_tiempo_min")}
                                inputMode="numeric"
                                placeholder="Ej: 5"
                                className="flex h-9 w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Cambio de campo cada (puntos)</label>
                            <input
                                {...form.register("cambio_campo_puntos")}
                                inputMode="numeric"
                                placeholder="Ej: 7"
                                className="flex h-9 w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Puntos para ganar</label>
                            <input
                                {...form.register("puntos_para_ganar")}
                                inputMode="numeric"
                                placeholder="Ej: 21"
                                className="flex h-9 w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Puntos por set (ej: 21 o 15,15,10)</label>
                            <input
                                {...form.register("puntos_por_set")}
                                placeholder="Ej: 21 o 15,15,10"
                                className="flex h-9 w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Sets para ganar</label>
                            <input
                                {...form.register("sets_para_ganar")}
                                inputMode="numeric"
                                placeholder="Ej: 2"
                                className="flex h-9 w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Botones de puntuacion (1,2,3)</label>
                            <input
                                {...form.register("botones_puntuacion")}
                                placeholder="Ej: 1,2,3"
                                className="flex h-9 w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Objetivo adicional (nombre)</label>
                            <input
                                {...form.register("objetivo_nombre")}
                                placeholder="Ej: Conos"
                                className="flex h-9 w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Objetivo adicional (max)</label>
                            <input
                                {...form.register("objetivo_max")}
                                inputMode="numeric"
                                placeholder="Ej: 6"
                                className="flex h-9 w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Objetivo adicional (icono)</label>
                            <input
                                {...form.register("objetivo_icono")}
                                placeholder="Ej: ⚠️"
                                className="flex h-9 w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <input type="checkbox" {...form.register("permite_empate")} />
                        <span className="text-gray-700 dark:text-gray-300">Permite empate</span>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Configuracion avanzada (JSON opcional)</label>
                        <textarea
                            {...form.register("config_json")}
                            rows={3}
                            placeholder='{"tiempo_posesion_segundos":12,"botones_puntuacion":[1,2,3]}'
                            className="flex w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 resize-none"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Si rellenas JSON, se combinara con los campos anteriores y tendra prioridad.
                        </p>
                    </div>
                </div>

                {/* Logo Upload */}
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-900 dark:text-gray-100">
                        Logo del Deporte (Opcional)
                    </label>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg cursor-pointer hover:border-blue-500 transition-colors bg-gray-50 dark:bg-zinc-900">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoChange}
                                className="hidden"
                            />
                            {logoPreview ? (
                                <img src={logoPreview} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                            ) : (
                                <span className="text-3xl">📷</span>
                            )}
                        </label>
                        {logoPreview && (
                            <button
                                type="button"
                                onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                                className="text-xs text-red-500 hover:underline"
                            >
                                Quitar imagen
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Sube el logo o imagen representativa del deporte.
                    </p>
                </div>

                {/* Descripción / Reglas */}
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-900 dark:text-gray-100">
                        Explicación del Deporte y Reglas <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        {...form.register("descripcion")}
                        rows={5}
                        placeholder="Describe brevemente el deporte y las reglas específicas para el marcador (ej: tiempos, puntos por acción...)"
                        className="flex w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-zinc-950 dark:placeholder:text-gray-400 dark:focus-visible:ring-blue-500 resize-none"
                    />
                    {form.formState.errors.descripcion && (
                        <p className="text-sm font-medium text-red-500 dark:text-red-400">
                            {form.formState.errors.descripcion.message}
                        </p>
                    )}
                </div>

                {/* Email de contacto */}
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-900 dark:text-gray-100">
                        Tu Email <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="email"
                        {...form.register("email")}
                        placeholder="tu@email.com"
                        className="flex h-10 w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-zinc-950 dark:placeholder:text-gray-400 dark:focus-visible:ring-blue-500"
                    />
                    {form.formState.errors.email && (
                        <p className="text-sm font-medium text-red-500 dark:text-red-400">
                            {form.formState.errors.email.message}
                        </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Solo para notificarte cuando el deporte esté activo.
                    </p>
                </div>

                {/* Web Oficial (Opcional) */}
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-900 dark:text-gray-100">
                        Web con reglamento oficial (Opcional)
                    </label>
                    <input
                        {...form.register("web")}
                        placeholder="https://..."
                        className="flex h-10 w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-zinc-950 dark:placeholder:text-gray-400 dark:focus-visible:ring-blue-500"
                    />
                    {form.formState.errors.web && (
                        <p className="text-sm font-medium text-red-500 dark:text-red-400">
                            {form.formState.errors.web.message}
                        </p>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-zinc-950 dark:focus-visible:ring-blue-500 bg-blue-600 text-gray-50 hover:bg-blue-600/90 dark:bg-blue-500 dark:text-gray-50 dark:hover:bg-blue-500/90 h-10 px-4 py-2 w-full"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                    </>
                ) : (
                    "Enviar Propuesta"
                )}
            </button>
        </form>
    );
}
