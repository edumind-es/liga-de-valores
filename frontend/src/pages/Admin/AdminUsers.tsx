/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 */

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Edit, Mail, Shield, ShieldOff, User, Users } from 'lucide-react';
import { apiClient } from '@/api/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { MetricCard } from '@/components/workspace/MetricCard';
import { ListToolbar } from '@/components/workspace/ListToolbar';
import EmptyState from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface UserData {
    id: number;
    codigo: string;
    email?: string;
    is_active: boolean;
    is_superuser: boolean;
}

interface UserUpdateData {
    codigo?: string;
    email?: string;
    password?: string;
    is_active?: boolean;
    is_superuser?: boolean;
}

export default function AdminUsers() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [formData, setFormData] = useState<UserUpdateData>({});

    useEffect(() => {
        void loadUsers();
    }, []);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.client.get('/users/');
            setUsers(response.data);
        } catch (error) {
            console.error('Error loading users:', error);
            toast.error('Error al cargar usuarios');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        const needle = searchValue.trim().toLowerCase();
        if (!needle) return users;

        return users.filter((user) =>
            [user.codigo, user.email ?? '', user.is_superuser ? 'admin' : 'usuario', user.is_active ? 'activo' : 'inactivo']
                .join(' ')
                .toLowerCase()
                .includes(needle),
        );
    }, [searchValue, users]);

    const activeUsers = useMemo(() => users.filter((user) => user.is_active).length, [users]);
    const adminUsers = useMemo(() => users.filter((user) => user.is_superuser).length, [users]);
    const usersWithEmail = useMemo(() => users.filter((user) => Boolean(user.email)).length, [users]);

    const handleEdit = (user: UserData) => {
        setSelectedUser(user);
        setFormData({
            codigo: user.codigo,
            email: user.email || '',
            password: '',
            is_active: user.is_active,
            is_superuser: user.is_superuser,
        });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!selectedUser) return;

        try {
            await apiClient.client.put(`/users/${selectedUser.id}`, formData);
            toast.success('Usuario actualizado correctamente');
            setIsDialogOpen(false);
            setSelectedUser(null);
            void loadUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            toast.error('Error al actualizar usuario');
        }
    };

    const handleToggleActive = async (user: UserData) => {
        try {
            await apiClient.client.put(`/users/${user.id}`, { is_active: !user.is_active });
            toast.success(`Usuario ${user.is_active ? 'desactivado' : 'activado'} correctamente`);
            void loadUsers();
        } catch (error) {
            console.error('Error toggling user status:', error);
            toast.error('Error al cambiar estado del usuario');
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-8">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-56" />
                    <Skeleton className="h-4 w-80" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => (
                        <Skeleton key={item} className="h-32 rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Gestión de Usuarios"
                description="Administra accesos, privilegios y calidad de los datos de cuenta desde una sola vista operativa."
                eyebrow="Administración global"
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Usuarios"
                    value={users.length}
                    support="Cuentas registradas"
                    icon={Users}
                    tone="mint"
                />
                <MetricCard
                    label="Activos"
                    value={activeUsers}
                    support="Con acceso habilitado"
                    icon={CheckCircle}
                    tone="sky"
                />
                <MetricCard
                    label="Administradores"
                    value={adminUsers}
                    support="Acceso total al sistema"
                    icon={Shield}
                    tone="vio"
                />
                <MetricCard
                    label="Con email"
                    value={usersWithEmail}
                    support="Contacto disponible"
                    icon={Mail}
                    tone="amber"
                />
            </div>

            <ListToolbar
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder="Buscar por código, email o rol"
                summary={`Mostrando ${filteredUsers.length} de ${users.length} usuarios. ${activeUsers} activos y ${adminUsers} administradores.`}
            >
                <Badge variant="outline">Acceso</Badge>
                <Badge variant="secondary">Roles</Badge>
                <Badge variant="accent">Edición rápida</Badge>
            </ListToolbar>

            <Card className="border-lme-border/90 bg-[rgba(10,20,38,0.72)] shadow-[0_18px_40px_rgba(3,10,28,0.18)]">
                <CardHeader className="border-b border-lme-border/70">
                    <CardTitle>Directorio de usuarios</CardTitle>
                    <CardDescription>
                        Revisión rápida de estado, permisos y datos básicos de acceso.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {users.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title="No hay usuarios en el sistema"
                            description="Las cuentas aparecerán aquí en cuanto se creen accesos para profesorado o administración."
                        />
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-lg font-semibold text-ink">No hay usuarios que coincidan con la búsqueda</p>
                            <p className="mt-2 text-sm text-sub">Prueba con otro código, email o estado.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto p-4">
                            <Table className="overflow-hidden rounded-2xl">
                                <TableHeader>
                                    <TableRow className="border-lme-border/80 hover:bg-transparent">
                                        <TableHead className="w-[90px]">ID</TableHead>
                                        <TableHead>Usuario</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Rol</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map((user, index) => (
                                        <TableRow
                                            key={user.id}
                                            className={index % 2 === 1 ? 'bg-[rgba(255,255,255,0.02)]' : ''}
                                        >
                                            <TableCell className="font-medium text-sub">#{user.id}</TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-ink">{user.codigo}</p>
                                                    <p className="text-xs text-sub">
                                                        {user.is_superuser ? 'Perfil de administración' : 'Perfil estándar'}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sub">{user.email || 'Sin email'}</TableCell>
                                            <TableCell>
                                                <Badge variant={user.is_active ? 'success' : 'destructive'}>
                                                    {user.is_active ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.is_superuser ? 'warning' : 'outline'}>
                                                    {user.is_superuser ? 'Administrador' : 'Usuario'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant={user.is_active ? 'ghost' : 'secondary'}
                                                        size="sm"
                                                        onClick={() => handleToggleActive(user)}
                                                    >
                                                        {user.is_active ? <ShieldOff className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                                        {user.is_active ? 'Bloquear' : 'Activar'}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(user)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                        Editar
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Editar usuario</DialogTitle>
                        <DialogDescription>
                            Ajusta datos básicos, restablece contraseña y define el nivel de acceso.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 py-2">
                        <div className="rounded-2xl border border-lme-border/80 bg-[rgba(255,255,255,0.03)] p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-lme-border bg-white/5">
                                    {formData.is_superuser ? (
                                        <Shield className="h-6 w-6 text-amber-300" />
                                    ) : (
                                        <User className="h-6 w-6 text-sky" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sub">Resumen</p>
                                    <p className="mt-1 text-lg font-bold text-ink">{formData.codigo || 'Usuario sin código'}</p>
                                    <p className="text-sm text-sub">
                                        {formData.is_superuser ? 'Acceso completo de administración' : 'Acceso estándar a la plataforma'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="user-code">Código de usuario</Label>
                                <Input
                                    id="user-code"
                                    value={formData.codigo || ''}
                                    onChange={(event) => setFormData({ ...formData, codigo: event.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="user-email">Email</Label>
                                <Input
                                    id="user-email"
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                                    placeholder="usuario@centro.es"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="user-password">Nueva contraseña</Label>
                            <Input
                                id="user-password"
                                type="password"
                                placeholder="Déjala vacía si no quieres cambiarla"
                                value={formData.password || ''}
                                onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-lme-border/80 bg-[rgba(255,255,255,0.03)] p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-ink">Acceso habilitado</p>
                                        <p className="mt-1 text-sm text-sub">
                                            {formData.is_active ? 'El usuario podrá iniciar sesión.' : 'La cuenta quedará bloqueada.'}
                                        </p>
                                    </div>
                                    <Switch
                                        id="is_active"
                                        checked={formData.is_active}
                                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                    />
                                </div>
                            </div>

                            <div className="rounded-2xl border border-lme-border/80 bg-[rgba(255,255,255,0.03)] p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-ink">Permisos de administración</p>
                                        <p className="mt-1 text-sm text-sub">
                                            {formData.is_superuser ? 'Tendrá acceso total a configuración y gestión.' : 'Mantendrá permisos estándar.'}
                                        </p>
                                    </div>
                                    <Switch
                                        id="is_superuser"
                                        checked={formData.is_superuser}
                                        onCheckedChange={(checked) => setFormData({ ...formData, is_superuser: checked })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave}>
                            Guardar cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
