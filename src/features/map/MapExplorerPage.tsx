import { lazy, Suspense, useState } from 'react';
import { Tabs, Skeleton } from '../../components/ui/OverlayPrimitives';
import { PageHeader } from '../../components/ui/PageHeader';
import { DidacticCampusPlan } from './DidacticCampusPlan';

const LazyPublicLeafletMap = lazy(() =>
  import('./PublicLeafletMap').then((mod) => ({ default: mod.PublicLeafletMap })),
);

export default function MapExplorerPage() {
  const [mode, setMode] = useState<'PLANO' | 'MAPA_PUBLICO'>('PLANO');

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Territorio y rutas"
        title="Explorador territorial"
        description="Separación estricta entre cartografía real pública (Trujillo / OpenStreetMap) y plano didáctico de campus ficticio."
        actions={
          <Tabs
            activeTab={mode}
            onChange={setMode}
            tabs={[
              { id: 'PLANO', label: 'Plano didáctico (Ficticio)' },
              { id: 'MAPA_PUBLICO', label: 'Mapa público (Trujillo OSM)' },
            ]}
          />
        }
      />

      {mode === 'PLANO' ? (
        <DidacticCampusPlan />
      ) : (
        <Suspense fallback={<Skeleton className="h-[460px] w-full" />}>
          <LazyPublicLeafletMap onSwitchToPlan={() => setMode('PLANO')} />
        </Suspense>
      )}
    </div>
  );
}
