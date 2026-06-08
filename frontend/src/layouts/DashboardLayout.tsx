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

import { Navbar } from '@/components/layout/Navbar';
import EDUmindFooter from '@/components/EDUmindFooter';
import { APP_BUILD_INFO } from '@/lib/appBuild';
import { NetworkStatusIndicator } from '@/components/offline';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="app-shell app-shell--private min-h-screen flex flex-col relative">
            <a className="skip-to-content" href="#main-content">Saltar al contenido principal</a>
            <div className="lme-gradient"></div>

            <Navbar />
            <div className="lg:hidden">
                <NetworkStatusIndicator position="floating" />
            </div>

            <main id="main-content" className="lme-main flex-grow py-6">
                <div className="container-xl">
                    <div className="lme-shell saas-panel">
                        {children}
                    </div>
                </div>
            </main>

            <EDUmindFooter
                appName="Liga EDUmind"
                version={APP_BUILD_INFO.version}
                versionStage={APP_BUILD_INFO.stage}
                feedbackUrl="mailto:contacto@edumind.es"
                homeHref="/dashboard"
                locale="es"
                hideNavigation={true}
                density="compact"
            />

        </div>
    );
}
