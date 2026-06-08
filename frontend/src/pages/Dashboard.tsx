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
import { useTranslation } from 'react-i18next';

function renderWithStrong(text: string): React.ReactNode {
    return text.split(/(<strong>.*?<\/strong>)/).map((part, i) => {
        const match = part.match(/^<strong>(.*)<\/strong>$/);
        return match ? <strong key={i}>{match[1]}</strong> : part;
    });
}
import {
    BarChart2,
    BookOpen,
    Calendar,
    Download,
    HelpCircle,
    Lightbulb,
    Loader2,
    Plus,
    Settings,
    Trophy,
    Users,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useLigas } from '@/hooks/useLigas';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PendingActionsPanel from '@/components/PendingActionsPanel';
import { ActionTile } from '@/components/workspace/ActionTile';
import { MetricCard } from '@/components/workspace/MetricCard';
import { getErrorMessage } from '@/utils/apiUtils';
import { usePwaInstall } from '@/hooks/usePwaInstall';

export default function Dashboard() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { data: ligas, isLoading, error } = useLigas();
    const { canInstall, install } = usePwaInstall();

    const totalLigas = ligas?.length ?? 0;
    const ligasActivas = ligas?.filter((liga) => liga.activa).length ?? 0;
    const ligasPersonalizadas = ligas?.filter((liga) => liga.modo_evaluacion === 'personalizado').length ?? 0;
    const ligasClasicas = totalLigas - ligasPersonalizadas;
    const greeting = user?.codigo ? `${t('dashboard.hello')} ${user.codigo}` : t('dashboard.welcome');

    if (error) {
        return (
            <div className="space-y-5">
                <PageHeader
                    title={greeting}
                    description={t('dashboard.description')}
                    eyebrow="Panel docente"
                />
                <Card className="border border-red-500/35 bg-red-500/10">
                    <CardContent className="pt-6">
                        <p className="font-semibold text-red-200">{t('common.error')}</p>
                        <p className="mt-1 text-sm text-red-100/90">{getErrorMessage(error)}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <PageHeader
                    title={greeting}
                    description={t('dashboard.description')}
                    eyebrow="Panel docente"
                >
                    <Skeleton className="h-8 w-36" />
                </PageHeader>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => (
                        <Skeleton key={item} className="h-32 rounded-2xl" />
                    ))}
                </div>

                <div className="flex items-center justify-center py-10">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-mint" aria-hidden="true" />
                        <p className="text-sub text-sm">{t('dashboard.loadingLeagues')}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <PageHeader
                title={greeting}
                description={t('dashboard.description')}
                eyebrow="Panel docente"
            >
                <Badge variant="outline">{totalLigas} {t('dashboard.myLeagues')}</Badge>
                <Badge variant="secondary">{ligasActivas} {t('dashboard.active')}</Badge>
                <Button asChild className="gap-2">
                    <Link to="/ligas/crear">
                        <Plus className="h-5 w-5" aria-hidden="true" />
                        {t('dashboard.createNewLeague')}
                    </Link>
                </Button>
            </PageHeader>

            {/* Banner instalación PWA docente — solo visible cuando el navegador lo permite */}
            {canInstall && (
                <button
                    type="button"
                    onClick={install}
                    className="flex w-full items-center gap-4 rounded-2xl border border-[#2a4060] bg-[rgba(61,218,215,0.06)] px-5 py-3.5 text-left transition-colors hover:bg-[rgba(61,218,215,0.1)]"
                    aria-label="Instalar Liga EDUmind como aplicación en este dispositivo"
                >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(61,218,215,0.15)]">
                        <Download className="h-5 w-5 text-[#3ddad7]" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#3ddad7]">Instalar Liga EDUmind en este dispositivo</p>
                        <p className="text-xs text-[var(--lme-text-sub)] truncate">
                            Accede más rápido y trabaja offline sin abrir el navegador.
                        </p>
                    </div>
                    <span className="shrink-0 rounded-lg border border-[#2a5080] px-3 py-1.5 text-xs font-medium text-[#3ddad7]">
                        Instalar
                    </span>
                </button>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label={t('dashboard.statsTotalLeagues')}
                    value={totalLigas}
                    support={t('dashboard.myLeagues')}
                    icon={Trophy}
                    tone="mint"
                />
                <MetricCard
                    label={t('dashboard.statsActiveLeagues')}
                    value={ligasActivas}
                    support={t('dashboard.active')}
                    icon={Calendar}
                    tone="sky"
                />
                <MetricCard
                    label={t('dashboard.statsCustomEvaluation')}
                    value={ligasPersonalizadas}
                    support={t('dashboard.modeCustom')}
                    icon={BookOpen}
                    tone="vio"
                />
                <MetricCard
                    label={t('dashboard.statsClassicEvaluation')}
                    value={ligasClasicas}
                    support={t('dashboard.modeClassic')}
                    icon={BarChart2}
                    tone="amber"
                />
            </div>

            {ligas && ligas.length > 0 ? (
                <Card className="border-lme-border/90 bg-[rgba(10,20,38,0.72)] shadow-[0_20px_44px_rgba(3,10,28,0.2)]">
                    <CardHeader className="border-b border-lme-border/70">
                        <CardTitle>{t('dashboard.myLeagues')}</CardTitle>
                        <CardDescription>{t('dashboard.recentActivity')}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2 xl:grid-cols-3">
                        {ligas.map((liga) => (
                            <Card
                                key={liga.id}
                                className="group overflow-hidden border-lme-border/90 bg-[rgba(8,18,34,0.78)] shadow-[0_18px_38px_rgba(3,10,28,0.18)] transition-transform duration-200 hover:-translate-y-1"
                            >
                                <CardContent className="flex h-full flex-col gap-4 p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <Link to={`/ligas/${liga.id}`} className="no-underline">
                                                <p className="text-lg font-semibold leading-tight text-ink transition-colors group-hover:text-mint">
                                                    {liga.nombre}
                                                </p>
                                            </Link>
                                            <p className="mt-1 text-xs uppercase tracking-[0.08em] text-sub">
                                                {liga.temporada || t('dashboard.currentSeason')}
                                            </p>
                                        </div>
                                        <Badge variant={liga.activa ? 'success' : 'secondary'}>
                                            {liga.activa ? t('dashboard.active') : `ID ${liga.id}`}
                                        </Badge>
                                    </div>

                                    <p className="min-h-[3.2rem] text-sm leading-relaxed text-sub line-clamp-2">
                                        {liga.descripcion || t('dashboard.noDescription')}
                                    </p>

                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant={liga.modo_evaluacion === 'personalizado' ? 'accent' : 'secondary'}>
                                            {liga.modo_evaluacion === 'personalizado' ? t('dashboard.modeCustom') : t('dashboard.modeClassic')}
                                        </Badge>
                                        <Badge variant="outline">
                                            {liga.modo_competicion === 'multi_deporte' ? t('dashboard.multiSport') : t('dashboard.singleSport')}
                                        </Badge>
                                    </div>

                                    <Button asChild className="w-full gap-2">
                                        <Link to={`/ligas/${liga.id}`}>
                                            <Trophy className="h-4 w-4" aria-hidden="true" />
                                            {t('dashboard.openLeaguePanel')}
                                        </Link>
                                    </Button>

                                    <div className="mt-auto flex flex-wrap gap-2">
                                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                                            <Link to={`/ligas/${liga.id}/equipos`}>
                                                <Users className="h-4 w-4" aria-hidden="true" />
                                                {t('teams.title')}
                                            </Link>
                                        </Button>
                                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                                            <Link to={`/ligas/${liga.id}/jornadas`}>
                                                <Calendar className="h-4 w-4" aria-hidden="true" />
                                                {t('dashboard.calendar')}
                                            </Link>
                                        </Button>
                                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                                            <Link to={`/ligas/${liga.id}/clasificacion`}>
                                                <BarChart2 className="h-4 w-4" aria-hidden="true" />
                                                {t('leagues.standings')}
                                            </Link>
                                        </Button>
                                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                                            <Link to={`/ligas/${liga.id}/configuracion`}>
                                                <Settings className="h-4 w-4" aria-hidden="true" />
                                                {t('leagues.settings')}
                                            </Link>
                                        </Button>
                                        {liga.modo_evaluacion === 'personalizado' && (
                                            <Button asChild variant="outline" size="sm" className="gap-1.5">
                                                <Link to={`/ligas/${liga.id}/criterios`}>
                                                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                                                    {t('dashboard.criteria')}
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </CardContent>
                </Card>
            ) : (
                <Card variant="glass" className="py-14 text-center">
                    <CardContent className="mx-auto flex max-w-md flex-col items-center">
                        <div className="mb-6 rounded-2xl bg-gradient-to-r from-mint/20 to-sky/20 p-4">
                            <Trophy className="h-12 w-12 text-mint" aria-hidden="true" />
                        </div>
                        <h3 className="mb-3 text-2xl font-bold text-ink">
                            {t('dashboard.startFirstLeague')}
                        </h3>
                        <p className="mb-8 text-sub">
                            {t('dashboard.startFirstLeagueDesc')}
                        </p>
                        <Button asChild size="lg" className="gap-2">
                            <Link to="/ligas/crear">
                                <Plus className="h-5 w-5" aria-hidden="true" />
                                {t('dashboard.createLeagueNow')}
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Card className="border-lme-border/90 bg-[rgba(10,20,38,0.72)] shadow-[0_18px_38px_rgba(3,10,28,0.18)]">
                <CardHeader className="border-b border-lme-border/70">
                    <CardTitle>{t('dashboard.quickActions')}</CardTitle>
                    <CardDescription>{t('dashboard.pendingActionsDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                    <PendingActionsPanel />
                </CardContent>
            </Card>

            <Card className="border-lme-border/90 bg-[rgba(10,20,38,0.72)] shadow-[0_18px_38px_rgba(3,10,28,0.18)]">
                <CardHeader className="border-b border-lme-border/70">
                    <CardTitle>{t('dashboard.quickHelpTitle')}</CardTitle>
                    <CardDescription>{t('dashboard.quickHelpDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
                    <ActionTile
                        title={t('dashboard.faqWhatCanIDo')}
                        description={<span>{renderWithStrong(t('dashboard.faqWhatCanIDoAnswer'))}</span>}
                        icon={HelpCircle}
                        tone="sky"
                    />
                    <ActionTile
                        title={t('dashboard.faqHowToCreate')}
                        description={<span>{renderWithStrong(t('dashboard.faqHowToCreateAnswer'))}</span>}
                        icon={Lightbulb}
                        tone="mint"
                    />
                    <ActionTile
                        title={t('dashboard.quickTip')}
                        description={t('dashboard.quickTipAnswer')}
                        icon={Lightbulb}
                        tone="vio"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
