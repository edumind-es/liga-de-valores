/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 */

/**
 * Pestaña «Acceso y fichas»: PIN público, recepción de fichas y descarga
 * de calendario con PINes. Extraída de ConfiguracionLiga.tsx sin cambios;
 * el estado vive en el padre.
 */
import type { Dispatch, SetStateAction } from 'react';
import { Copy, Download, Eye, FileSpreadsheet, Key, Languages, Lock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    SETTINGS_HEADER_CLASSNAME,
    SETTINGS_PANEL_CLASSNAME,
    type LigaConfigForm,
} from './constants';

interface TabAccesoProps {
    publicPin: string;
    emailFichas: string;
    setEmailFichas: (value: string) => void;
    config: LigaConfigForm;
    setConfig: Dispatch<SetStateAction<LigaConfigForm>>;
    isUpdating: boolean;
    isExportingPines: boolean;
    hasPublicPin: boolean;
    hasFichasEmail: boolean;
    publicLoginUrl: string;
    publicFichasUrl: string;
    onGeneratePin: () => void;
    onDisablePin: () => void;
    onUpdateEmail: () => void;
    onSaveLanguage: () => void;
    onExportPines: (formato: 'pdf' | 'csv') => void;
    onCopy: (value: string, label: string) => void;
    onOpenExternal: (url: string) => void;
}

export function TabAcceso({
    publicPin,
    emailFichas,
    setEmailFichas,
    config,
    setConfig,
    isUpdating,
    isExportingPines,
    hasPublicPin,
    hasFichasEmail,
    publicLoginUrl,
    publicFichasUrl,
    onGeneratePin,
    onDisablePin,
    onUpdateEmail,
    onSaveLanguage,
    onExportPines,
    onCopy,
    onOpenExternal,
}: TabAccesoProps) {
    return (
        <>
            <Card className={SETTINGS_PANEL_CLASSNAME}>
                <CardHeader className={SETTINGS_HEADER_CLASSNAME}>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-mint" />
                        Acceso publico por PIN
                    </CardTitle>
                    <CardDescription>
                        Genera un PIN para habilitar el acceso del alumnado a la vista publica.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                        <div className="space-y-2">
                            <Label htmlFor="public-pin">PIN de acceso</Label>
                            <div className="relative">
                                <Key className="absolute left-3 top-3 h-4 w-4 text-sub" />
                                <Input
                                    id="public-pin"
                                    value={publicPin}
                                    readOnly
                                    placeholder="Genera un PIN de 6 caracteres"
                                    className="pl-10 font-mono tracking-[0.16em]"
                                />
                            </div>
                        </div>
                        <Button onClick={onGeneratePin} disabled={isUpdating} className="md:self-end">
                            {hasPublicPin ? 'Regenerar PIN' : 'Generar PIN'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onDisablePin}
                            disabled={isUpdating || !hasPublicPin}
                            className="md:self-end"
                        >
                            Desactivar
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label>Enlace de acceso publico</Label>
                        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                            <code className="rounded-md border border-lme-border bg-[rgba(24,22,18,0.78)] px-3 py-2 text-xs text-ink overflow-x-auto">
                                {publicLoginUrl}
                            </code>
                            <Button
                                variant="outline"
                                onClick={() => onCopy(publicLoginUrl, 'Enlace publico')}
                                disabled={!hasPublicPin}
                            >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => onOpenExternal(publicLoginUrl)}
                                disabled={!hasPublicPin}
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                Abrir
                            </Button>
                        </div>
                        <p className="text-xs text-sub">
                            Sin PIN activo, el alumnado no podra iniciar sesion en la vista publica.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card className={SETTINGS_PANEL_CLASSNAME}>
                <CardHeader className={SETTINGS_HEADER_CLASSNAME}>
                    <CardTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5 text-mint" />
                        Recepcion de fichas de juego
                    </CardTitle>
                    <CardDescription>
                        Define correo e idioma para los envios del generador de fichas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                        <div className="space-y-2">
                            <Label htmlFor="email-fichas">Email docente</Label>
                            <Input
                                id="email-fichas"
                                type="email"
                                placeholder="docente@centro.es"
                                value={emailFichas}
                                onChange={(event) => setEmailFichas(event.target.value)}
                            />
                        </div>
                        <Button onClick={onUpdateEmail} disabled={isUpdating} className="md:self-end">
                            Guardar email
                        </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[240px_auto]">
                        <div className="space-y-2">
                            <Label htmlFor="submission-language" className="flex items-center gap-2">
                                <Languages className="h-4 w-4" />
                                Idioma requerido
                            </Label>
                            <Select
                                value={config.submission_language}
                                onValueChange={(value) => setConfig((prev) => ({ ...prev, submission_language: value }))}
                            >
                                <SelectTrigger id="submission-language">
                                    <SelectValue placeholder="Selecciona idioma" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Cualquiera</SelectItem>
                                    <SelectItem value="gl">Galego</SelectItem>
                                    <SelectItem value="es">Castellano</SelectItem>
                                    <SelectItem value="en">Ingles</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="outline" onClick={onSaveLanguage} disabled={isUpdating} className="md:self-end">
                            Guardar idioma
                        </Button>
                    </div>

                    <div className="space-y-2 border-t border-lme-border pt-4">
                        <Label>Enlace del generador de fichas</Label>
                        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                            <code className="rounded-md border border-lme-border bg-[rgba(24,22,18,0.78)] px-3 py-2 text-xs text-ink overflow-x-auto">
                                {publicFichasUrl}
                            </code>
                            <Button
                                variant="outline"
                                onClick={() => onCopy(publicFichasUrl, 'Enlace de fichas')}
                                disabled={!hasFichasEmail}
                            >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => onOpenExternal(publicFichasUrl)}
                                disabled={!hasFichasEmail}
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                Abrir
                            </Button>
                        </div>
                        <p className="text-xs text-sub">
                            Configura primero un email de recepcion para activar este flujo.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card className={SETTINGS_PANEL_CLASSNAME}>
                <CardHeader className={SETTINGS_HEADER_CLASSNAME}>
                    <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5 text-mint" />
                        Descargar calendario con PINes
                    </CardTitle>
                    <CardDescription>
                        Descarga el calendario completo con PINes de cada partido, equipos y roles. Para uso exclusivo docente.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg border border-amber-300/20 bg-amber-300/6 p-3">
                        <p className="text-xs text-amber-200/90">
                            Este documento contiene los PINes de acceso del alumnado. No lo compartas fuera del equipo docente.
                            Los nombres de equipos no deben contener datos personales de menores (LOPD/RGPD).
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            variant="outline"
                            onClick={() => onExportPines('pdf')}
                            disabled={isExportingPines || !hasPublicPin}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Descargar PDF (imprimible)
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => onExportPines('csv')}
                            disabled={isExportingPines || !hasPublicPin}
                        >
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Descargar CSV (Excel/Sheets)
                        </Button>
                    </div>
                    {!hasPublicPin && (
                        <p className="text-xs text-sub">Genera primero el PIN de liga para activar la descarga.</p>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
