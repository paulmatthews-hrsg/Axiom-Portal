import { useState } from 'react';
import { Toaster } from 'sonner';
import { Sidebar } from './components/Sidebar';
import { MobileHeader } from './components/MobileHeader';
import { Dashboard } from './components/Dashboard';
import { InfringementTriage } from './components/InfringementTriage';
import { BPAManagement } from './components/BPAManagement';
import { PlaceholderView } from './components/PlaceholderView';
import { CORExtranet } from './components/CORExtranet';
import { Maintenance } from './components/Maintenance';
import { Settings } from './components/Settings';
import FleetAssets from './components/FleetAssets';
import { RBACProvider, useRBAC } from './contexts/RBACContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { AdminCopilot } from './components/AdminCopilot';

function AppContent() {
  const [currentView, setCurrentView] = useState('infringement-triage');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isCOR } = useRBAC();

  if (isCOR()) {
    return (
      <div className="h-screen overflow-hidden">
        <CORExtranet />
      </div>
    );
  }

  function renderView() {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'fleet-assets':
      case 'fleet-assets-registry':
      case 'fleet-assets-acquisition':
      case 'fleet-assets-disposal':
        return <FleetAssets currentView={currentView} />;
      case 'infringement-triage':
        return <InfringementTriage />;
      case 'bpa-management':
        return <BPAManagement />;
      case 'maintenance':
        return <Maintenance />;
      case 'logistics':
        return (
          <PlaceholderView
            title="Logistics & Dispatch"
            description="Coordinate fleet dispatch and logistics operations"
          />
        );
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  }

  return (
    <NavigationProvider onNavigate={setCurrentView}>
      <Toaster
        position="top-right"
        expand={false}
        richColors
        closeButton
        toastOptions={{
          style: {
            padding: '16px',
          },
          className: 'font-sans',
        }}
      />
      <div className="h-screen flex bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100/80 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 font-sans antialiased transition-colors duration-300">
        <MobileHeader
          onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMenuOpen={isMobileMenuOpen}
        />
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
        <main className="flex-1 overflow-hidden pt-16 md:pt-0">{renderView()}</main>
        <AdminCopilot />
      </div>
    </NavigationProvider>
  );
}

function App() {
  return (
    <RBACProvider>
      <AppContent />
    </RBACProvider>
  );
}

export default App;
