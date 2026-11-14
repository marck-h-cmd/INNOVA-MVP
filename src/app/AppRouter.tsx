import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { useNexoStore } from '../store/useNexoStore';
import { AppShell } from '../components/layout/AppShell';
import { Skeleton } from '../components/ui/OverlayPrimitives';
import { AppErrorBoundary } from '../components/ui/AppErrorBoundary';
import DashboardPage from '../features/dashboard/DashboardPage';

const ScenariosPage = lazy(() => import('../features/scenarios/ScenariosPage'));
const MapExplorerPage = lazy(() => import('../features/map/MapExplorerPage'));
const PreventionPage = lazy(() => import('../features/prevention/PreventionPage'));
const DependenciesPage = lazy(() => import('../features/dependencies/DependenciesPage'));
const ActionsPage = lazy(() => import('../features/actions/ActionsPage'));
const CommunicationsPage = lazy(() => import('../features/communications/CommunicationsPage'));
const ContinuityPage = lazy(() => import('../features/continuity/ContinuityPage'));
const CoordinationPage = lazy(() => import('../features/coordination/CoordinationPage'));
const CommunityPage = lazy(() => import('../features/community/CommunityPage'));
const ExplainabilityPage = lazy(() => import('../features/explainability/ExplainabilityPage'));
const AuditPage = lazy(() => import('../features/audit/AuditPage'));
const SourcesPage = lazy(() => import('../features/audit/SourcesPage'));
const DemoModePage = lazy(() => import('../features/demo/DemoModePage'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));

function RouteSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-1/2" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function AppRouter() {
  const reducedMotion = useNexoStore((s) => s.reducedMotion);
  const [presentationActive, setPresentationActive] = useState(false);

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
      <BrowserRouter>
        <AppErrorBoundary>
          <Routes>
            <Route
              path="/demo"
              element={
                <AppShell presentationMode={presentationActive}>
                  <Suspense fallback={<RouteSkeleton />}>
                    <DemoModePage
                      presentationMode={presentationActive}
                      onPresentationChange={setPresentationActive}
                    />
                  </Suspense>
                </AppShell>
              }
            />
            <Route
              path="*"
              element={
                <AppShell>
                  <Suspense fallback={<RouteSkeleton />}>
                    <Routes>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/escenarios" element={<ScenariosPage />} />
                      <Route path="/mapa" element={<MapExplorerPage />} />
                      <Route path="/prevencion" element={<PreventionPage />} />
                      <Route path="/dependencias" element={<DependenciesPage />} />
                      <Route path="/acciones" element={<ActionsPage />} />
                      <Route path="/comunicaciones" element={<CommunicationsPage />} />
                      <Route path="/continuidad" element={<ContinuityPage />} />
                      <Route path="/coordinacion" element={<CoordinationPage />} />
                      <Route path="/comunidad" element={<CommunityPage />} />
                      <Route path="/explicabilidad" element={<ExplainabilityPage />} />
                      <Route path="/bitacora" element={<AuditPage />} />
                      <Route path="/fuentes" element={<SourcesPage />} />
                      <Route path="/configuracion" element={<SettingsPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </AppShell>
              }
            />
          </Routes>
        </AppErrorBoundary>
      </BrowserRouter>
    </MotionConfig>
  );
}
