/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
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

import { Link } from 'react-router-dom';
import {
    BookOpen,
    Download,
    FileDown,
    Globe,
    HardDrive,
    HelpCircle,
    School,
    ShieldCheck,
    Terminal,
    WifiOff,
} from 'lucide-react';
import PublicEditorialShell from '@/components/layout/PublicEditorialShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const REPO_URL = 'https://github.com/edumind-es/liga-de-valores';
const ZIP_URL = `${REPO_URL}/archive/refs/heads/main.zip`;
const GUIA_URL = `${REPO_URL}/blob/main/docs/instalacion-aula.md`;

// ---------------------------------------------------------------------------
// Sub-componentes internos
// ---------------------------------------------------------------------------

function Paso({ numero, children }: { numero: number; children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8f0ff] text-xs font-bold text-[#2f6076]">
                {numero}
            </span>
            <span className="text-[var(--editorial-muted)]">{children}</span>
        </li>
    );
}

function Comandos({ children }: { children: string }) {
    return (
        <pre className="mt-2 overflow-x-auto rounded-lg bg-[#2a2620] px-3 py-2 font-mono text-xs leading-relaxed text-[#e8e3d8]">
            {children}
        </pre>
    );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function InstalarCentro() {
    return (
        <PublicEditorialShell
            title="Liga EDUmind en tu centro"
            eyebrow="Versión descargable · Software libre"
            description="Instala la aplicación completa en un equipo del centro y úsala sin depender del servidor de EDUmind. Los datos del alumnado no salen de tu equipo."
            actions={(
                <div className="flex flex-wrap gap-2">
                    <Button asChild>
                        <a href={ZIP_URL} target="_blank" rel="noopener noreferrer">
                            <FileDown className="h-4 w-4" />
                            Descargar (.zip)
                        </a>
                    </Button>
                    <Button asChild variant="editorialOutline">
                        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                            Código en GitHub
                        </a>
                    </Button>
                </div>
            )}
        >
            <section className="grid gap-6 md:grid-cols-2">

                {/* Qué es */}
                <Card variant="editorial" className="editorial-card md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <School className="h-6 w-6 text-[#315b9a]" />
                            Qué es el modo aula
                        </CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            La misma aplicación que usas en liga.edumind.es, funcionando entera en un equipo del centro: el portátil del docente, un miniPC del gimnasio o el servidor del cole.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 text-sm leading-relaxed text-[var(--editorial-ink)] md:grid-cols-3">
                        <div className="space-y-2 rounded-xl border border-[var(--editorial-border)] bg-[#f8fbff] p-4">
                            <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-[#3a9e6f]" /> Local-first de verdad</p>
                            <p className="text-[var(--editorial-muted)]">
                                Base de datos, archivos y copias de seguridad viven en tu equipo. Ningún dato del alumnado sale del centro.
                            </p>
                        </div>
                        <div className="space-y-2 rounded-xl border border-[var(--editorial-border)] bg-[#f8fbff] p-4">
                            <p className="flex items-center gap-2 font-semibold"><WifiOff className="h-4 w-4 text-[#315b9a]" /> Sin internet</p>
                            <p className="text-[var(--editorial-muted)]">
                                Solo necesitas conexión para la instalación inicial. Después, ligas, marcador, evaluaciones y actas funcionan sin red.
                            </p>
                        </div>
                        <div className="space-y-2 rounded-xl border border-[var(--editorial-border)] bg-[#f8fbff] p-4">
                            <p className="flex items-center gap-2 font-semibold"><Globe className="h-4 w-4 text-[#b95f64]" /> Software libre</p>
                            <p className="text-[var(--editorial-muted)]">
                                Código abierto con licencia AGPL-3.0 / EUPL-1.2: puedes usarlo, auditarlo y adaptarlo libremente en tu centro.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Requisitos */}
                <Card variant="editorial" className="editorial-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <HardDrive className="h-5 w-5 text-[#315b9a]" />
                            Qué necesitas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm leading-relaxed text-[var(--editorial-ink)]">
                        <ul className="list-disc space-y-2 pl-5 text-[var(--editorial-muted)]">
                            <li>
                                Un equipo con <strong className="text-[var(--editorial-ink)]">Docker</strong>: en Windows o macOS,{' '}
                                <a className="underline" href="https://docs.docker.com/desktop/" target="_blank" rel="noopener noreferrer">Docker Desktop</a>; en Linux, Docker Engine con el plugin Compose.
                            </li>
                            <li>Unos 3 GB de espacio libre.</li>
                            <li>Conexión a internet solo durante la instalación.</li>
                        </ul>
                        <p className="rounded-lg border border-[#bfd0ea] bg-[#edf4ff] px-3 py-2 text-[#2f6076]">
                            No hace falta saber programar: el instalador hace todo el trabajo y la guía explica cada paso.
                        </p>
                    </CardContent>
                </Card>

                {/* Descarga */}
                <Card variant="editorial" className="editorial-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <Download className="h-5 w-5 text-[#3a9e6f]" />
                            Descargar la aplicación
                        </CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            Dos formas de obtener el mismo código, publicado en GitHub.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm leading-relaxed text-[var(--editorial-ink)]">
                        <div>
                            <p className="flex items-center gap-2 font-semibold">
                                Con git
                                <Badge variant="outline" className="border-green-300 bg-green-50 text-xs text-green-700">Recomendado</Badge>
                            </p>
                            <p className="mt-1 text-[var(--editorial-muted)]">Permite actualizar después con un simple <code>git pull</code>.</p>
                            <Comandos>{'git clone https://github.com/edumind-es/liga-de-valores.git'}</Comandos>
                        </div>
                        <div>
                            <p className="font-semibold">Como archivo .zip</p>
                            <p className="mt-1 text-[var(--editorial-muted)]">
                                Sin instalar git: descarga el código, descomprímelo donde quieras y sigue los mismos pasos. Para actualizar, vuelve a descargarlo.
                            </p>
                            <Button asChild variant="editorialOutline" size="sm" className="mt-2">
                                <a href={ZIP_URL} target="_blank" rel="noopener noreferrer">
                                    <FileDown className="h-4 w-4" />
                                    Descargar liga-de-valores.zip
                                </a>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Instalación */}
                <Card variant="editorial" className="editorial-card md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <Terminal className="h-5 w-5 text-[#315b9a]" />
                            Instalación paso a paso
                        </CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            Un solo comando en Linux y macOS; en Windows, tres pasos con Docker Desktop.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-5 text-sm md:grid-cols-2">
                        <div>
                            <p className="mb-3 font-semibold text-[var(--editorial-ink)]">Linux / macOS</p>
                            <ol className="space-y-3">
                                <Paso numero={1}>Entra en la carpeta descargada y ejecuta el instalador:</Paso>
                            </ol>
                            <Comandos>{'cd liga-de-valores\n./scripts/instalar_aula.sh'}</Comandos>
                            <p className="mt-3 text-[var(--editorial-muted)]">
                                El instalador genera credenciales locales aleatorias, construye y arranca los cinco servicios, aplica las migraciones de la base de datos y te ofrece crear el usuario administrador.
                            </p>
                        </div>
                        <div>
                            <p className="mb-3 font-semibold text-[var(--editorial-ink)]">Windows (PowerShell, con Docker Desktop)</p>
                            <ol className="space-y-3">
                                <Paso numero={1}>Copia <code>.env.example</code> como <code>.env</code> y rellena <code>POSTGRES_PASSWORD</code> y <code>SECRET_KEY</code> con valores largos y aleatorios.</Paso>
                                <Paso numero={2}>Arranca la aplicación:</Paso>
                            </ol>
                            <Comandos>{'docker compose -f docker-compose.aula.yml up -d --build'}</Comandos>
                            <ol className="mt-3 space-y-3">
                                <Paso numero={3}>Crea el usuario administrador:</Paso>
                            </ol>
                            <Comandos>{'docker compose -f docker-compose.aula.yml exec backend python scripts/crear_admin.py ADMIN01'}</Comandos>
                        </div>
                        <div className="rounded-lg border border-[#bfd0ea] bg-[#edf4ff] px-3 py-2 text-[#2f6076] md:col-span-2">
                            Al terminar, la aplicación queda en <strong>http://localhost:8080</strong> en ese equipo, y en <strong>http://IP-del-equipo:8080</strong> para las tablets y marcadores de la misma red del centro.
                        </div>
                    </CardContent>
                </Card>

                {/* Comparativa */}
                <Card variant="editorial" className="editorial-card md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <HelpCircle className="h-5 w-5 text-[#315b9a]" />
                            Esta web o tu propio equipo: elige lo que encaje
                        </CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            Las dos opciones son la misma aplicación y son gratuitas. Cambia dónde viven los datos y quién mantiene el servidor.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                        <div className="space-y-2 rounded-xl border border-[var(--editorial-border)] bg-[#f8fbff] p-4">
                            <p className="font-semibold text-[var(--editorial-ink)]">liga.edumind.es (esta web)</p>
                            <ul className="list-disc space-y-1.5 pl-5 text-[var(--editorial-muted)]">
                                <li>Nada que instalar: cuenta y a trabajar.</li>
                                <li>Actualizaciones y copias de seguridad automáticas.</li>
                                <li>Los datos se alojan en el servidor de EDUmind (en la UE, sin rastreadores).</li>
                            </ul>
                        </div>
                        <div className="space-y-2 rounded-xl border border-[#a9c0e2] bg-[#edf4ff] p-4">
                            <p className="font-semibold text-[#2f6076]">Modo aula (tu equipo)</p>
                            <ul className="list-disc space-y-1.5 pl-5 text-[#3a6aad]">
                                <li>Independencia total: funciona aunque este servidor desaparezca.</li>
                                <li>Los datos del alumnado no salen del centro (ideal para el registro de tratamiento RGPD).</li>
                                <li>Tú decides cuándo actualizar y haces tus copias de seguridad.</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>

                {/* CTA final */}
                <Card variant="editorial" className="editorial-card md:col-span-2">
                    <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                        <div className="space-y-1">
                            <p className="font-semibold text-[var(--editorial-ink)]">Guía completa de instalación</p>
                            <p className="text-sm text-[var(--editorial-muted)]">
                                Uso desde tablets, copias de seguridad, actualizaciones, correo opcional, privacidad y solución de problemas frecuentes.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button asChild>
                                <a href={GUIA_URL} target="_blank" rel="noopener noreferrer">
                                    <BookOpen className="h-4 w-4" />
                                    Leer la guía completa
                                </a>
                            </Button>
                            <Button asChild variant="editorialOutline">
                                <Link to="/faq">Volver al FAQ</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

            </section>
        </PublicEditorialShell>
    );
}
