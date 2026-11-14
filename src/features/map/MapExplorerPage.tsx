import { lazy, Suspense, useState } from 'react';
import { Tabs, Skeleton } from '../../components/ui/OverlayPrimitives';
import { PageHeader } from '../../components/ui/PageHeader';
import { DidacticCampusPlan } from './DidacticCampusPlan';

const LazyCampusMap3D = lazy(() =>
  import('./CampusMap3D').then((mod) => ({ default: mod.CampusMap3D })),
);

const LazyPublicLeafletMap = lazy(() =>
  import('./PublicLeafletMap').then((mod) => ({ default: mod.PublicLeafletMap })),
);

type MapMode = 'MAPA_3D' | 'PLANO' | 'MAPA_PUBLICO';

export default function MapExplorerPage() {
  const [mode, setMode] = useState<MapMode>('MAPA_3D');

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Territorio, campus y rutas"
        title="Explorador territorial"
        description="Visualización multi-nivel: Gemelo digital 3D de la Ciudad Universitaria UNT, plano didáctico 2D de dependencias y cartografía pública de Trujillo (OSM)."
        actions={
          <Tabs
            activeTab={mode}
            onChange={(tab) => setMode(tab as MapMode)}
            tabs={[
              { id: 'MAPA_3D', label: '🏛️ Mapa 3D UNT (Digital Twin)' },
              { id: 'PLANO', label: 'Plano didáctico (2D)' },
              { id: 'MAPA_PUBLICO', label: 'Mapa público (Trujillo OSM)' },
            ]}
          />
        }
      />

      {mode === 'MAPA_3D' ? (
        <Suspense fallback={<Skeleton className="h-[720px] w-full rounded-2xl" />}>
          <LazyCampusMap3D />
        </Suspense>
      ) : mode === 'PLANO' ? (
        <DidacticCampusPlan />
      ) : (
        <Suspense fallback={<Skeleton className="h-[460px] w-full" />}>
          <LazyPublicLeafletMap onSwitchToPlan={() => setMode('PLANO')} />
        </Suspense>
      )}
    </div>
  );
}

