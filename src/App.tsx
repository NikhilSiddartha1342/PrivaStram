import React from 'react';
import { PrivacyStreamProvider, usePrivacyStream } from './context/PrivacyStreamContext';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { LiveStudioView } from './components/studio/LiveStudioView';
import { PrivacyRulesView } from './components/rules/PrivacyRulesView';
import { FaceWhitelistView } from './components/whitelist/FaceWhitelistView';
import { EventLogView } from './components/events/EventLogView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';

const MainContent: React.FC = () => {
  const { currentTab } = usePrivacyStream();

  return (
    <main className="px-4 lg:px-8 py-6">
      {currentTab === 'dashboard' && <DashboardView />}
      {currentTab === 'studio' && <LiveStudioView />}
      {currentTab === 'rules' && <PrivacyRulesView />}
      {currentTab === 'whitelist' && <FaceWhitelistView />}
      {currentTab === 'events' && <EventLogView />}
      {currentTab === 'analytics' && <AnalyticsView />}
      {currentTab === 'settings' && <SettingsView />}
    </main>
  );
};

export const App: React.FC = () => {
  return (
    <PrivacyStreamProvider>
      <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans">
        <Header />
        <div className="flex-1">
          <MainContent />
        </div>

        {/* Global Footer */}
        <footer className="border-t border-white/5 py-4 px-6 text-center text-xs text-slate-500 font-mono">
          <p>PrivaStream — AI-Powered Multimodal Privacy Shield &bull; Protect Every Frame &bull; Zero Disk Storage Guarantee</p>
        </footer>
      </div>
    </PrivacyStreamProvider>
  );
};

export default App;
