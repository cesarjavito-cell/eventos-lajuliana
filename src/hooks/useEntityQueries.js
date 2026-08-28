import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// ==================== BUDGETS ====================
export const BUDGETS_KEY = ['budgets'];

export function useBudgetsQuery() {
  return useQuery({
    queryKey: BUDGETS_KEY,
    queryFn: () => base44.entities.Budget.list('-created_date', 200),
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => base44.entities.Budget.create(data),
    onMutate: async (newBudget) => {
      await qc.cancelQueries(BUDGETS_KEY);
      const prev = qc.getQueryData(BUDGETS_KEY);
      qc.setQueryData(BUDGETS_KEY, (old) => [
        { ...newBudget, id: `temp-${Date.now()}`, created_date: new Date().toISOString() },
        ...(old || []),
      ]);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(BUDGETS_KEY, ctx.prev),
    onSettled: () => qc.invalidateQueries(BUDGETS_KEY),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => base44.entities.Budget.update(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries(BUDGETS_KEY);
      const prev = qc.getQueryData(BUDGETS_KEY);
      qc.setQueryData(BUDGETS_KEY, (old) =>
        (old || []).map((b) => (b.id === id ? { ...b, ...data } : b))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(BUDGETS_KEY, ctx.prev),
    onSettled: () => qc.invalidateQueries(BUDGETS_KEY),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => base44.entities.Budget.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries(BUDGETS_KEY);
      const prev = qc.getQueryData(BUDGETS_KEY);
      qc.setQueryData(BUDGETS_KEY, (old) => (old || []).filter((b) => b.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(BUDGETS_KEY, ctx.prev),
    onSettled: () => qc.invalidateQueries(BUDGETS_KEY),
  });
}

// ==================== EVENTS ====================
export const EVENTS_KEY = ['events'];

export function useEventsQuery() {
  return useQuery({
    queryKey: EVENTS_KEY,
    queryFn: async () => {
      const data = await base44.entities.Event.list('start_date', 200);
      return (data || []).sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => base44.entities.Event.create(data),
    onMutate: async (newEvent) => {
      await qc.cancelQueries(EVENTS_KEY);
      const prev = qc.getQueryData(EVENTS_KEY);
      qc.setQueryData(EVENTS_KEY, (old) => [
        { ...newEvent, id: `temp-${Date.now()}`, created_date: new Date().toISOString() },
        ...(old || []),
      ]);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(EVENTS_KEY, ctx.prev),
    onSettled: () => qc.invalidateQueries(EVENTS_KEY),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => base44.entities.Event.update(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries(EVENTS_KEY);
      const prev = qc.getQueryData(EVENTS_KEY);
      qc.setQueryData(EVENTS_KEY, (old) =>
        (old || []).map((e) => (e.id === id ? { ...e, ...data } : e))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(EVENTS_KEY, ctx.prev),
    onSettled: () => qc.invalidateQueries(EVENTS_KEY),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => base44.entities.Event.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries(EVENTS_KEY);
      const prev = qc.getQueryData(EVENTS_KEY);
      qc.setQueryData(EVENTS_KEY, (old) => (old || []).filter((e) => e.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(EVENTS_KEY, ctx.prev),
    onSettled: () => qc.invalidateQueries(EVENTS_KEY),
  });
}

// ==================== CABINS ====================
export const CABINS_KEY = ['cabins'];

export function useCabinsQuery() {
  return useQuery({
    queryKey: CABINS_KEY,
    queryFn: () => base44.entities.Cabin.list('number', 20),
  });
}

// ==================== RESERVATIONS ====================
export const RESERVATIONS_KEY = ['reservations'];

export function useReservationsQuery() {
  return useQuery({
    queryKey: RESERVATIONS_KEY,
    queryFn: () => base44.entities.CabinReservation.list('-check_in', 200),
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => base44.entities.CabinReservation.create(data),
    onMutate: async (newRes) => {
      await qc.cancelQueries(RESERVATIONS_KEY);
      const prev = qc.getQueryData(RESERVATIONS_KEY);
      qc.setQueryData(RESERVATIONS_KEY, (old) => [
        { ...newRes, id: `temp-${Date.now()}`, created_date: new Date().toISOString() },
        ...(old || []),
      ]);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(RESERVATIONS_KEY, ctx.prev),
    onSettled: () => qc.invalidateQueries(RESERVATIONS_KEY),
  });
}

export function useUpdateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => base44.entities.CabinReservation.update(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries(RESERVATIONS_KEY);
      const prev = qc.getQueryData(RESERVATIONS_KEY);
      qc.setQueryData(RESERVATIONS_KEY, (old) =>
        (old || []).map((r) => (r.id === id ? { ...r, ...data } : r))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(RESERVATIONS_KEY, ctx.prev),
    onSettled: () => qc.invalidateQueries(RESERVATIONS_KEY),
  });
}

export function useDeleteReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => base44.entities.CabinReservation.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries(RESERVATIONS_KEY);
      const prev = qc.getQueryData(RESERVATIONS_KEY);
      qc.setQueryData(RESERVATIONS_KEY, (old) => (old || []).filter((r) => r.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(RESERVATIONS_KEY, ctx.prev),
    onSettled: () => qc.invalidateQueries(RESERVATIONS_KEY),
  });
}
