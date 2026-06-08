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

import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ErrorBoundary from './components/ErrorBoundary';
import { OfflineProvider } from './components/offline';
import { refreshAuthenticatedSession } from './api/client';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MisLigas = lazy(() => import('./pages/Ligas/MisLigas'));
const CrearLiga = lazy(() => import('./pages/Ligas/CrearLiga'));
const VerLiga = lazy(() => import('./pages/Ligas/VerLiga'));
const ConfiguracionLiga = lazy(() => import('./pages/Ligas/ConfiguracionLiga'));
const GestionCriterios = lazy(() => import('./pages/Ligas/GestionCriterios'));
const FichasLiga = lazy(() => import('./pages/Ligas/FichasLiga'));
const FaseFinalPage = lazy(() => import('./pages/Ligas/FaseFinal'));
const ListaEquipos = lazy(() => import('./pages/Equipos/ListaEquipos'));
const CrearEquipo = lazy(() => import('./pages/Equipos/CrearEquipo'));
const EditarEquipo = lazy(() => import('./pages/Equipos/EditarEquipo'));
const EquipoAnalytics = lazy(() => import('./pages/Equipos/EquipoAnalytics'));
const ListaJornadas = lazy(() => import('./pages/Jornadas/ListaJornadas'));
const CrearJornada = lazy(() => import('./pages/Jornadas/CrearJornada'));
const ListaPartidos = lazy(() => import('./pages/Partidos/ListaPartidos'));
const CrearPartido = lazy(() => import('./pages/Partidos/CrearPartido'));
const VerPartido = lazy(() => import('./pages/Partidos/VerPartido'));
const Clasificacion = lazy(() => import('./pages/Ligas/Clasificacion'));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const PublicLayout = lazy(() => import('@/layouts/PublicLayout'));
const PublicLogin = lazy(() => import('@/pages/Public/PublicLogin'));
const PublicDashboard = lazy(() => import('./pages/Public/PublicDashboard'));
const ExpressLanding = lazy(() => import('./pages/Express/ExpressLanding'));
const ExpressWizard = lazy(() => import('./pages/Express/ExpressWizard'));
const ExpressMatch = lazy(() => import('./pages/Express/ExpressMatch'));
const ExpressActa = lazy(() => import('./pages/Express/ExpressActa'));
const GeneradorFichas = lazy(() => import('@/pages/Public/GeneradorFichas'));
const RepositorioJuegos = lazy(() => import('@/pages/Resources/RepositorioJuegos'));
const PinAccess = lazy(() => import('@/pages/Public/PinAccess'));
const WikiJuegos = lazy(() => import('@/pages/Public/WikiJuegos'));
const FichaJuegoDetalle = lazy(() => import('@/pages/Public/FichaJuegoDetalle'));
const PublicTeamPortal = lazy(() => import('@/pages/Public/PublicTeamPortal'));
const SportProposalPage = lazy(() => import('./pages/SportProposalPage'));
const AdminSportProposals = lazy(() => import('./pages/Admin/AdminSportProposals'));
const AdminSports = lazy(() => import('./pages/Admin/AdminSports'));
const AdminUsers = lazy(() => import('./pages/Admin/AdminUsers'));
const AdminTeams = lazy(() => import('./pages/Admin/AdminTeams'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Profile = lazy(() => import('./pages/Profile/Profile'));
const FAQ = lazy(() => import('./pages/FAQ'));
const DidacticExample = lazy(() => import('./pages/DidacticExample'));
const PartidoPublico = lazy(() => import('@/pages/Public/PartidoPublico'));
const PwaGuide = lazy(() => import('./pages/PwaGuide'));

function RouteFallback() {
  return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <RouteFallback />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  const { fetchCurrentUser, expireSession, isAuthenticated } = useAuthStore();

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    const onAuthExpired = () => {
      expireSession();
    };

    window.addEventListener('edumind:auth-expired', onAuthExpired);
    return () => window.removeEventListener('edumind:auth-expired', onAuthExpired);
  }, [expireSession]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshSession = async () => {
      if (document.hidden) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;

      try {
        // notifyOnFailure: false — el timer de refresco no debe expulsar la sesión;
        // la expiración real ya la gestiona el interceptor de Axios en las peticiones normales.
        await refreshAuthenticatedSession({ notifyOnFailure: false });
      } catch {
        // Handled globally by auth interceptors.
      }
    };

    const intervalId = window.setInterval(refreshSession, 5 * 60 * 1000);
    const onVisibilityChange = () => {
      if (!document.hidden) {
        void refreshSession();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isAuthenticated]);

  return (
    <ErrorBoundary>
      <OfflineProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/proponer-deporte" element={<SportProposalPage />} />

          {/* Express Scoreboard - Public Routes */}
          <Route path="/express">
            <Route index element={<ExpressLanding />} />
            <Route path="nuevo" element={<ExpressWizard />} />
            <Route path="partido/:matchId" element={<ExpressMatch />} />
            <Route path="acta/:matchId" element={<ExpressActa />} />
          </Route>

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/pin"
            element={<PinAccess />}
          />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/ejemplo-didactico" element={<DidacticExample />} />

          {/* Admin Routes */}
          <Route
            path="/admin/proposals"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AdminSportProposals />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/sports"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AdminSports />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AdminUsers />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/teams"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AdminTeams />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Ligas */}
          <Route
            path="/ligas"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MisLigas />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ligas/crear"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CrearLiga />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ligas/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <VerLiga />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ligas/:id/fichas"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <FichasLiga />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ligas/:ligaId/fase-final"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <FaseFinalPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ligas/:id/configuracion"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ConfiguracionLiga />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ligas/:id/criterios"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <GestionCriterios />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Equipos */}
          <Route
            path="/ligas/:ligaId/equipos"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ListaEquipos />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ligas/:ligaId/equipos/crear"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CrearEquipo />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ligas/:ligaId/equipos/:equipoId/editar"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EditarEquipo />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ligas/:ligaId/equipos/:equipoId/analytics"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EquipoAnalytics />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Jornadas */}
          <Route
            path="/ligas/:ligaId/jornadas"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ListaJornadas />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ligas/:ligaId/jornadas/crear"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CrearJornada />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Partidos */}
          <Route
            path="/ligas/:ligaId/partidos"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ListaPartidos />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ligas/:ligaId/partidos/crear"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CrearPartido />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ligas/:id/clasificacion"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Clasificacion />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ligas/:ligaId/partidos/:partidoId"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <VerPartido />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Team Portal - Public */}
          <Route path="/team/:token" element={<PublicTeamPortal />} />

          {/* Acceso de alumnos a partidos via PIN */}
          <Route path="/partido" element={<PartidoPublico />} />
          <Route path="/partido/:pin" element={<PartidoPublico />} />

          {/* Guia PWA */}
          <Route path="/pwa" element={<PwaGuide />} />

          {/* Rutas Públicas */}
          <Route path="/wiki-juegos" element={<WikiJuegos />} />
          <Route path="/wiki-juegos/:id" element={<FichaJuegoDetalle />} />
          <Route path="/repositorio-juegos" element={<RepositorioJuegos />} />

          <Route path="/public" element={<PublicLayout />}>
            <Route path=":ligaId/login" element={<PublicLogin />} />
            <Route path=":ligaId/dashboard" element={<PublicDashboard />} />
            <Route path=":ligaId/fichas/generar" element={<GeneradorFichas />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </OfflineProvider>
    </ErrorBoundary>
  );
}

export default App;
