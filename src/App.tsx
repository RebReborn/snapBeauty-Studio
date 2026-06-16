import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import EditorWorkspace from './components/EditorWorkspace';
import ExportModal from './components/ExportModal';

const MainApp: React.FC = () => {
  const { currentView, showExportModal } = useApp();

  return (
    <div className="h-screen w-screen bg-studio-darker overflow-hidden text-gray-200">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/10 via-studio-darker to-pink-950/10 pointer-events-none z-0" />
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-600/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Main View Router */}
      <div className="relative z-10 h-full w-full">
        {currentView === 'auth' && <AuthScreen />}
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'editor' && <EditorWorkspace />}
      </div>

      {/* Global Modals */}
      {showExportModal && <ExportModal />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
};

export default App;
