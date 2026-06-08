/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 */

import { Link } from 'react-router-dom';
import {
    AlertTriangle,
    CheckCircle,
    Download,
    HelpCircle,
    Monitor,
    RefreshCw,
    Smartphone,
    Tablet,
    WifiOff,
    XCircle,
    Zap,
} from 'lucide-react';
import PublicEditorialShell from '@/components/layout/PublicEditorialShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Sub-componentes internos
// ---------------------------------------------------------------------------

function Paso({ numero, texto }: { numero: number; texto: string }) {
    return (
        <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8f0ff] text-xs font-bold text-[#2b4f80]">
                {numero}
            </span>
            <span className="text-[var(--editorial-muted)]">{texto}</span>
        </li>
    );
}

function Check({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
            <span>{children}</span>
        </li>
    );
}

function Cruz({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
            <span>{children}</span>
        </li>
    );
}

function Pregunta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <details className="rounded-xl border border-[var(--editorial-border)] bg-[#f8fbff] p-4">
            <summary className="cursor-pointer select-none list-none font-semibold text-[var(--editorial-ink)]">
                {titulo}
            </summary>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--editorial-muted)]">
                {children}
            </div>
        </details>
    );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function PwaGuide() {
    return (
        <PublicEditorialShell
            title="Liga EDUmind como aplicación"
            eyebrow="Guia de la app instalable"
            description="Entiende que es una PWA, como instalarla en cualquier dispositivo y que puedes hacer con o sin conexion."
            actions={(
                <Button asChild variant="editorialOutline">
                    <Link to="/faq">Volver al FAQ</Link>
                </Button>
            )}
        >
            <section className="grid gap-6 md:grid-cols-2">

                {/* ¿Qué es? */}
                <Card variant="editorial" className="editorial-card md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <Zap className="h-6 w-6 text-[#315b9a]" />
                            Que es exactamente
                        </CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            Una PWA (Progressive Web App) es una pagina web que se comporta como una app nativa.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 text-sm leading-relaxed text-[var(--editorial-ink)] md:grid-cols-3">
                        <div className="rounded-xl border border-[var(--editorial-border)] bg-[#f8fbff] p-4 space-y-2">
                            <p className="font-semibold">Sin tienda de aplicaciones</p>
                            <p className="text-[var(--editorial-muted)]">
                                No necesitas ir al App Store ni a Google Play. Se instala directamente desde el navegador, igual que visitar una web.
                            </p>
                        </div>
                        <div className="rounded-xl border border-[var(--editorial-border)] bg-[#f8fbff] p-4 space-y-2">
                            <p className="font-semibold">Siempre actualizada</p>
                            <p className="text-[var(--editorial-muted)]">
                                No hay que actualizar manualmente. Cuando hay una version nueva aparece un aviso y con un clic tienes los cambios.
                            </p>
                        </div>
                        <div className="rounded-xl border border-[var(--editorial-border)] bg-[#f8fbff] p-4 space-y-2">
                            <p className="font-semibold">Funciona offline</p>
                            <p className="text-[var(--editorial-muted)]">
                                Si el gimnasio no tiene WiFi o la conexion cae, puedes seguir registrando marcadores. Se sincronizan solos al volver a conectar.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Instalación Android */}
                <Card variant="editorial" className="editorial-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <Smartphone className="h-5 w-5 text-[#3a9e6f]" />
                            Instalar en Android
                            <Badge variant="outline" className="ml-auto border-green-300 bg-green-50 text-green-700 text-xs">Recomendado</Badge>
                        </CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            Chrome o Edge. La experiencia mas completa de todas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm">
                        <ol className="space-y-3">
                            <Paso numero={1} texto='Abre liga.edumind.es en Chrome o Edge.' />
                            <Paso numero={2} texto='Si ves el boton verde "Instalar app" en el menu, pulsa ahi. Si no, espera — Chrome muestra su propio banner en la parte inferior.' />
                            <Paso numero={3} texto='Confirma la instalacion cuando aparezca el dialogo.' />
                            <Paso numero={4} texto='La app aparece en tu pantalla de inicio como cualquier otra aplicacion.' />
                        </ol>
                        <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-800">
                            En Android tienes soporte completo: modo offline, notificaciones del sistema, accesos directos y actualizaciones automaticas.
                        </p>
                    </CardContent>
                </Card>

                {/* Instalación iOS */}
                <Card variant="editorial" className="editorial-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <Tablet className="h-5 w-5 text-[#555]" />
                            Instalar en iPhone / iPad
                            <Badge variant="outline" className="ml-auto border-amber-300 bg-amber-50 text-amber-700 text-xs">Manual</Badge>
                        </CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            Safari unicamente. Apple no permite esto en Chrome ni Firefox en iOS.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm">
                        <ol className="space-y-3">
                            <Paso numero={1} texto='Abre liga.edumind.es en Safari (el navegador por defecto de Apple).' />
                            <Paso numero={2} texto='Pulsa el boton de compartir (el cuadrado con una flecha hacia arriba, en la barra inferior).' />
                            <Paso numero={3} texto='Desplazate hacia abajo en el menu y selecciona "Anadir a pantalla de inicio".' />
                            <Paso numero={4} texto='Confirma el nombre (puedes dejarlo como esta) y pulsa "Anadir".' />
                            <Paso numero={5} texto='La app aparece en tu pantalla de inicio con el icono de Liga EDUmind.' />
                        </ol>
                        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                            En iOS el proceso es manual siempre — Apple no permite el boton automatico de instalacion. Funciona pero tiene mas limitaciones que Android (ver seccion de limitaciones).
                        </p>
                    </CardContent>
                </Card>

                {/* Instalación escritorio */}
                <Card variant="editorial" className="editorial-card md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <Monitor className="h-5 w-5 text-[#315b9a]" />
                            Instalar en ordenador (Windows / Mac / Linux)
                        </CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            Chrome o Edge. Funciona como una ventana de app independiente, sin barras del navegador.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                        <div>
                            <p className="mb-3 font-semibold text-[var(--editorial-ink)]">Opcion A — Boton en la app</p>
                            <ol className="space-y-3">
                                <Paso numero={1} texto='Inicia sesion en liga.edumind.es.' />
                                <Paso numero={2} texto='En la barra superior verás el icono de descarga junto al indicador de conexion.' />
                                <Paso numero={3} texto='Haz clic y confirma la instalacion.' />
                            </ol>
                        </div>
                        <div>
                            <p className="mb-3 font-semibold text-[var(--editorial-ink)]">Opcion B — Barra del navegador</p>
                            <ol className="space-y-3">
                                <Paso numero={1} texto='En Chrome: busca el icono de instalacion (pantalla con flecha) en la barra de direccion, a la derecha.' />
                                <Paso numero={2} texto='En Edge: menu de tres puntos → "Aplicaciones" → "Instalar este sitio".' />
                                <Paso numero={3} texto='Acepta el dialogo de instalacion.' />
                            </ol>
                        </div>
                        <div className="md:col-span-2 rounded-lg border border-[#bfd0ea] bg-[#edf4ff] px-3 py-2 text-[#2b4f80]">
                            Una vez instalada en el ordenador aparece como programa independiente en el buscador de aplicaciones y puedes fijarla a la barra de tareas o al Dock de Mac.
                        </div>
                    </CardContent>
                </Card>

                {/* Offline: qué funciona y qué no */}
                <Card variant="editorial" className="editorial-card md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <WifiOff className="h-5 w-5 text-[#315b9a]" />
                            Que funciona sin conexion
                        </CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            No todo funciona offline. Esta tabla aclara exactamente que puedes hacer cuando no hay WiFi.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                            <p className="mb-3 font-semibold text-green-800">Funciona sin conexion</p>
                            <ul className="space-y-2 text-green-700">
                                <Check>Ver partidos que hayas abierto antes (en cache)</Check>
                                <Check>Actualizar el marcador durante un partido en curso</Check>
                                <Check>Guardar evaluaciones educativas del partido</Check>
                                <Check>Acceder a ligas y equipos visitados recientemente</Check>
                                <Check>Ver la clasificacion y jornadas visitadas</Check>
                            </ul>
                        </div>
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                            <p className="mb-3 font-semibold text-red-800">Requiere conexion</p>
                            <ul className="space-y-2 text-red-700">
                                <Cruz>Iniciar sesion por primera vez</Cruz>
                                <Cruz>Crear ligas, equipos o jornadas nuevas</Cruz>
                                <Cruz>Finalizar un partido (el cierre se guarda en servidor)</Cruz>
                                <Cruz>Exportar actas en PDF</Cruz>
                                <Cruz>Partidos no visitados previamente</Cruz>
                                <Cruz>Datos recientes de partidos que otro docente modifico</Cruz>
                            </ul>
                        </div>
                        <div className="md:col-span-2 rounded-lg border border-[#bfd0ea] bg-[#edf4ff] px-3 py-2 text-[#2b4f80]">
                            <strong>Como prepararse:</strong> Antes de entrar al gimnasio sin WiFi, abre la app con conexion y navega por las ligas y partidos de esa sesion. Se quedaran en cache para usarlos offline.
                        </div>
                    </CardContent>
                </Card>

                {/* Limitaciones */}
                <Card variant="editorial" className="editorial-card md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Limitaciones importantes
                        </CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            Conocer los limites evita sorpresas. Esto no es fallo de la app, son restricciones del propio sistema de cada dispositivo.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-[var(--editorial-ink)]">
                        <details className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <summary className="cursor-pointer select-none list-none font-semibold text-amber-800">
                                En iPhone e iPad hay mas restricciones que en Android
                            </summary>
                            <ul className="mt-3 space-y-2 text-amber-700">
                                <li>— Apple limita el espacio de almacenamiento offline a unos 50 MB (Android no tiene ese limite practico).</li>
                                <li>— No hay notificaciones push en PWA de iOS (solo en apps nativas del App Store).</li>
                                <li>— Si no abres la app en 7 dias, iOS puede borrar los datos en cache automaticamente.</li>
                                <li>— La sincronizacion en segundo plano no funciona en iOS como en Android.</li>
                                <li>— La instalacion siempre es manual (Safari → Compartir → Anadir a pantalla de inicio).</li>
                            </ul>
                        </details>
                        <details className="rounded-xl border border-[var(--editorial-border)] bg-[#f8fbff] p-4">
                            <summary className="cursor-pointer select-none list-none font-semibold text-[var(--editorial-ink)]">
                                Los datos offline son temporales, no son un backup
                            </summary>
                            <p className="mt-3 text-[var(--editorial-muted)]">
                                El cache offline es para usar la app sin conexion durante una sesion, no para guardar datos permanentemente en el dispositivo. La fuente de verdad siempre es el servidor. Si borras la app o limpias el almacenamiento del navegador, los datos offline desaparecen — pero los datos del servidor no se pierden.
                            </p>
                        </details>
                        <details className="rounded-xl border border-[var(--editorial-border)] bg-[#f8fbff] p-4">
                            <summary className="cursor-pointer select-none list-none font-semibold text-[var(--editorial-ink)]">
                                Los cambios offline no son inmediatos — hay una cola de sincronizacion
                            </summary>
                            <p className="mt-3 text-[var(--editorial-muted)]">
                                Si actualizas un marcador sin conexion, ese cambio queda en una cola local. Cuando la app detecta que tienes internet, sincroniza automaticamente (en unos segundos). En la barra superior veras cuantos cambios estan pendientes. Si hay un conflicto (p.ej. tu y otra persona modificasteis lo mismo), aparece un dialogo para elegir cual version conservar.
                            </p>
                        </details>
                        <details className="rounded-xl border border-[var(--editorial-border)] bg-[#f8fbff] p-4">
                            <summary className="cursor-pointer select-none list-none font-semibold text-[var(--editorial-ink)]">
                                Firefox y Safari de escritorio tienen soporte limitado
                            </summary>
                            <p className="mt-3 text-[var(--editorial-muted)]">
                                Firefox no permite instalar la app como PWA de escritorio (aunque puedes usarla como web). Safari en Mac tiene soporte parcial desde macOS Ventura. Para la mejor experiencia en escritorio usa Chrome o Edge.
                            </p>
                        </details>
                    </CardContent>
                </Card>

                {/* Actualizaciones */}
                <Card variant="editorial" className="editorial-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <RefreshCw className="h-5 w-5 text-[#315b9a]" />
                            Como se actualiza la app
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm leading-relaxed text-[var(--editorial-ink)]">
                        <p>
                            Cuando hay una nueva version disponible, la app muestra un aviso en la parte inferior de la pantalla:
                            <strong className="block mt-1"> "Nueva version lista. Recarga cuando te venga bien."</strong>
                        </p>
                        <p className="text-[var(--editorial-muted)]">
                            Puedes seguir trabajando con la version actual y actualizar cuando termines el partido o la sesion. No hay prisa — la actualizacion no interrumpe lo que estes haciendo.
                        </p>
                        <p className="text-[var(--editorial-muted)]">
                            Si no ves el aviso, la app ya tiene la ultima version o la actualizacion se aplicara la proxima vez que la abras.
                        </p>
                    </CardContent>
                </Card>

                {/* Preguntas frecuentes */}
                <Card variant="editorial" className="editorial-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <HelpCircle className="h-5 w-5 text-[#315b9a]" />
                            Preguntas rapidas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <Pregunta titulo="¿Cuanto espacio ocupa en mi movil?">
                            <p>Muy poco. El codigo de la app pesa unos 3 MB. Los datos que cachea (marcadores, ligas, partidos) ocupan entre 1 y 10 MB segun cuanto hayas navegado. Nada que ver con las apps de 200 MB de las tiendas.</p>
                        </Pregunta>
                        <Pregunta titulo="¿Si la desinstalo pierdo mis datos?">
                            <p>No. Todos tus datos (ligas, partidos, evaluaciones) estan en el servidor, no en el dispositivo. Si la desinstalo y la vuelvo a instalar o accedo desde el navegador, todo sigue ahi.</p>
                            <p>Lo unico que se pierde al desinstalar es el cache offline — si habia datos pendientes de sincronizar y no tenias conexion, esos cambios si se pierden.</p>
                        </Pregunta>
                        <Pregunta titulo="¿Puedo usarla en varios dispositivos a la vez?">
                            <p>Si. Puedes tener la sesion abierta en el movil, la tablet y el ordenador al mismo tiempo. Los datos se sincronizan entre todos.</p>
                            <p>Si dos personas editan el mismo partido a la vez, el sistema detecta el conflicto y te pide elegir que version conservar.</p>
                        </Pregunta>
                        <Pregunta titulo="¿Funciona con datos moviles (4G/5G)?">
                            <p>Si, perfectamente. La app esta optimizada para conexiones lentas. Los assets pesados (imagenes, sonidos) se guardan en cache la primera vez, asi que las siguientes cargas son muy rapidas incluso con mala cobertura.</p>
                        </Pregunta>
                        <Pregunta titulo="¿Necesito crear cuenta para el alumnado?">
                            <p>No. El alumnado accede a sus partidos con el PIN de 6 digitos que el docente les da. No hace falta que se registren ni que tengan contrasena.</p>
                            <p>Solo el docente tiene cuenta. El alumnado entra en <Link to="/partido" className="underline text-[#315b9a]">liga.edumind.es/partido</Link>, introduce el PIN y gestiona el marcador.</p>
                        </Pregunta>
                    </CardContent>
                </Card>

                {/* Dos apps separadas */}
                <Card variant="editorial" className="editorial-card md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-[var(--editorial-ink)]">
                            <Download className="h-5 w-5 text-[#315b9a]" />
                            Dos versiones instalables segun quien seas
                        </CardTitle>
                        <CardDescription className="text-[var(--editorial-muted)]">
                            No hay que instalar la misma app para todo el mundo.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                        <div className="rounded-xl border border-[#a9c0e2] bg-[#edf4ff] p-4 space-y-3">
                            <p className="font-semibold text-[#2b4f80]">Para el alumnado — "Partido"</p>
                            <p className="text-[#3a6aad]">
                                App ultra-ligera. Solo necesita el PIN del partido para entrar. Sin cuenta, sin contraseña. Se instala desde <strong>liga.edumind.es/partido</strong>.
                            </p>
                            <Button asChild size="sm">
                                <Link to="/partido">
                                    <Download className="h-4 w-4" />
                                    Ir a la app de alumnado
                                </Link>
                            </Button>
                        </div>
                        <div className="rounded-xl border border-[var(--editorial-border)] bg-[#f8fbff] p-4 space-y-3">
                            <p className="font-semibold text-[var(--editorial-ink)]">Para el profesorado — "Liga EDUmind"</p>
                            <p className="text-[var(--editorial-muted)]">
                                App completa con gestion de ligas, equipos, clasificacion, evaluacion y modo offline. Se instala desde <strong>liga.edumind.es</strong>.
                            </p>
                            <Button asChild variant="editorialOutline" size="sm">
                                <Link to="/login">
                                    <Download className="h-4 w-4" />
                                    Ir a la app de docentes
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* CTA final */}
                <Card variant="editorial" className="editorial-card md:col-span-2">
                    <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                        <div className="space-y-1">
                            <p className="font-semibold text-[var(--editorial-ink)]">Lista para instalar</p>
                            <p className="text-sm text-[var(--editorial-muted)]">
                                Si estas en Chrome o Edge, el boton de instalacion aparece en la barra superior de la app cuando inicias sesion.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button asChild>
                                <Link to="/login">
                                    <Download className="h-4 w-4" />
                                    Acceder e instalar
                                </Link>
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
