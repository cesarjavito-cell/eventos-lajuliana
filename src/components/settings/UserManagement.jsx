import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { MobileSelect } from '@/components/ui/mobile-select';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, normalizeRole } from '@/lib/roles';
import { UserPlus, Trash2, Shield, MessageSquareShare, TestTube } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const ROLE_BADGE_STYLES = {
  admin: 'bg-rose-100 text-rose-800 hover:bg-rose-100',
  admin_jr: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  comercial: 'bg-sky-100 text-sky-800 hover:bg-sky-100',
  invitado: 'bg-stone-100 text-stone-700 hover:bg-stone-100',
};

export default function UserManagement() {
  const { toast } = useToast();
  const { user, setSimulatedRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('comercial');
  const [inviting, setInviting] = useState(false);
  const [editingRole, setEditingRole] = useState({});

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.User.list();
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn('Error loading users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const role = normalizeRole(inviteRole);
      const newUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        email: inviteEmail.trim().toLowerCase(),
        full_name: inviteName.trim() || inviteEmail.trim(),
        role: role,
        created_at: new Date().toISOString(),
      };
      await base44.entities.User.create(newUser);

      toast({
        title: 'Usuario registrado',
        description: `Se asignó el rol ${ROLE_LABELS[role]} a ${inviteEmail}.`,
      });

      setInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('comercial');
      loadUsers();
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo registrar el usuario.', variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      const role = normalizeRole(newRole);
      await base44.entities.User.update(userId, { role });
      toast({ title: 'Rol actualizado', description: `Nuevo rol: ${ROLE_LABELS[role]}` });
      setEditingRole((prev) => ({ ...prev, [userId]: false }));
      loadUsers();
    } catch (e) {
      toast({ title: 'Error al cambiar rol', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!confirm(`¿Eliminar al usuario ${email}?`)) return;
    try {
      await base44.entities.User.delete(userId);
      toast({ title: 'Usuario eliminado' });
      loadUsers();
    } catch (e) {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  const handleSendWhatsAppInvite = (u) => {
    const roleName = ROLE_LABELS[normalizeRole(u.role)] || u.role;
    const msg = `Hola! Te invito a ingresar al sistema de Quinta La Juliana como *${roleName}*.\n\nAccede directamente aquí:\nhttps://catering-pro-tfcv.vercel.app`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const currentEffectiveRole = normalizeRole(user?.role);

  return (
    <div>
      {/* Probador / Simulador de Roles */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <TestTube className="w-5 h-5 text-amber-700 shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-900 text-sm">Simulador de Permisos y Vistas</h3>
            <p className="text-xs text-amber-700">Prueba cómo ve la app un usuario según su rol asignado.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MobileSelect
            value={currentEffectiveRole}
            onValueChange={(v) => {
              if (v === 'reset') setSimulatedRole(null);
              else setSimulatedRole(v);
            }}
            options={[
              { value: 'admin', label: '👑 Administrador General' },
              { value: 'admin_jr', label: '💼 Administrador Jr' },
              { value: 'comercial', label: '📊 Comercial (Solo Calendario + Presupuestos)' },
              { value: 'invitado', label: '👁️ Invitado (Solo Lectura Calendario)' },
              { value: 'reset', label: '↺ Restaurar Rol Real' },
            ]}
            className="w-[240px] text-xs h-9 bg-white border-amber-300"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-stone-700">Usuarios del sistema ({users.length})</h2>
          <p className="text-xs text-stone-500 mt-0.5">Invita usuarios y asigna roles para controlar los permisos de acceso.</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
          <UserPlus className="w-4 h-4 mr-1" /> Invitar usuario
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-6">
        {loading ? (
          <p className="p-8 text-center text-stone-400 text-sm">Cargando usuarios...</p>
        ) : users.length === 0 ? (
          <p className="p-8 text-center text-stone-400 text-sm">No hay usuarios registrados todavía. Haz clic en "Invitar usuario" para agregar al equipo.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {users.map((u) => {
              const role = normalizeRole(u.role);
              const isEditing = editingRole[u.id];
              return (
                <div key={u.id || Math.random()} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-stone-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-stone-800">{u.full_name || u.email}</span>
                      {u.full_name && <span className="text-xs text-stone-400">({u.email})</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendWhatsAppInvite(u)}
                      className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-8"
                      title="Enviar enlace por WhatsApp"
                    >
                      <MessageSquareShare className="w-3.5 h-3.5 mr-1" /> Enviar por WhatsApp
                    </Button>

                    {isEditing ? (
                      <>
                        <MobileSelect
                          value={role}
                          onValueChange={(v) => handleChangeRole(u.id, v)}
                          options={Object.entries(ROLE_LABELS).filter(([k]) => k !== 'user').map(([k, v]) => ({ value: k, label: v }))}
                          placeholder="Rol"
                          className="w-[180px] h-8 text-xs"
                        />
                        <Button variant="ghost" size="sm" onClick={() => setEditingRole((p) => ({ ...p, [u.id]: false }))}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge className={`text-xs ${ROLE_BADGE_STYLES[role] || ''}`}>
                          {ROLE_LABELS[role] || role}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => setEditingRole((p) => ({ ...p, [u.id]: true }))}>
                          Cambiar rol
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDeleteUser(u.id, u.email)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#C9A04E]" /> Invitar Nuevo Usuario
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-stone-600">Nombre del Usuario</Label>
              <Input
                placeholder="Ej: Laura Vendedora"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-stone-600">Correo Electrónico *</Label>
              <Input
                type="email"
                required
                placeholder="usuario@ejemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-stone-600">Rol Asignado *</Label>
              <MobileSelect
                value={inviteRole}
                onValueChange={setInviteRole}
                options={Object.entries(ROLE_LABELS).filter(([k]) => k !== 'user').map(([k, v]) => ({
                  value: k,
                  label: `${v} - ${ROLE_DESCRIPTIONS[k] || ''}`,
                }))}
                className="mt-1"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={inviting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {inviting ? 'Guardando...' : 'Guardar e Invitar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
