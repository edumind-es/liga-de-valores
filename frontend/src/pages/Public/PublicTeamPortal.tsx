/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * Team Portal - Public access for students to join teams with roles and commitments
 * Separate tabs for Contract signing and Logo design
 */

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, FileText, Loader2, Palette, Send, Shield, Sparkles, Users } from 'lucide-react';
import { teamAccessApi, type TeamPublicInfo } from '@/api/teamAccess';
import PublicEditorialShell from '@/components/layout/PublicEditorialShell';
import LogoDesigner from '@/components/LogoDesigner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

function teamPortalDateCards(teamInfo: TeamPublicInfo | null, selectedRol: string, commitmentsCount: number) {
    return [
        {
            label: 'Roles disponibles',
            value: teamInfo?.roles.length ?? 0,
            support: 'Opciones de participación',
            icon: Users,
        },
        {
            label: 'Rol seleccionado',
            value: selectedRol || 'Pendiente',
            support: selectedRol ? 'Listo para firmar' : 'Elige un rol',
            icon: Shield,
        },
        {
            label: 'Compromisos',
            value: commitmentsCount,
            support: selectedRol ? 'Para este rol' : 'Se activan al elegir rol',
            icon: FileText,
        },
        {
            label: 'Logo colaborativo',
            value: teamInfo?.allow_logo_editing ? 'Sí' : 'No',
            support: teamInfo?.allow_logo_editing ? 'Propuesta abierta' : 'Solo contrato',
            icon: Palette,
        },
    ];
}

