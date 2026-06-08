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

import { Link } from 'react-router-dom';
import { BookOpen, Download, Heart, HelpCircle, Instagram, Send, Share2, Trophy } from 'lucide-react';
import PublicEditorialShell from '@/components/layout/PublicEditorialShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function FAQ() {
    return (
        <PublicEditorialShell
            title="Preguntas frecuentes"
            eyebrow="Guia de uso y contexto"
            description="Resumen claro de acceso, filosofia del proyecto y recursos utiles para docentes, alumnado y comunidad."
            actions={(
                <div className="flex flex-wrap gap-2">
                    <Button asChild variant="editorialOutline">
                        <a href="https://instagram.com/edumind_es" target="_blank" rel="noopener noreferrer">
                            <Instagram className="h-4 w-4" />
                            @edumind_es
                        </a>
                    </Button>
                    <Button asChild variant="editorialOutline">
                        <a href="https://t.me/liga_valores" target="_blank" rel="noopener noreferrer">
                            <Send className="h-4 w-4" />
                            Canal Telegram
                        </a>
                    </Button>
                </div>
            )}
        >
            <section className="grid gap-6 md:grid-cols-2">
                <Card variant="editorial" className="editorial-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <Trophy className="h-6 w-6 text-[#315b9a]" />
                            Que es Liga EDUmind
                        </CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            Plataforma de gestion de ligas escolares con foco en juego, valores y evaluacion competencial.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm leading-relaxed text-[var(--editorial-ink)]">
                        <p>
                            Liga EDUmind no solo cuenta resultados deportivos: integra roles de equipo, seguimiento educativo y dinamicas de aula.
                        </p>
                        <p>
                            Forma parte del ecosistema Los Mundos Edufis para llevar la Educacion Fisica a experiencias mas narrativas, accesibles y reutilizables.
                        </p>
                    </CardContent>
                </Card>

                <Card variant="editorial" className="editorial-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <Heart className="h-6 w-6 text-[#b95f64]" />
                            Es gratuito
                        </CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            Uso abierto para centros y profesorado, con soporte comunitario y donacion voluntaria.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm leading-relaxed text-[var(--editorial-ink)]">
                        <p>
                            Si, la plataforma es gratuita y de codigo abierto. La donacion solo ayuda a sostener infraestructura y mejoras, nunca desbloquea funciones basicas.
                        </p>
                        <Button asChild variant="editorialOutline">
                            <a href="https://donar.edumind.es" target="_blank" rel="noopener noreferrer">
                                Apoyar el proyecto
                            </a>
                        </Button>
                    </CardContent>
                </Card>

                <Card variant="editorial" className="editorial-card md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <Share2 className="h-6 w-6 text-[#315b9a]" />
                            Como participar
                        </CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            Dos caminos principales: uso docente en aula y colaboracion abierta con la comunidad.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-5 text-sm leading-relaxed text-[var(--editorial-ink)] md:grid-cols-2">
                        <div className="space-y-3 rounded-xl border border-[var(--editorial-border)] bg-[#f8fbff] p-4">
                            <h3 className="font-semibold text-[var(--editorial-ink)]">Para docentes</h3>
                            <ul className="list-disc space-y-2 pl-5 text-[var(--editorial-muted)]">
                                <li>Crea ligas para tus grupos y cursos.</li>
                                <li>Gestiona equipos, jornadas, clasificaciones y evaluacion.</li>
                                <li>Comparte paneles publicos sin exponer administracion interna.</li>
                            </ul>
                        </div>
                        <div className="space-y-3 rounded-xl border border-[var(--editorial-border)] bg-[#f8fbff] p-4">
                            <h3 className="font-semibold text-[var(--editorial-ink)]">Para la comunidad</h3>
                            <ul className="list-disc space-y-2 pl-5 text-[var(--editorial-muted)]">
                                <li>Propone deportes o materiales reutilizables.</li>
                                <li>Comparte experiencias y adaptaciones didacticas.</li>
                                <li>Ayuda a mejorar el proyecto con feedback real de aula.</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>

                <Card variant="editorial" className="editorial-card md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <BookOpen className="h-6 w-6 text-[#315b9a]" />
                            Recursos didacticos reales
                        </CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            Un ejemplo completo para ver como aterriza la metodologia en una unidad concreta.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 text-sm leading-relaxed text-[var(--editorial-ink)] md:flex-row md:items-center md:justify-between">
                        <p className="max-w-3xl">
                            Hemos preparado una unidad de ejemplo basada en el Modelo de Educacion Deportiva y Aprendizaje Cooperativo para que puedas traducir la teoria a una implementacion real dentro de Liga EDUmind.
                        </p>
                        <Button asChild>
                            <Link to="/ejemplo-didactico">Ver unidad didactica</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card variant="editorial" className="editorial-card md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <HelpCircle className="h-6 w-6 text-[#315b9a]" />
                            Preguntas tecnicas
                        </CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            Respuestas rapidas sobre instalacion, acceso y ampliacion del catalogo.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-[var(--editorial-ink)]">
                        <details className="rounded-xl border border-[var(--editorial-border)] bg-[#f8fbff] p-4">
                            <summary className="cursor-pointer list-none font-semibold text-[var(--editorial-ink)]">
                                Necesito instalar algo
                            </summary>
                            <p className="mt-3 leading-relaxed text-[var(--editorial-muted)]">
                                No es obligatorio. Funciona directamente desde el navegador. Pero puedes instalarla como app en cualquier dispositivo sin pasar por ninguna tienda — el boton de instalacion aparece en la barra superior cuando inicias sesion.
                            </p>
                            <Button asChild variant="editorialOutline" className="mt-3">
                                <Link to="/pwa">
                                    <Download className="h-4 w-4" />
                                    Guia completa de instalacion
                                </Link>
                            </Button>
                        </details>
                        <details className="rounded-xl border border-[var(--editorial-border)] bg-[#f8fbff] p-4">
                            <summary className="cursor-pointer list-none font-semibold text-[var(--editorial-ink)]">
                                Como propongo un deporte nuevo
                            </summary>
                            <p className="mt-3 leading-relaxed text-[var(--editorial-muted)]">
                                Puedes usar la ruta de propuesta desde el pie de pagina o compartir la idea con el equipo EDUmind para evaluar integracion en el catalogo comun.
                            </p>
                        </details>
                    </CardContent>
                </Card>
            </section>
        </PublicEditorialShell>
    );
}
