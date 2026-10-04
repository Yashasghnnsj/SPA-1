import React from 'react';
import { ShieldCheck, Play, Pause, FileDown, BrainCircuit, Activity, Flame, Workflow } from 'lucide-react';

export type ActiveTab = 'dashboard' | 'attack-lab' | 'ml-analytics' | 'architecture';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isStreamRunning: boolean;
  onToggleStream: () => void;
  onOpenExportModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isStreamRunning,
  onToggleStream,
  onOpenExportModal,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-950">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className="text-lg font-bold tracking-tight text-white hover:text-cyan-400 transition-colors text-left flex items-center gap-2"
          >
            <span>FlinkGuard</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700 font-semibold hidden sm:inline-block">
              Enterprise
            </span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 py-5 ${
              activeTab === 'dashboard'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Monitor</span>
          </button>

          <button
            onClick={() => setActiveTab('attack-lab')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 py-5 ${
              activeTab === 'attack-lab'
                ? 'text-rose-400 font-semibold border-b-2 border-rose-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Threat Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('ml-analytics')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 py-5 ${
              activeTab === 'ml-analytics'
                ? 'text-purple-400 font-semibold border-b-2 border-purple-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span>ML Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 py-5 ${
              activeTab === 'architecture'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Workflow className="w-4 h-4" />
            <span>Architecture</span>
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleStream}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 border whitespace-nowrap ${
              isStreamRunning
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
            }`}
            title={isStreamRunning ? 'Pause stream ingestion' : 'Resume stream ingestion'}
          >
            {isStreamRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isStreamRunning ? 'Pause Stream' : 'Resume Stream'}</span>
          </button>

          <button
            onClick={onOpenExportModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>

      </div>
    </header>
  );
};
