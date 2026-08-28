import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import {
  formatCurrency,
  MEASUREMENT_LABELS,
  CATEGORY_LABELS,
} from '@/lib/pricing';

function getServiceDetail(service, people, options = {}) {
  if (!service) return null;
  const p = Math.max(0, people || 0);
  switch (service.measurement_type) {
    case 'fixed':
      return null;
    case 'per_person':
      return p > 0 ? `${p} personas` : null;
    case 'average_person': {
      const avg = Math.ceil(p * ((service.average_percentage || 100) / 100));
      return avg > 0 ? `${avg} personas (prom. ${service.average_percentage || 100}%)` : null;
    }
    case 'tiered':
      return p > 0 ? `${p} personas` : null;
    case 'per_group': {
      const perUnit = service.people_per_unit || 1;
      const units = p > 0 ? Math.ceil(p / perUnit) : 0;
      return units > 0 ? `${units} grupo(s) de ${perUnit} pers.` : null;
    }
    case 'step_count': {
      const threshold = service.tier_threshold || 0;
      const count = p > 0 ? (p <= threshold ? 1 : 2) : 0;
      return count > 0 ? `${count} unidad(es)` : null;
    }
    case 'per_hour':
      return (options.hours || 0) > 0 ? `${options.hours} horas` : null;
    case 'torta': {
      const gramsPerPerson = service.grams_per_person || 0;
      const totalKg = (gramsPerPerson * p) / 1000;
      return totalKg > 0 ? `${Math.ceil(totalKg)} kg de torta` : null;
    }
    case 'sub_option': {
      const selected = options.selectedSubOptions || [];
      return selected.length > 0 ? selected.join(', ') : null;
    }
    default:
      return null;
  }
}

export default function ContractedServices({ selectedServices, peopleCount, showPrices = false }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await base44.entities.Service.list();
        setServices(data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (!selectedServices || selectedServices.length === 0) {
    return <p className="text-sm text-stone-400 text-center py-2">No hay servicios contratados.</p>;
  }

  if (loading) {
    return <p className="text-sm text-stone-400 text-center py-2">Cargando servicios...</p>;
  }

  return (
    <div className="space-y-2">
      {selectedServices.map((ss) => {
        const fullService = services.find((s) => s.id === ss.service_id);
        const detail = fullService
          ? getServiceDetail(fullService, peopleCount, {
              hours: ss.hours || 0,
              selectedSubOptions: ss.selected_sub_options || [],
            })
          : null;

        return (
          <div key={ss.service_id} className="flex items-start justify-between bg-white border border-stone-200 rounded-lg p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-800">{ss.service_name}</p>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[ss.category] || ss.category}</Badge>
                <Badge variant="outline" className="text-[10px]">{MEASUREMENT_LABELS[ss.measurement_type] || ss.measurement_type}</Badge>
              </div>
              {detail && (
                <p className="text-xs text-stone-600 mt-1 font-medium">📋 {detail}</p>
              )}
              {ss.measurement_type === 'per_hour' && (ss.hours || 0) > 0 && !detail && (
                <p className="text-xs text-stone-600 mt-1 font-medium">⏰ {ss.hours} horas</p>
              )}
              {ss.measurement_type === 'sub_option' && (ss.selected_sub_options || []).length > 0 && !detail && (
                <p className="text-xs text-stone-600 mt-1 font-medium">✓ {ss.selected_sub_options.join(', ')}</p>
              )}
            </div>
            {showPrices && (
              <span className="text-sm font-semibold text-stone-700 shrink-0 ml-2">
                {formatCurrency(ss.calculated_price)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
