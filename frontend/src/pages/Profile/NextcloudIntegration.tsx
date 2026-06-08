/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cloud, CheckCircle, XCircle, Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface NextcloudConfig {
    nextcloud_url: string | null;
    nextcloud_user: string | null;
    is_configured: boolean;
}

export default function NextcloudIntegration() {
    const queryClient = useQueryClient();
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [formData, setFormData] = useState({
        nextcloud_url: '',
        nextcloud_user: '',
        nextcloud_password: '', // Always empty initially (security)
    });

    const { data: config, isLoading } = useQuery<NextcloudConfig>({
        queryKey: ['nextcloud-config'],
        queryFn: async () => {
            const res = await apiClient.client.get('/auth/me/integration/nextcloud');
            return res.data;
        }
    });

    // Update form when data loads (only url and user)
    if (config && formData.nextcloud_url === '' && !isLoading) {
        setFormData({
            nextcloud_url: config.nextcloud_url || '',
            nextcloud_user: config.nextcloud_user || '',
            nextcloud_password: '',
        });
    }

    const updateMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const res = await apiClient.client.put('/auth/me/integration/nextcloud', data);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Configuración guardada correctamente');
            queryClient.invalidateQueries({ queryKey: ['nextcloud-config'] });
            setFormData(prev => ({ ...prev, nextcloud_password: '' })); // Clear password after save
        },
        onError: () => {
            toast.error('Error al guardar la configuración');
        }
    });

    const testConnectionMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const res = await apiClient.client.post('/auth/me/integration/nextcloud/test', data);
            return res.data;
        },
        onMutate: () => setTestStatus('testing'),
        onSuccess: () => {
            setTestStatus('success');
            toast.success('¡Conexión exitosa! Se ha verificado el acceso a tu nube.');
        },
        onError: (error: unknown) => {
            setTestStatus('error');
            const detail = isAxiosError(error) && error.response?.data && typeof error.response.data === 'object'
                ? (error.response.data as { detail?: string }).detail
                : undefined;
            const msg = detail || 'No se pudo conectar con el servidor.';
            toast.error(`Error de conexión: ${msg}`);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await apiClient.client.delete('/auth/me/integration/nextcloud');
        },
        onSuccess: () => {
            toast.success('Configuración eliminada');
            queryClient.invalidateQueries({ queryKey: ['nextcloud-config'] });
            setFormData({ nextcloud_url: '', nextcloud_user: '', nextcloud_password: '' });
            setTestStatus('idle');
        }
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nextcloud_password) {
            toast.error('Debes introducir la contraseña para guardar');
            return;
        }
        updateMutation.mutate(formData);
    };

    const handleTest = () => {
        if (!formData.nextcloud_url || !formData.nextcloud_user || !formData.nextcloud_password) {
            toast.error('Completa todos los campos para probar (incluida la contraseña)');
            return;
        }
        testConnectionMutation.mutate(formData);
    };

    return (
        <Card className="border-blue-200 bg-blue-50/20 max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Cloud className="h-6 w-6" />
                    Integración con Nextcloud (Boxabalar)
                </CardTitle>
                <CardDescription>
                    Configura tu nube personal para recibir automáticamente copia de las fichas de los alumnos.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm text-sm text-gray-600 mb-4">
                    <p className="font-medium text-blue-800 mb-1">🔒 Seguridad y Privacidad</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Tus credenciales se guardan <strong>cifradas</strong> (encriptación militar AES/Fernet).</li>
                        <li>Solo se usan para subir los PDFs de tus ligas.</li>
                        <li>Recomendamos usar una <strong>Contraseña de Aplicación</strong> en lugar de tu clave principal.</li>
                    </ul>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="url">URL del Servidor (WebDAV)</Label>
                    <Input
                        id="url"
                        placeholder="https://boxabalar.edu.xunta.gal/remote.php/dav/files/USUARIO/"
                        value={formData.nextcloud_url}
                        onChange={e => setFormData({ ...formData, nextcloud_url: e.target.value })}
                        disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                        Debe ser la ruta WebDAV completa. Para Boxabalar suele terminar en <code>/remote.php/dav/files/TU_USUARIO/</code>
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="user">Usuario</Label>
                        <Input
                            id="user"
                            placeholder="luisvilela"
                            value={formData.nextcloud_user}
                            onChange={e => setFormData({ ...formData, nextcloud_user: e.target.value })}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pass">Contraseña / App Password</Label>
                        <Input
                            id="pass"
                            type="password"
                            placeholder={config?.is_configured ? "•••••••• (Guardada)" : "Introduce tu contraseña"}
                            value={formData.nextcloud_password}
                            onChange={e => setFormData({ ...formData, nextcloud_password: e.target.value })}
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {testStatus === 'error' && (
                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                        <XCircle className="h-4 w-4" />
                        Error de conexión. Revisa los datos.
                    </div>
                )}

                {testStatus === 'success' && (
                    <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-2 rounded">
                        <CheckCircle className="h-4 w-4" />
                        Conexión verificada correctamente.
                    </div>
                )}

            </CardContent>
            <CardFooter className="flex justify-between border-t border-blue-100 pt-4">
                <Button
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => deleteMutation.mutate()}
                    disabled={!config?.is_configured}
                >
                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar Configuración
                </Button>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleTest}
                        disabled={testConnectionMutation.isPending || !formData.nextcloud_url}
                    >
                        {testConnectionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Probar Conexión'}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Save className="h-4 w-4 mr-2" /> Guardar
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
