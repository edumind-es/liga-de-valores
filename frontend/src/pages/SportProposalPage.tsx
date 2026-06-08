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

import SportProposalForm from "@/components/forms/SportProposalForm";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function SportProposalPage() {
    return (
        <div className="lme-body min-h-screen p-4 md:p-8">
            <div className="lme-gradient"></div>
            <div className="relative z-10 mx-auto max-w-2xl">
                <div className="mb-8 flex items-center gap-4">
                    <Link
                        to="/"
                        className="rounded-full border border-lme-border bg-white/5 p-2 text-sub transition-colors hover:bg-white/10 hover:text-ink"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                            Proponer Nuevo Deporte
                        </h1>
                        <p className="mt-1 text-sm text-sub">
                            Ayúdanos a ampliar EDUmind añadiendo deportes alternativos o populares.
                        </p>
                    </div>
                </div>

                <div className="lme-shell">
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-ink">Formulario de Solicitud</h2>
                        <p className="text-sm text-sub">
                            Completa los detalles para que podamos configurar el marcador y las reglas correctamente.
                        </p>
                    </div>

                    <SportProposalForm />
                </div>
            </div>
        </div>
    );
}