export default function PublicTeamPortal() {
    const { token } = useParams<{ token: string }>();
    const [teamInfo, setTeamInfo] = useState<TeamPublicInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [nombre, setNombre] = useState('');
    const [selectedRol, setSelectedRol] = useState('');
    const [acceptedCommitments, setAcceptedCommitments] = useState<string[]>([]);

    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    const [isSubmittingLogo, setIsSubmittingLogo] = useState(false);
    const [logoSuccess, setLogoSuccess] = useState(false);

    useEffect(() => {
        if (token) {
            void loadTeamInfo(token);
        }
    }, [token]);

    const loadTeamInfo = async (teamToken: string) => {
        try {
            const info = await teamAccessApi.getTeamByToken(teamToken);
            setTeamInfo(info);
        } catch {
            setError('No se encontró el equipo. Verifica el enlace.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoleChange = (rol: string) => {
        setSelectedRol(rol);
        setAcceptedCommitments([]);
    };

    const handleCommitmentToggle = (commitment: string) => {
        setAcceptedCommitments((current) =>
            current.includes(commitment)
                ? current.filter((item) => item !== commitment)
                : [...current, commitment],
        );
    };

    const currentCommitments = useMemo(() => {
        if (!teamInfo || !selectedRol) return [];
        return teamInfo.commitments[selectedRol] || [];
    }, [selectedRol, teamInfo]);

    const allCommitmentsAccepted = currentCommitments.length > 0 &&
        currentCommitments.every((commitment) => acceptedCommitments.includes(commitment));

    const statItems = teamPortalDateCards(teamInfo, selectedRol, currentCommitments.length);

    const handleSubmitContract = async (event: FormEvent) => {
        event.preventDefault();
        if (!token || !nombre.trim() || !selectedRol || !allCommitmentsAccepted) {
            toast.error('Por favor, completa todos los campos y acepta los compromisos');
            return;
        }

        setIsSubmitting(true);
        try {
            await teamAccessApi.joinTeam(token, nombre, selectedRol, acceptedCommitments, null);
            setIsSuccess(true);
            toast.success('¡Contrato enviado correctamente!');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al enviar contrato');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitLogo = async () => {
        if (!token || !logoDataUrl) {
            toast.error('Crea un logo antes de enviarlo');
            return;
        }

        setIsSubmittingLogo(true);
        try {
            await teamAccessApi.submitLogoProposal(token, logoDataUrl);
            setLogoSuccess(true);
            toast.success('¡Propuesta de logo enviada!');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al enviar logo');
        } finally {
            setIsSubmittingLogo(false);
        }
    };

    if (isLoading) {
        return (
            <PublicEditorialShell
                title="Portal del equipo"
                eyebrow="Acceso alumnado"
                description="Estamos preparando el espacio seguro del equipo."
            >
                <Card variant="editorial" className="editorial-card mx-auto w-full max-w-4xl">
                    <CardContent className="space-y-4 p-8">
                        <Skeleton className="mx-auto h-8 w-3/4" />
                        <Skeleton className="mx-auto h-4 w-1/2" />
                        <Skeleton className="h-32 w-full" />
                    </CardContent>
                </Card>
            </PublicEditorialShell>
        );
    }

    if (error) {
        return (
            <PublicEditorialShell
                title="Portal del equipo"
                eyebrow="Acceso alumnado"
                description="No hemos podido validar este enlace del equipo."
            >
                <Card variant="editorial" className="editorial-card mx-auto w-full max-w-2xl border-red-300 bg-red-50/80">
                    <CardContent className="p-8 text-center">
                        <Shield className="mx-auto mb-4 h-16 w-16 text-red-500" />
                        <h2 className="mb-2 text-xl font-bold text-red-900">Acceso no disponible</h2>
                        <p className="text-red-800">{error}</p>
                    </CardContent>
                </Card>
            </PublicEditorialShell>
        );
    }

    return (
        <PublicEditorialShell
            title={teamInfo?.equipo_nombre || 'Portal del equipo'}
            eyebrow="Acceso alumnado"
            description={
                teamInfo
                    ? `Liga ${teamInfo.liga_nombre}. Firma tu compromiso y, si está habilitado, propone un logo para el equipo.`
                    : 'Espacio seguro para formalizar compromiso y colaboración del equipo.'
            }
        >
            <div className="mx-auto max-w-5xl space-y-6">
                <Card variant="editorial" className="editorial-card overflow-hidden">
                    <CardHeader className="border-b border-[var(--editorial-border)]">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-4">
                                <div
                                    className="flex h-20 w-20 items-center justify-center rounded-3xl text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                                    style={{ backgroundColor: teamInfo?.equipo_color || '#3B82F6' }}
                                >
                                    <Users className="h-10 w-10" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline" className="border-[#a8bfdf] bg-[#edf4ff] text-[#254372]">
                                            {teamInfo?.liga_nombre}
                                        </Badge>
                                        {teamInfo?.allow_logo_editing && (
                                            <Badge variant="outline" className="border-[#d8c9aa] bg-[#f7efe1] text-[#8b611f]">
                                                Logo colaborativo activo
                                            </Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-3xl text-[var(--editorial-ink)]">
                                        {teamInfo?.equipo_nombre}
                                    </CardTitle>
                                    <CardDescription className="max-w-2xl text-[var(--editorial-muted)]">
                                        Elige tu rol, acepta tus compromisos y deja registrada tu participación de forma clara y segura.
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-[var(--editorial-border)] bg-[var(--editorial-highlight)] px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--editorial-muted)]">
                                    Equipo
                                </p>
                                <p className="mt-1 text-lg font-bold text-[var(--editorial-ink)]">
                                    {teamInfo?.equipo_nombre}
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 pt-6 md:grid-cols-2 xl:grid-cols-4">
                        {statItems.map((item) => (
                            <div
                                key={item.label}
                                className="rounded-xl border border-[var(--editorial-border)] bg-[color-mix(in_srgb,var(--editorial-card)_88%,white_12%)] p-4"
                            >
                                <p className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--editorial-muted)]">
                                    <span>{item.label}</span>
                                    <item.icon className="h-4 w-4 text-[#3b659d]" aria-hidden="true" />
                                </p>
                                <p className="mt-2 text-2xl font-bold text-[var(--editorial-ink)]">{item.value}</p>
                                <p className="mt-1 text-xs text-[var(--editorial-muted)]">{item.support}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Tabs defaultValue="contract" className="w-full space-y-4">
                    <TabsList
                        variant="editorial"
                        className={`grid h-auto w-full ${teamInfo?.allow_logo_editing ? 'grid-cols-2' : 'grid-cols-1'} gap-2 rounded-xl`}
                    >
                        <TabsTrigger variant="editorial" value="contract" className="min-h-[2.75rem] gap-2">
                            <FileText className="h-4 w-4" />
                            Contrato
                        </TabsTrigger>
                        {teamInfo?.allow_logo_editing && (
                            <TabsTrigger variant="editorial" value="logo" className="min-h-[2.75rem] gap-2">
                                <Palette className="h-4 w-4" />
                                Logo
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="contract" className="space-y-4">
                        {isSuccess ? (
                            <Card variant="editorial" className="editorial-card border-green-300 bg-green-50/80">
                                <CardContent className="p-8 text-center">
                                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
                                        <CheckCircle2 className="h-10 w-10 text-green-500" />
                                    </div>
                                    <h2 className="mb-2 text-2xl font-bold text-green-900">¡Contrato enviado!</h2>
                                    <p className="mb-4 text-green-800">
                                        Tu contrato de compromiso ha sido enviado al profesorado.
                                    </p>
                                    <div className="space-y-2 rounded-lg border border-[var(--editorial-border)] bg-[var(--editorial-highlight)] p-4 text-left text-[var(--editorial-ink)]">
                                        <p><strong>Equipo:</strong> {teamInfo?.equipo_nombre}</p>
                                        <p><strong>Rol:</strong> {selectedRol}</p>
                                        <p><strong>Participante:</strong> {nombre}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                                <Card variant="editorial" className="editorial-card">
                                    <CardHeader>
                                        <CardTitle className="text-[var(--editorial-ink)]">Firmar compromiso</CardTitle>
                                        <CardDescription className="text-[var(--editorial-muted)]">
                                            Completa tu identificación, elige tu rol y acepta los compromisos que asumes dentro del equipo.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <form onSubmit={handleSubmitContract} className="space-y-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="nombre">Tu nombre</Label>
                                                <Input
                                                    variant="editorial"
                                                    id="nombre"
                                                    placeholder="Escribe tu nombre completo"
                                                    value={nombre}
                                                    onChange={(event) => setNombre(event.target.value)}
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Selecciona tu rol</Label>
                                                <Select value={selectedRol} onValueChange={handleRoleChange}>
                                                    <SelectTrigger variant="editorial">
                                                        <SelectValue placeholder="Elige un rol..." />
                                                    </SelectTrigger>
                                                    <SelectContent variant="editorial">
                                                        {teamInfo?.roles.map((rol) => (
                                                            <SelectItem key={rol} value={rol}>
                                                                {rol}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {selectedRol && (
                                                <div className="space-y-3 rounded-2xl border border-[var(--editorial-border)] bg-[var(--editorial-highlight)] p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <div>
                                                        <Label>Compromisos como {selectedRol}</Label>
                                                        <p className="mt-1 text-xs text-[var(--editorial-muted)]">
                                                            Debes marcar todos los compromisos para continuar.
                                                        </p>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {currentCommitments.map((commitment) => (
                                                            <div key={commitment} className="flex items-start space-x-3">
                                                                <Checkbox
                                                                    id={commitment}
                                                                    checked={acceptedCommitments.includes(commitment)}
                                                                    onCheckedChange={() => handleCommitmentToggle(commitment)}
                                                                    className="mt-0.5"
                                                                />
                                                                <label
                                                                    htmlFor={commitment}
                                                                    className="cursor-pointer text-sm leading-relaxed text-[var(--editorial-ink)]"
                                                                >
                                                                    {commitment}
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <Button
                                                type="submit"
                                                className="w-full"
                                                disabled={!nombre.trim() || !selectedRol || !allCommitmentsAccepted || isSubmitting}
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Enviando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="mr-2 h-4 w-4" />
                                                        Firmar y enviar contrato
                                                    </>
                                                )}
                                            </Button>

                                            <p className="text-center text-xs text-[var(--editorial-muted)]">
                                                Tu información se enviará directamente al profesorado. No almacenamos datos personales fuera del flujo del equipo.
                                            </p>
                                        </form>
                                    </CardContent>
                                </Card>

                                <Card variant="editorial" className="editorial-card">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-[var(--editorial-ink)]">
                                            <Sparkles className="h-5 w-5 text-[#3b659d]" />
                                            Antes de enviar
                                        </CardTitle>
                                        <CardDescription className="text-[var(--editorial-muted)]">
                                            Esto ayuda a que el compromiso del equipo quede claro y usable por el profesorado.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="rounded-2xl border border-[var(--editorial-border)] bg-[var(--editorial-highlight)] p-4">
                                            <p className="font-semibold text-[var(--editorial-ink)]">Qué vas a registrar</p>
                                            <ul className="mt-2 space-y-2 text-sm text-[var(--editorial-muted)]">
                                                <li>Tu nombre dentro del equipo.</li>
                                                <li>El rol que quieres asumir.</li>
                                                <li>La aceptación explícita de tus compromisos.</li>
                                            </ul>
                                        </div>
                                        <div className="rounded-2xl border border-[var(--editorial-border)] bg-[var(--editorial-card)] p-4">
                                            <p className="font-semibold text-[var(--editorial-ink)]">Revisión rápida</p>
                                            <div className="mt-3 space-y-2 text-sm text-[var(--editorial-muted)]">
                                                <p><strong className="text-[var(--editorial-ink)]">Participante:</strong> {nombre || 'Pendiente'}</p>
                                                <p><strong className="text-[var(--editorial-ink)]">Rol:</strong> {selectedRol || 'Pendiente'}</p>
                                                <p><strong className="text-[var(--editorial-ink)]">Compromisos:</strong> {acceptedCommitments.length}/{currentCommitments.length || 0}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </TabsContent>

                    {teamInfo?.allow_logo_editing && (
                        <TabsContent value="logo" className="space-y-4">
                            {logoSuccess ? (
                                <Card variant="editorial" className="editorial-card border-green-300 bg-green-50/80">
                                    <CardContent className="p-8 text-center">
                                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
                                            <CheckCircle2 className="h-10 w-10 text-green-500" />
                                        </div>
                                        <h2 className="mb-2 text-2xl font-bold text-green-900">¡Logo enviado!</h2>
                                        <p className="text-green-800">
                                            Tu propuesta de logo ha sido enviada al profesorado para su revisión.
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <>
                                    <Card variant="editorial" className="editorial-card">
                                        <CardHeader>
                                            <CardTitle className="text-[var(--editorial-ink)]">Diseñar propuesta visual</CardTitle>
                                            <CardDescription className="text-[var(--editorial-muted)]">
                                                Crea un logo sencillo para representar al equipo y envíalo para revisión.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <LogoDesigner
                                                teamName={teamInfo?.equipo_nombre || ''}
                                                teamColor={teamInfo?.equipo_color || '#3B82F6'}
                                                onLogoGenerated={setLogoDataUrl}
                                            />
                                        </CardContent>
                                    </Card>

                                    <Card variant="editorial" className="editorial-card">
                                        <CardContent className="space-y-4 pt-6">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold text-[var(--editorial-ink)]">Enviar al profesorado</p>
                                                    <p className="text-sm text-[var(--editorial-muted)]">
                                                        Cuando esté listo, envía el logo para su valoración.
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className="border-[#d8c9aa] bg-[#f7efe1] text-[#8b611f]">
                                                    Revisión docente
                                                </Badge>
                                            </div>
                                            <Button
                                                onClick={handleSubmitLogo}
                                                className="w-full"
                                                disabled={!logoDataUrl || isSubmittingLogo}
                                            >
                                                {isSubmittingLogo ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Enviando logo...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="mr-2 h-4 w-4" />
                                                        Enviar propuesta de logo
                                                    </>
                                                )}
                                            </Button>
                                            <p className="text-center text-xs text-[var(--editorial-muted)]">
                                                El logo se enviará al profesorado para su aprobación antes de hacerse visible.
                                            </p>
                                        </CardContent>
                                    </Card>
                                </>
                            )}
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </PublicEditorialShell>
    );
}
