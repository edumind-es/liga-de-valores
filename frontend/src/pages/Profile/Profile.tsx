import DashboardLayout from '@/layouts/DashboardLayout';
import NextcloudIntegration from './NextcloudIntegration';
import { useAuthStore } from '@/store/authStore';
import { User, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Profile() {
    const { user } = useAuthStore();

    return (
        <DashboardLayout>
            <div className="container mx-auto py-8 px-4 max-w-4xl">
                <div className="flex items-center gap-4 mb-8">
                    <div className="bg-blue-900/30 p-3 rounded-full">
                        <User className="h-8 w-8 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-ink">Perfil de Usuario</h1>
                        <p className="text-sub">Gestiona tu cuenta y tus integraciones</p>
                    </div>
                </div>

                <div className="grid gap-6">
                    {/* Datos Básicos */}
                    <div className="lme-card">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-ink">
                            <Shield className="h-5 w-5 text-sub" />
                            Datos de Cuenta
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-sub">Nombre / Código</label>
                                <div className="mt-1 text-ink font-medium">{user?.codigo}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-sub">Email</label>
                                <div className="mt-1 text-ink font-medium">{user?.email || 'No definido'}</div>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-lme-border">
                            <Link
                                to="/change-password"
                                className="text-sky hover:text-mint text-sm font-medium hover:underline"
                            >
                                Cambiar contraseña →
                            </Link>
                        </div>
                    </div>

                    {/* Integraciones */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4 text-ink">Integraciones</h2>
                        <NextcloudIntegration />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

