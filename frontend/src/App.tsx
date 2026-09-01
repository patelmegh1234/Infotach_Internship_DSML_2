import { useState } from 'react';
import { ToastProvider } from '@/hooks/useToast';
import { Sidebar, type PageKey } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { GraphPage } from '@/pages/GraphPage';
import { SimulatorPage } from '@/pages/SimulatorPage';
import { RiskAnalysisPage } from '@/pages/RiskAnalysisPage';
import { PredictionsPage } from '@/pages/PredictionsPage';
import { ScenariosPage } from '@/pages/ScenariosPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { ReportsPage } from '@/pages/ReportsPage';

function App() {
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState<PageKey>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');

  if (!authed) {
    return (
      <ToastProvider>
        <LoginPage onSignIn={() => setAuthed(true)} />
      </ToastProvider>
    );
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <DashboardPage search={search} />;
      case 'graph':
        return <GraphPage search={search} />;
      case 'simulator':
        return <SimulatorPage />;
      case 'risk':
        return <RiskAnalysisPage />;
      case 'predictions':
        return <PredictionsPage />;
      case 'scenarios':
        return <ScenariosPage />;
      case 'alerts':
        return <AlertsPage />;
      case 'reports':
        return <ReportsPage />;
      default:
        return <DashboardPage search={search} />;
    }
  };

  return (
    <ToastProvider>
      <div className="min-h-screen flex">
        <Sidebar
          active={page}
          onNavigate={setPage}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar
            onMenu={() => setSidebarOpen(true)}
            onSearch={setSearch}
            search={search}
          />
          <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto" key={page}>
            {renderPage()}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;
