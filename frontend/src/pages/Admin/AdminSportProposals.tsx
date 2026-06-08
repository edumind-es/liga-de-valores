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

import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/api/client";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Navigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, AlertCircle, Plus } from "lucide-react";
import { getImageUrl } from "@/utils/url";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/workspace/MetricCard";
import { ListToolbar } from "@/components/workspace/ListToolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SportProposal {
    id: number;
    nombre: string;
    tipo_marcador: string;
    descripcion: string;
    caracteristicas_adicionales?: string;
    config_sugerida?: Record<string, unknown> | null;
    web_url: string | null;
    email_contacto: string;
    logo_filename?: string;
    status: string;
    created_at: string;
}

export default function AdminSportProposals() {
    const { user, isLoading: authLoading } = useAuthStore();
    const [proposals, setProposals] = useState<SportProposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null); // ID of proposal being updated

    const [selectedProposal, setSelectedProposal] = useState<SportProposal | null>(null);
    const [integrationProposal, setIntegrationProposal] = useState<SportProposal | null>(null);
    const [integrationForm, setIntegrationForm] = useState({
        codigo: '',
        tipo_marcador: 'goles',
        icono: '',
        permite_empate: true,
        config: '{}'
    });
    const [integrationLoading, setIntegrationLoading] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    useEffect(() => {
        if (user?.is_superuser) {
            fetchProposals();
        }
    }, [user]);

    const fetchProposals = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getSportProposals();
            setProposals(data);
        } catch (err) {
            console.error("Error fetching proposals:", err);
            setError("Error al cargar las propuestas.");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: number, newStatus: string) => {
        try {
            setActionLoading(id);
            await apiClient.updateSportProposalStatus(id, newStatus);
            // Update local state
            setProposals(current =>
                current.map(p =>
                    p.id === id ? { ...p, status: newStatus } : p
                )
            );
        } catch (err) {
            console.error("Error updating status:", err);
            alert("Error al actualizar el estado");
        } finally {
            setActionLoading(null);
        }
    };

    const handleMailTo = (proposal: SportProposal) => {
        const subject = encodeURIComponent(`Sobre tu propuesta de deporte: ${proposal.nombre}`);
        const body = encodeURIComponent(`Hola,\n\nQueríamos agradecerte tu propuesta para añadir "${proposal.nombre}" a Liga EDUmind.\n\n[Escribe aquí tu mensaje...]\n\nUn saludo,\nEl equipo de EDUmind.`);
        window.open(`mailto:${proposal.email_contacto}?subject=${subject}&body=${body}`, '_blank');
    };

    const generateConfigFromProposal = (proposal: SportProposal) => {
        const baseConfig = proposal.config_sugerida && typeof proposal.config_sugerida === 'object'
            ? proposal.config_sugerida
            : {};
        const config: Record<string, unknown> = { ...baseConfig };
        const text = (proposal.descripcion + " " + (proposal.caracteristicas_adicionales || "")).toLowerCase();

        // Composite patterns (tiempos/periodos/cuarto)
        const tiemposMatch = text.match(/(\d+)\s*(?:tiempos|periodos)\s*(?:de)?\s*(\d+)\s*(?:min|minutos)/i);
        if (tiemposMatch && !config['tiempos']) {
            const tiempos = parseInt(tiemposMatch[1]);
            const minutos = parseInt(tiemposMatch[2]);
            if (Number.isFinite(tiempos)) config['tiempos'] = tiempos;
            if (Number.isFinite(minutos) && !config['duracion_tiempo_min']) {
                config['duracion_tiempo_min'] = minutos;
            }
        }

        const cuartosMatch = text.match(/(\d+)\s*cuartos?\s*(?:de)?\s*(\d+)\s*(?:min|minutos)/i);
        if (cuartosMatch && !config['cuartos']) {
            const cuartos = parseInt(cuartosMatch[1]);
            const minutos = parseInt(cuartosMatch[2]);
            if (Number.isFinite(cuartos)) config['cuartos'] = cuartos;
            if (Number.isFinite(minutos) && !config['duracion_cuarto']) {
                config['duracion_cuarto'] = minutos;
            }
        }

        const totalMatch = text.match(/(?:duraci[oó]n|tiempo)(?:\s+total|\s+de juego|\s+del partido)?\s*(\d+)\s*(?:min|minutos)/i);
        if (totalMatch && !config['tiempo_limite'] && !config['tiempo_regulacion']) {
            const minutos = parseInt(totalMatch[1]);
            if (Number.isFinite(minutos)) config['tiempo_limite'] = minutos;
        }

        // Regex patterns
        const patterns = [
            { regex: /cambio de campo(?: cada)? (\d+) (?:puntos|tantos)/i, key: 'cambio_campo_puntos', type: 'int' },
            { regex: /cambio de campo(?: cada)? (\d+) (?:min|minutos)/i, key: 'cambio_campo_tiempo_min', type: 'int' },
            { regex: /posesi[oó]n (?:de )?(\d+) (?:s|segundos)/i, key: 'tiempo_posesion_segundos', type: 'int' },
            { regex: /reloj de posesión (?:de )?(\d+) (?:s|segundos)/i, key: 'tiempo_posesion_segundos', type: 'int' },
            { regex: /(?:a|de|ganar con) (\d+) (?:puntos|tantos)/i, key: 'puntos_para_ganar', type: 'int' },
            { regex: /sets (?:a|de) (\d+)/i, key: 'puntos_por_set', type: 'int' },
            { regex: /mejor (?:de )?(\d+) sets/i, key: 'sets_para_ganar', type: 'int', transform: (n: number) => Math.ceil(n / 2) },
            { regex: /(\d+) tiempos/i, key: 'tiempos', type: 'int' },
            { regex: /tiempo (?:de )?(\d+) min/i, key: 'duracion_minutos', type: 'int' },
            // Advanced Rules
            { regex: /(?:cambio de )?saque (?:cada )?(\d+) (?:puntos|tantos)/i, key: 'cambio_saque_puntos', type: 'int' },
        ];

        patterns.forEach(p => {
            const match = text.match(p.regex);
            if (match && match[1]) {
                let val = parseInt(match[1]);
                if (p.transform) val = p.transform(val);
                if (config[p.key] === undefined) {
                    config[p.key] = val;
                }
            }
        });

        // Heuristic: If we are in "sets" mode but didn't find specific points per set, check for "a X puntos" generic and use it
        if (proposal.tipo_marcador === 'sets' && !config['puntos_por_set'] && config['puntos_para_ganar']) {
            config['puntos_por_set'] = config['puntos_para_ganar'];
            delete config['puntos_para_ganar']; // Clean up
        }

        // Twincon Heuristic
        if (proposal.nombre.toLowerCase().includes('twincon')) {
            if (!config['botones_puntuacion']) {
                config['botones_puntuacion'] = [1, 2];
            }
            if (!config['objetivos_adicionales']) {
                config['objetivos_adicionales'] = [{
                    nombre: 'Conos',
                    icono: '⚠️',
                    max: 5, // Default for 2 cones per team + extras
                    victoria_al_completar: false
                }];
            }
        }

        // Detect Generic Objectives (Conos, Bases, etc.)
        // Enhanced regex to match "un cono" or digits
        const objMatch = text.match(/derribar (?:(\d+)|un) (?:conos|cono|elementos)/i) ||
            text.match(/capturar (?:(\d+)|una) (?:banderas|bandera|bases)/i) ||
            text.match(/defiende (?:(\d+)|un) (?:conos|cono)/i);

        if (objMatch && !config['objetivos_adicionales']) {
            const countStr = objMatch[1];
            const count = countStr ? parseInt(countStr) : 1; // If no digit (undefined), it matched "un/una" -> 1
            const type = text.includes('cono') ? 'Conos' : (text.includes('bandera') ? 'Banderas' : 'Objetivos');
            const icon = text.includes('cono') ? '⚠️' : '🚩';

            config['objetivos_adicionales'] = [{
                nombre: type,
                max: Math.max(count, 5), // Heuristic: If they mention X cones, give them a few more in UI just in case
                icono: icon,
                victoria_al_completar: true
            }];
        }

        // Detect dynamic scoring buttons (e.g. Strabol: 1, 2, 3 points)
        // Heuristic: Check description OR name for "Strabol"
        if (text.includes('3 puntos') || text.includes('tres puntos') || proposal.nombre.toLowerCase().includes('strabol')) {
            if (!config['botones_puntuacion']) {
                config['botones_puntuacion'] = [1, 2, 3];
            }
            // Strabol defaults if not found in text
            if (!config['puntos_por_set']) config['puntos_por_set'] = 11;
            if (!config['puntos_para_ganar']) config['puntos_para_ganar'] = 11;
        } else if (text.includes('2 puntos') || text.includes('dos puntos')) {
            // Only add if explicit mention of 2 points scoring but NO sets mentioned (usually implies simple accumulator)
            if (!text.includes('sets')) {
                if (!config['botones_puntuacion']) {
                    config['botones_puntuacion'] = [1, 2];
                }
            }
        }

        // Name traversal for TowerTouchball/Cones if description failed
        if (!config['objetivos_adicionales'] && (proposal.nombre.toLowerCase().includes('tower') || proposal.nombre.toLowerCase().includes('touchball'))) {
            config['objetivos_adicionales'] = [{
                nombre: 'Conos',
                max: 5,
                icono: '⚠️',
                victoria_al_completar: true
            }];
        }

        // Variable Sets Logic (Bottlebol: 15, 15, 10)
        // Heuristic: If we detected 'puntos_por_set' via regex (e.g. 15), but text mentions "tercer set a 10" or "desempate a 10"
        if (config['puntos_por_set'] && (text.includes('tercer set a 10') || text.includes('desempate a 10'))) {
            const basePoints = config['puntos_por_set'] as number;
            // Create array: [15, 15, 10] assuming best of 3
            config['puntos_por_set'] = [basePoints, basePoints, 10];
        }

        // Visual identity: assign a deterministic palette if none specified
        if (!config['layout_palette']) {
            const palettes = [
                { accent: '#f97316', background: 'linear-gradient(135deg, rgba(249,115,22,0.14), rgba(14,165,233,0.08))', border: 'rgba(249,115,22,0.3)' },
                { accent: '#22c55e', background: 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(59,130,246,0.08))', border: 'rgba(34,197,94,0.3)' },
                { accent: '#a855f7', background: 'linear-gradient(135deg, rgba(168,85,247,0.14), rgba(236,72,153,0.08))', border: 'rgba(168,85,247,0.3)' },
                { accent: '#0ea5e9', background: 'linear-gradient(135deg, rgba(14,165,233,0.14), rgba(94,234,212,0.08))', border: 'rgba(14,165,233,0.3)' },
                { accent: '#eab308', background: 'linear-gradient(135deg, rgba(234,179,8,0.14), rgba(249,115,22,0.08))', border: 'rgba(234,179,8,0.3)' },
            ];
            const hash = proposal.nombre.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
            config['layout_palette'] = palettes[hash % palettes.length];
        }

        // Default empty config if nothing found, instead of forcing 21 points
        if (Object.keys(config).length === 0) {
            // If manual fallback is needed, we can just leave it empty or provide a very basic one based on type
            if (proposal.tipo_marcador === 'sets') {
                config['puntos_por_set'] = 21; // Standard volley default
            } else if (proposal.tipo_marcador === 'goles') {
                // No config needed usually
            } else {
                config['puntos_para_ganar'] = 0; // Let user decide
            }
        }

        return JSON.stringify(config, null, 2);
    };

    const openIntegration = (proposal: SportProposal) => {
        setIntegrationProposal(proposal);
        const suggestedConfig = generateConfigFromProposal(proposal);
        const permiteEmpateFromConfig =
                proposal.config_sugerida && typeof proposal.config_sugerida === 'object'
                    ? (proposal.config_sugerida as Record<string, unknown>).permite_empate
                    : undefined;

        setIntegrationForm({
            codigo: proposal.nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
            tipo_marcador: proposal.tipo_marcador || 'goles',
            icono: '🏆',
            permite_empate: typeof permiteEmpateFromConfig === 'boolean' ? permiteEmpateFromConfig : true,
            config: suggestedConfig !== '{}' ? suggestedConfig : (
                proposal.tipo_marcador === 'sets' ? '{\n  "puntos_por_set": 21\n}' :
                    proposal.tipo_marcador === 'puntos' ? '{\n  "puntos_para_ganar": 0\n}' :
                        '{}'
            )
        });
    };

    const handleIntegration = async () => {
        if (!integrationProposal) return;
        setIntegrationLoading(true);
        try {
            let parsedConfig = {};
            try { parsedConfig = JSON.parse(integrationForm.config); } catch { parsedConfig = {}; }

            await apiClient.createSportType({
                nombre: integrationProposal.nombre,
                codigo: integrationForm.codigo,
                tipo_marcador: integrationForm.tipo_marcador,
                permite_empate: integrationForm.permite_empate,
                config: parsedConfig,
                descripcion: integrationProposal.descripcion,
                icono: integrationForm.icono
            });
            alert(`¡Deporte "${integrationProposal.nombre}" añadido al catálogo!`);
            setIntegrationProposal(null);
        } catch (err: unknown) {
            console.error("Error integrating sport:", err);
            const detail = isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
                ? (err.response.data as { detail?: string }).detail
                : undefined;
            alert(detail || "Error al integrar el deporte");
        } finally {
            setIntegrationLoading(false);
        }
    };

    if (authLoading) return <div className="p-8">Cargando...</div>;

    // Secure the route
    if (!user || !user.is_superuser) {
        return <Navigate to="/dashboard" />;
    }

    const filteredProposals = proposals.filter((proposal) => {
        const matchesSearch = [proposal.nombre, proposal.tipo_marcador, proposal.email_contacto, proposal.web_url || '']
            .join(' ')
            .toLowerCase()
            .includes(searchValue.trim().toLowerCase());
        const matchesStatus = statusFilter === 'all' || proposal.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const pendingCount = proposals.filter((proposal) => proposal.status === 'pending').length;
    const approvedCount = proposals.filter((proposal) => proposal.status === 'approved').length;
    const rejectedCount = proposals.filter((proposal) => proposal.status === 'rejected').length;

    const getStatusBadge = (status: string) => {
        const variants = {
            pending: "warning",
            approved: "success",
            rejected: "destructive",
        } as const;
        const labels = {
            pending: "Pendiente",
            approved: "Aprobada",
            rejected: "Rechazada",
        };
        return (
            <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
                {labels[status as keyof typeof labels] || status}
            </Badge>
        );
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <PageHeader
                    title="Administración de Propuestas"
                    description="Revisa nuevas ideas de deportes, prioriza su estado y acelera la integración en el catálogo oficial."
                    eyebrow="Administración global"
                >
                    <Button variant="outline" size="sm" onClick={fetchProposals}>
                        Refrescar
                    </Button>
                </PageHeader>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Propuestas"
                        value={proposals.length}
                        support="Recibidas por la plataforma"
                        icon={Plus}
                        tone="mint"
                    />
                    <MetricCard
                        label="Pendientes"
                        value={pendingCount}
                        support="Requieren revisión"
                        icon={AlertCircle}
                        tone="amber"
                    />
                    <MetricCard
                        label="Aprobadas"
                        value={approvedCount}
                        support="Listas para integrar"
                        icon={CheckCircle}
                        tone="sky"
                    />
                    <MetricCard
                        label="Rechazadas"
                        value={rejectedCount}
                        support="Cerradas o descartadas"
                        icon={XCircle}
                        tone="rose"
                    />
                </div>

                {error && (
                    <Card className="border-red-500/30 bg-red-500/10">
                        <CardContent className="flex items-center gap-2 p-4 text-red-200">
                            <AlertCircle className="h-5 w-5" />
                            {error}
                        </CardContent>
                    </Card>
                )}

                <ListToolbar
                    searchValue={searchValue}
                    onSearchChange={setSearchValue}
                    searchPlaceholder="Buscar por nombre, contacto o marcador"
                    summary={`Mostrando ${filteredProposals.length} de ${proposals.length} propuestas.`}
                >
                    <Button
                        variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setStatusFilter('all')}
                    >
                        Todas
                    </Button>
                    <Button
                        variant={statusFilter === 'pending' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setStatusFilter('pending')}
                    >
                        Pendientes
                    </Button>
                    <Button
                        variant={statusFilter === 'approved' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setStatusFilter('approved')}
                    >
                        Aprobadas
                    </Button>
                    <Button
                        variant={statusFilter === 'rejected' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setStatusFilter('rejected')}
                    >
                        Rechazadas
                    </Button>
                </ListToolbar>

                <Card className="border-lme-border/90 bg-[rgba(10,20,38,0.72)] shadow-[0_18px_40px_rgba(3,10,28,0.18)]">
                    <CardHeader className="border-b border-lme-border/70">
                        <CardTitle>Pipeline de revisión</CardTitle>
                        <CardDescription>
                            Gestiona el ciclo completo: lectura, aprobación, rechazo o integración al catálogo.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[rgba(255,255,255,0.04)] text-xs uppercase text-sub">
                                <tr>
                                    <th className="px-6 py-3">Deporte</th>
                                    <th className="px-6 py-3">Marcador</th>
                                    <th className="px-6 py-3">Contacto</th>
                                    <th className="px-6 py-3">Estado</th>
                                    <th className="px-6 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-sub">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                            Cargando propuestas...
                                        </td>
                                    </tr>
                                ) : proposals.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-sub">
                                            No hay propuestas registradas.
                                        </td>
                                    </tr>
                                ) : filteredProposals.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-sub">
                                            No hay propuestas que coincidan con los filtros actuales.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProposals.map((proposal) => (
                                        <tr key={proposal.id} className="border-b border-lme-border/70 hover:bg-white/5">
                                            <td className="px-6 py-4 font-medium text-ink">
                                                <div className="flex flex-col">
                                                    <span className="text-base">{proposal.nombre}</span>
                                                    <span className="text-xs text-sub">{new Date(proposal.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sub">{proposal.tipo_marcador}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <button
                                                        onClick={() => handleMailTo(proposal)}
                                                        className="text-sky hover:underline text-xs flex items-center gap-1 w-fit"
                                                        title="Enviar email de agradecimiento"
                                                    >
                                                        ✉️ {proposal.email_contacto}
                                                    </button>
                                                    {proposal.web_url && (
                                                        <a href={proposal.web_url} target="_blank" rel="noopener noreferrer" className="text-xs text-sky hover:underline w-fit">
                                                            🌐 Ver Web
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(proposal.status)}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => setSelectedProposal(proposal)}
                                                    className="inline-flex items-center justify-center p-2 text-gray-600 hover:bg-gray-100 rounded-md dark:text-gray-400 dark:hover:bg-zinc-800"
                                                    title="Ver Detalle Completo"
                                                >
                                                    👁️
                                                </button>
                                                {proposal.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleStatusUpdate(proposal.id, 'approved')}
                                                            disabled={actionLoading === proposal.id}
                                                            className="inline-flex items-center justify-center p-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50"
                                                            title="Aprobar"
                                                        >
                                                            {actionLoading === proposal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(proposal.id, 'rejected')}
                                                            disabled={actionLoading === proposal.id}
                                                            className="inline-flex items-center justify-center p-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50"
                                                            title="Rechazar"
                                                        >
                                                            {actionLoading === proposal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                                        </button>
                                                    </>
                                                )}
                                                {proposal.status === 'approved' && (
                                                    <button
                                                        onClick={() => openIntegration(proposal)}
                                                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 text-xs font-medium"
                                                        title="Integrar como Deporte Oficial"
                                                    >
                                                        <Plus className="h-3 w-3" /> Integrar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    </CardContent>
                </Card>

                {/* Proposal Details Modal */}
                {selectedProposal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-lg w-full p-6 relative">
                            <button
                                onClick={() => setSelectedProposal(null)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <XCircle className="h-6 w-6" />
                            </button>

                            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Detalles de la Propuesta</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase">Deporte</label>
                                    <p className="text-gray-900 dark:text-white">{selectedProposal.nombre}</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase">Descripción</label>
                                    <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-md text-sm text-gray-700 dark:text-gray-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                                        {selectedProposal.descripcion}
                                    </div>
                                </div>

                                {selectedProposal.caracteristicas_adicionales && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase">Características del Marcador</label>
                                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto whitespace-pre-wrap">
                                            {selectedProposal.caracteristicas_adicionales}
                                        </div>
                                    </div>
                                )}

                                {selectedProposal.config_sugerida && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase">Configuración sugerida</label>
                                        <pre className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-xs text-gray-700 dark:text-gray-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                                            {JSON.stringify(selectedProposal.config_sugerida, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase">Marcador</label>
                                        <p className="text-gray-900 dark:text-white">{selectedProposal.tipo_marcador}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase">Estado</label>
                                        <div className="mt-1">{getStatusBadge(selectedProposal.status)}</div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase">Contacto</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <button
                                            onClick={() => handleMailTo(selectedProposal)}
                                            className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                                        >
                                            ✉️ {selectedProposal.email_contacto} (Agradecer)
                                        </button>
                                    </div>
                                    {selectedProposal.web_url && (
                                        <div className="mt-1">
                                            <a href={selectedProposal.web_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">
                                                🌐 {selectedProposal.web_url}
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {selectedProposal.logo_filename && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase">Logo Propuesto</label>
                                        <div className="mt-2 text-center p-4 bg-gray-50 dark:bg-zinc-800 rounded-md">
                                            <img
                                                src={getImageUrl(`/static/uploads/${selectedProposal.logo_filename}`)}
                                                alt="Logo Propuesto"
                                                className="max-h-32 mx-auto object-contain"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                            <p className="text-xs text-gray-400 mt-2 break-all">
                                                {selectedProposal.logo_filename}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="text-xs text-gray-400 pt-4 border-t dark:border-zinc-800">
                                    Enviado el {new Date(selectedProposal.created_at).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Integration Modal */}
                {integrationProposal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full p-6 relative">
                            <button
                                onClick={() => setIntegrationProposal(null)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <XCircle className="h-6 w-6" />
                            </button>

                            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Integrar: {integrationProposal.nombre}</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Código (único)</label>
                                    <input
                                        type="text"
                                        value={integrationForm.codigo}
                                        onChange={(e) => setIntegrationForm(f => ({ ...f, codigo: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                                        placeholder="ej: pinfuvote"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tipo de Marcador</label>
                                    <select
                                        value={integrationForm.tipo_marcador}
                                        onChange={(e) => setIntegrationForm(f => ({ ...f, tipo_marcador: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                                    >
                                        <option value="goles">Goles (Fútbol, Balonmano)</option>
                                        <option value="puntos">Puntos (Baloncesto, Badminton)</option>
                                        <option value="sets">Sets (Voleibol, Tenis)</option>
                                        <option value="tries">Tries (Rugby)</option>
                                        <option value="carreras">Carreras (Béisbol)</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Icono</label>
                                        <input
                                            type="text"
                                            value={integrationForm.icono}
                                            onChange={(e) => setIntegrationForm(f => ({ ...f, icono: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-center text-2xl"
                                            placeholder="🏆"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                            <input
                                                type="checkbox"
                                                checked={integrationForm.permite_empate}
                                                onChange={(e) => setIntegrationForm(f => ({ ...f, permite_empate: e.target.checked }))}
                                                className="rounded"
                                            />
                                            Permite empate
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Config (JSON)</label>
                                    <textarea
                                        value={integrationForm.config}
                                        onChange={(e) => setIntegrationForm(f => ({ ...f, config: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white font-mono text-xs"
                                        rows={3}
                                        placeholder='{"sets_para_ganar": 2}'
                                    />
                                </div>

                                <button
                                    onClick={handleIntegration}
                                    disabled={integrationLoading || !integrationForm.codigo}
                                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {integrationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    Añadir al Catálogo de Deportes
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout >
    );
}
