/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 */

import React from 'react';
import { BookOpen, Target, Users, Settings, Award, Boxes, Calendar, Globe, Brain, Info, Trophy } from 'lucide-react';

// ... (top of file)

function MethodItem({ title, desc }: { title: string, desc: React.ReactNode }) {
    return (
        <div className="bg-white/5 rounded-lg p-4 border border-white/5 hover:bg-white/10 transition-colors">
            <h4 className="text-white font-bold mb-2 text-sm uppercase tracking-wide text-blue-300">{title}</h4>
            <div className="text-slate-300 text-sm leading-relaxed">
                {desc}
            </div>
        </div>
    );
}

export default function DidacticExample() {
    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Disclaimer Banner */}
            <div className="bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded-r-lg flex gap-3 text-sm text-blue-200">
                <Info className="w-5 h-5 shrink-0 text-blue-400" />
                <p>
                    <strong>Nota:</strong> Este documento se ha elaborado partiendo de información real aplicada, utilizando Inteligencia Artificial para su organización y estructura. El contenido ha sido supervisado por humanos, pero podría contener errores.
                </p>
            </div>

            {/* Header */}
            <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-white/10 p-8 backdrop-blur-sm">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold uppercase tracking-wider border border-yellow-500/20">
                            UD7 | 4 Sesiones
                        </span>
                        <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-500/20">
                            2º Trimestre
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Alternative Olympics (II): TowerTouchball
                    </h1>
                    <p className="text-lg text-slate-300 max-w-2xl">
                        Unidad didáctica basada en el Modelo de Educación Deportiva, Aprendizaje Cooperativo y MRPS.
                    </p>
                </div>
            </header>

            {/* General Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card
                    icon={<Calendar className="w-5 h-5 text-emerald-400" />}
                    title="Temporalización"
                    content="Febrero (Semanas 3, 4 y 5)"
                />
                <Card
                    icon={<Globe className="w-5 h-5 text-purple-400" />}
                    title="Interdisciplinariedad"
                    content={
                        <ul className="list-disc list-inside text-sm text-slate-300">
                            <li>Inglés: Action verbs & body actions</li>
                            <li>Matemáticas: Datos y escalas</li>
                        </ul>
                    }
                />
                <Card
                    icon={<Users className="w-5 h-5 text-orange-400" />}
                    title="Elementos Transversales"
                    content={
                        <ul className="list-disc list-inside text-sm text-slate-300">
                            <li>Igualdad de oportunidades</li>
                            <li>Lucha contra estereotipos</li>
                        </ul>
                    }
                />
                <Card
                    icon={<Brain className="w-5 h-5 text-pink-400" />}
                    title="Planes y Proyectos"
                    content={
                        <div className="text-sm text-slate-300">
                            <span className="font-semibold text-white">PVAD/Biblioteca:</span> Deportes alternativos patio.<br />
                            <span className="font-semibold text-white">Convivencia:</span> Empatía y Bienestar emocional.<br />
                            <span className="font-semibold text-white">Digital:</span> Recursos para crear logos.
                        </div>
                    }
                />
            </div>

            {/* Competencias Clave */}
            <section className="bg-slate-900/50 rounded-xl border border-white/5 p-6 backdrop-blur-sm">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Target className="w-6 h-6 text-mint" />
                    Competencias Clave
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                    <CompetenciaBadge name="CCL" levels="1-5" />
                    <CompetenciaBadge name="CP" levels="3" />
                    <CompetenciaBadge name="STEM" levels="1" />
                    <CompetenciaBadge name="CD" levels="3" />
                    <CompetenciaBadge name="CPSAA" levels="1-3-4-5" />
                    <CompetenciaBadge name="CC" levels="2-3" />
                    <CompetenciaBadge name="CCEC" levels="1-2-3-4" />
                </div>
            </section>

            {/* Contenidos y Objetivos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-slate-900/50 rounded-xl border border-white/5 p-6 backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-blue-400" />
                        Contenidos Vinculados CE
                    </h2>
                    <ul className="space-y-3">
                        <li className="flex gap-3 text-slate-300 text-sm bg-white/5 p-3 rounded-lg">
                            <span className="font-bold text-blue-400 shrink-0">BLOQUE 1 & 2</span>
                            <span>Conocer y experimentar con deportes alternativos: tower-touchball.</span>
                        </li>
                        <li className="flex gap-3 text-slate-300 text-sm bg-white/5 p-3 rounded-lg">
                            <span className="font-bold text-blue-400 shrink-0">BLOQUE 3</span>
                            <span>Desarrollar habilidades motrices en condiciones de oposición y cooperación (TODOS).</span>
                        </li>
                        <li className="flex gap-3 text-slate-300 text-sm bg-white/5 p-3 rounded-lg">
                            <span className="font-bold text-blue-400 shrink-0">BLOQUE 4</span>
                            <span>Aplicar estrategias de resolución de problemas (sociales, motrices y cognitivos) en base a roles. (4.2, 4.3, 4.4)</span>
                        </li>
                        <li className="flex gap-3 text-slate-300 text-sm bg-white/5 p-3 rounded-lg">
                            <span className="font-bold text-blue-400 shrink-0">BLOQUE 5 & 6</span>
                            <span>Reglamento, roles deportivos y habilidades específicas. (5.5, 5.6, 6.2)</span>
                        </li>
                    </ul>
                </section>

                <section className="bg-slate-900/50 rounded-xl border border-white/5 p-6 backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Boxes className="w-6 h-6 text-purple-400" />
                        Recursos y Metodología
                    </h2>
                    <div className="space-y-4 text-sm text-slate-300">
                        <div>
                            <h3 className="text-white font-semibold mb-1">Modelos Pedagógicos</h3>
                            <p className="bg-purple-500/10 border border-purple-500/20 p-2 rounded">
                                Modelo de Educación Deportiva + Aprendizaje Cooperativo (Puzzle Aronson, "think-pair-share") + Hibridación.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-1">Recursos Espaciales</h3>
                            <p className="bg-purple-500/10 border border-purple-500/20 p-2 rounded">
                                Gimnasio, Patio cubierto, Patio exterior.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-1">Recursos Materiales</h3>
                            <p className="bg-purple-500/10 border border-purple-500/20 p-2 rounded">
                                Tablets (marcador), Torre de materiales diferentes (botellas, cajas...), Material esencial.
                            </p>
                        </div>
                    </div>
                </section>
            </div>

            {/* Fundamentación Metodológica Detallada */}
            <section className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-xl border border-white/10 overflow-hidden backdrop-blur-sm">
                <div className="p-8 border-b border-white/10 relative">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                        <Brain className="w-32 h-32" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3 relative z-10">
                        <Brain className="w-8 h-8 text-purple-400" />
                        Fundamentación Metodológica Detallada
                    </h2>
                    <p className="text-lg text-slate-300 max-w-3xl relative z-10">
                        Esta unidad no es solo una secuencia de sesiones, sino la aplicación práctica de una <strong>Hibridación de Modelos Pedagógicos</strong>. Combinamos la estructura del <em>Sport Education Model</em> con estrategias de <em>Aprendizaje Cooperativo</em> para maximizar el compromiso y el aprendizaje significativo.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 p-8">
                    {/* MED Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
                            <Trophy className="w-6 h-6 text-yellow-400" />
                            <h3 className="text-xl font-bold text-white">Modelo de Educación Deportiva (MED)</h3>
                        </div>
                        <div className="space-y-4">
                            <MethodItem
                                title="Temporada"
                                desc="La unidad se estructura como una 'temporada' deportiva extendida (Semanas 3-5), permitiendo que los equipos evolucionen, practiquen y compitan con tiempo suficiente."
                            />
                            <MethodItem
                                title="Afiliación y Equipos"
                                desc="Los equipos son estables y heterogéneos. Toda la temporada se realiza con el mismo grupo, fomentando el sentido de pertenencia y la cohesión grupal."
                            />
                            <MethodItem
                                title="Festividad"
                                desc="Se crea un ambiente de evento deportivo real ('Alternative Olympics'), con ceremonias, registros y una atmósfera que celebra el deporte más allá del resultado."
                            />
                            <MethodItem
                                title="Roles"
                                desc="Fundamental para la autonomía. Los alumnos no son solo jugadores; asumen roles activos (Entrenador, Preparador Físico, Árbitro, Periodista) que rotan o se especializan, permitiendo evaluar competencias transversales."
                            />
                        </div>
                    </div>

                    {/* AC Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
                            <Users className="w-6 h-6 text-mint" />
                            <h3 className="text-xl font-bold text-white">Aprendizaje Cooperativo (AC)</h3>
                        </div>
                        <div className="space-y-4">
                            <MethodItem
                                title="Puzzle de Aronson (Jigsaw)"
                                desc={
                                    <span>
                                        Tecnica de interdependencia. Los equipos se dividen en <strong>"Grupos de Expertos"</strong> (ej. uno aprende reglamento, otro técnica). Luego vuelven a su equipo base para enseñar al resto. Todos son necesarios para el éxito del grupo.
                                    </span>
                                }
                            />
                            <MethodItem
                                title="Think-Pair-Share"
                                desc="Estrategia cognitiva. Ante un problema táctico: 1) Pienso solución individualmente, 2) Debato con mi pareja, 3) Comparto con el grupo. Fomenta la reflexión antes de la acción."
                            />
                            <MethodItem
                                title="Marcador Colectivo"
                                desc="El éxito no es solo ganar el partido. Se suman puntos por 'Fair Play', cumplimiento de roles, traer material y animar. Gana el equipo más completo, no solo el más hábil."
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Evaluacion Table */}
            <section className="bg-slate-900/50 rounded-xl border border-white/5 overflow-hidden backdrop-blur-sm">
                <div className="p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Award className="w-6 h-6 text-yellow-400" />
                        Criterios de Evaluación
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                                <th className="p-4 border-b border-white/10">Criterio</th>
                                <th className="p-4 border-b border-white/10">Situación</th>
                                <th className="p-4 border-b border-white/10">Indicador de Logro</th>
                                <th className="p-4 border-b border-white/10">Mínimo</th>
                                <th className="p-4 border-b border-white/10">Instrumento</th>
                                <th className="p-4 border-b border-white/10">%</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-slate-300 divide-y divide-white/5">
                            <TableRow
                                crit="1.3 (UD3)"
                                sit="Ejecución de roles MED"
                                ind="Cumplimiento de roles desde el respeto, empatía y responsabilidad"
                                min="No figuran registros negativos"
                                inst="Lista de control"
                                pct="5"
                            />
                            <TableRow
                                crit="4.4 (UD7)"
                                sit="Ejecución de roles MED"
                                ind="Cumplimiento de normas y cooperación"
                                min="Actuación correcta durante sesiones"
                                inst="Lista de control"
                                pct="15"
                            />
                            <TableRow
                                crit="4.6 (UD6)"
                                sit="Ejecución de roles MED"
                                ind="Actuar de forma inclusiva (no abusiva) y colaborativa"
                                min="-"
                                inst="Escala"
                                pct="20"
                            />
                            <TableRow
                                crit="6.3 (UD6)"
                                sit="Ejecución de roles MED"
                                ind="Cumplimiento de obligaciones"
                                min="Obtener evaluación positiva"
                                inst="Lista de control"
                                pct="15"
                            />
                            <TableRow
                                crit="3.2 (UD7)"
                                sit="Resolución situaciones motrices"
                                ind="Ser capaz de anticiparse u ofrecerse a recibir pases"
                                min="Roba o genera un punto en alguna ocasión"
                                inst="Rúbrica"
                                pct="15"
                            />
                            <TableRow
                                crit="3.3 (UD7)"
                                sit="Resolución situaciones motrices"
                                ind="Ejecutar pases, recepciones y robos cumpliendo reglamento"
                                min="Ejecuta al menos con la mano pases/recepciones"
                                inst="Rúbrica"
                                pct="15"
                            />
                            <TableRow
                                crit="5.2 (UD3)"
                                sit="Resolución situaciones motrices"
                                ind="Ser capaz de adaptarse a las condiciones del juego"
                                min="Desarrollo coherente del juego"
                                inst="Rúbrica"
                                pct="15"
                            />
                        </tbody>
                    </table>
                </div>
            </section>

            {/* DUA Section */}
            <section className="bg-slate-900/50 rounded-xl border border-white/5 p-6 backdrop-blur-sm">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-red-400" />
                    Atención a la Diversidad (DUA)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <DuaCard
                        title="Compromiso"
                        color="bg-red-500/10 border-red-500/20 text-red-200"
                        content="Establecer diferentes roles de participación de forma consensuada. Cada equipo tendrá que firmar su compromiso con el rol."
                    />
                    <DuaCard
                        title="Representación"
                        color="bg-red-500/10 border-red-500/20 text-red-200"
                        content="Materiales en diferentes fuentes, legibles, con imágenes de apoyo. Vídeos en EVA y aporte de documentación de apoyo."
                    />
                    <DuaCard
                        title="Acción - Expresión"
                        color="bg-red-500/10 border-red-500/20 text-red-200"
                        content="Uso de co-evaluación a través de formulario web, pudiendo entregarse a través de formulario escrito e incluso oralmente."
                    />
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                        <h3 className="font-bold text-blue-300 mb-2">Medidas Ordinarias</h3>
                        <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                            <li>Apoyar al alumnado con información cercana.</li>
                            <li>Dar feedback motivante.</li>
                            <li>Solicitar expresión en inglés (Ampliación).</li>
                            <li>Establecer roles más exigentes (Ampliación).</li>
                        </ul>
                    </div>
                    <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg">
                        <h3 className="font-bold text-orange-300 mb-2">NEAE</h3>
                        <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                            <li>Elección de rol orientado a éxito reducción estresores</li>
                            <li>Mantenimiento medidas establecidas.</li>
                            <li>MRPS como metodología refuerzo conductual (Nivel 3).</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
}

