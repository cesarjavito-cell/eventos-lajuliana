import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { UserPlus, Mail, Shield, Trash2, AlertTriangle, MessageSquareShare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MobileSelect } from '@/components/ui/mobile-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, normalizeRole } from '@/lib/roles';
import { buildWhatsAppUrl } from '@/lib/pricing';

const ROLE_BADGE_STYLES = {
  admin: 'bg-rose-100 text-rose-700 hover:bg-rose-100',
  admin_jr: 'bg-violet-100 text-violet-700 hover:bg-violet-100',
  comercial: 'bg-sky-100 text-sky-700 hover:bg-sky-100',
  invitado: 'bg-stone-100 text-stone-600 hover:bg-stone-100',
};

export default function UserManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'comercial' });
  const [inviting, setInviting] = useState(false);
  const [editingRole, setEditingRole] = useState({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      if (currentUser?.id) {
        try {
          await base44.entities.User.delete(currentUser.id);
        } catch (e) {}
      }
      await base44.auth.logout();
    } finally {
      setDeleting(false);
    }
  };

  const loadUsers = useCallback(async () => {
    try {
      const data = await base44.entities.User.list();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleInvite = async () => {
    const email = inviteForm.email.trim();
    if (!email) return;
    setInviting(true);
    try {
      if (base44.users?.inviteUser) {
        try {
          await base44.users.inviteUser(email, inviteForm.role);
        } catch (e) {}
      }

      const newUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        email: email,
        full_name: email.split('@')[0],
        role: inviteForm.role,
        status: 'invited',
        created_at: new Date().toISOString()
      };

      await base44.entities.User.create(newUser);

      toast({
        title: '¡Invitación registrada!',
        description: `Se invitó a ${email} como ${ROLE_LABELS[inviteForm.role] || inviteForm.role}.`
      });

      setInviteForm({ email: '', role: 'comercial' });
      setInviteOpen(false);
      loadUsers();
    } catch (e) {
      toast({ title: 'Error', description: e.message || 'No se pudo registrar el usuario', variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await base44.entities.User.update(userId, { role: newRole });
      setEditingRole((p) => ({ ...p, [userId]: null }));
      toast({ title: 'Rol actualizado' });
      loadUsers();
    } catch (e) {
      toast({ title: 'Error', description: e.message || 'No se pudo actualizar el rol', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!confirm(`¿Eliminar al usuario ${userEmail || ''}?`)) return;
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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-semibold text-stone-700">Usuarios del sistema ({users.length})</h2>
          <p className="text-xs text-stone-500 mt-0.5">Invita usuarios y asigna roles para controlar los permisos de acceso.</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
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
                <div key={u.id || Math.random()} className="flex items-center justify-between p-4 hover:bg-stone-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-stone-800">{u.full_name || u.email}</span>
                      {u.full_name && <span className="text-xs text-stone-400">({u.email})</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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

      <div className="bg-stone-50 rounded-xl border border-stone-200 p-4">
        <h3 className="font-semibold text-stone-800 text-sm mb-1">Eliminar mi cuenta</h3>
        <p className="text-xs text-red-600 mb-3">
          Esta acción es permanente e irreversible. Se eliminará tu acceso a la plataforma y todos tus datos asociados. No podrás deshacer esta acción.
        </p>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={deleting}>
          <Trash2 className="w-4 h-4 mr-1" /> Eliminar mi cuenta
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" /> Eliminar cuenta permanentemente
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará tu cuenta y todos los datos asociados de forma permanente. Serás desconectado inmediatamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Sí, eliminar mi cuenta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4" /> Invitar usuario
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Email del invitado</Label>
              <Input
                type="email"
                placeholder="ejemplo@email.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <MobileSelect
                value={inviteForm.role}
                onValueChange={(v) => setInviteForm((p) => ({ ...p, role: v }))}
                options={Object.entries(ROLE_LABELS).filter(([k]) => k !== 'user').map(([k, v]) => ({ value: k, label: v }))}
                placeholder="Rol"
              />
              <p className="text-xs text-stone-400">{ROLE_DESCRIPTIONS[inviteForm.role]}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteForm.email.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {inviting ? 'Enviando...' : 'Enviar invitación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