function Card({ icon, title, content }: { icon: React.ReactNode, title: string, content: React.ReactNode }) {
    return (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 hover:bg-slate-800/80 transition-colors">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/5 rounded-lg">
                    {icon}
                </div>
                <h3 className="font-semibold text-white text-sm">{title}</h3>
            </div>
            <div className="text-slate-300 font-medium">
                {content}
            </div>
        </div>
    );
}

function CompetenciaBadge({ name, levels }: { name: string, levels: string }) {
    return (
        <div className="flex flex-col items-center bg-white/5 rounded-lg p-3 text-center border border-white/5">
            <span className="font-bold text-white text-lg">{name}</span>
            <span className="text-xs text-slate-400 mt-1 bg-black/20 px-2 py-0.5 rounded-full">{levels}</span>
        </div>
    );
}

function TableRow({ crit, sit, ind, min, inst, pct }: { crit: string, sit: string, ind: string, min: string, inst: string, pct: string }) {
    return (
        <tr className="hover:bg-white/5 transition-colors">
            <td className="p-4 font-mono text-blue-300 font-bold">{crit}</td>
            <td className="p-4 text-slate-400">{sit}</td>
            <td className="p-4 font-medium text-white">{ind}</td>
            <td className="p-4 text-slate-400 text-xs">{min}</td>
            <td className="p-4 text-slate-300">{inst}</td>
            <td className="p-4 text-right">
                <span className="inline-block px-2 py-1 bg-mint/10 text-mint text-xs font-bold rounded">
                    {pct}%
                </span>
            </td>
        </tr>
    );
}

function DuaCard({ title, color, content }: { title: string, color: string, content: string }) {
    return (
        <div className={`p-4 rounded-lg border ${color}`}>
            <h3 className="font-bold mb-2 uppercase text-xs tracking-wider">{title}</h3>
            <p className="text-sm opacity-90">{content}</p>
        </div>
    );
}
