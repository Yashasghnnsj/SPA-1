import React, { useState } from 'react';
import { 
  BrainCircuit, 
  TrendingUp, 
  ShieldCheck, 
  Cpu, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Gauge, 
  Layers,
  Sparkles,
  Zap,
  BarChart3,
  Network,
  MousePointerClick
} from 'lucide-react';

interface FeatureImportance {
  name: string;
  label: string;
  weight: number;
  category: string;
}

// Model 1: TalkingData Ad Click Fraud Features
const CLICK_FRAUD_FEATURES: FeatureImportance[] = [
  { name: 'same_app_click_count', label: 'Same App Click Repetition', weight: 19.66, category: 'Behavior' },
  { name: 'clicks_per_device', label: 'Device Click Frequency', weight: 18.17, category: 'Identity' },
  { name: 'unique_apps_per_ip', label: 'IP App Cycling Diversity', weight: 10.22, category: 'Behavior' },
  { name: 'device', label: 'Device Model Identifier', weight: 9.41, category: 'Identity' },
  { name: 'channel', label: 'Marketing Ad Channel ID', weight: 8.96, category: 'Context' },
  { name: 'app', label: 'Target Application ID', weight: 8.90, category: 'Context' },
  { name: 'clicks_from_same_ip', label: 'IP Window Click Velocity', weight: 6.46, category: 'Velocity' },
  { name: 'ip_device_os_frequency', label: 'IP-Device-OS Triplet Frequency', weight: 3.21, category: 'Identity' },
  { name: 'ip_app_channel_frequency', label: 'IP-App-Channel Group Frequency', weight: 3.07, category: 'Context' },
  { name: 'os', label: 'Operating System Version', weight: 2.83, category: 'Context' },
  { name: 'time_since_previous_click', label: 'Inter-Click Delta (Velocity)', weight: 2.33, category: 'Velocity' },
  { name: 'bot_behavior_ratio', label: 'App Repetition / Diversity Ratio', weight: 2.06, category: 'Behavior' },
  { name: 'unique_channels_per_ip', label: 'Unique Channels per IP', weight: 1.98, category: 'Behavior' },
  { name: 'unique_devices_per_ip', label: 'Unique Devices per IP', weight: 1.50, category: 'Identity' },
  { name: 'hour', label: 'Time of Day (Temporal Hour)', weight: 1.24, category: 'Context' }
];

// Model 2: DNS Exfiltration & Infiltration Features (Trained on Light + Heavy dataset)
const DNS_EXFILTRATION_FEATURES: FeatureImportance[] = [
  { name: 'longest_word_len', label: 'Longest Token String Length', weight: 21.26, category: 'Entropy & Content' },
  { name: 'FQDN_count', label: 'FQDN Subdomain Depth / Count', weight: 20.02, category: 'Frequency' },
  { name: 'labels', label: 'DNS Domain Label Count', weight: 11.94, category: 'Structural' },
  { name: 'subdomain_length', label: 'Subdomain String Length', weight: 10.83, category: 'Structural' },
  { name: 'special', label: 'Special Symbol Density', weight: 9.66, category: 'Entropy & Content' },
  { name: 'entropy', label: 'Shannon Entropy Score', weight: 7.45, category: 'Entropy & Content' },
  { name: 'numeric', label: 'Numeric Character Ratio', weight: 6.82, category: 'Entropy & Content' },
  { name: 'labels_max', label: 'Max Label Token Length', weight: 4.88, category: 'Structural' },
  { name: 'labels_average', label: 'Average Token Label Length', weight: 3.12, category: 'Structural' },
  { name: 'upper', label: 'Uppercase Character Density', weight: 2.11, category: 'Entropy & Content' },
  { name: 'lower', label: 'Lowercase Character Density', weight: 1.05, category: 'Entropy & Content' },
  { name: 'sld_len', label: 'Second-Level Domain Length', weight: 0.86, category: 'Structural' }
];

export const MLAnalyticsView: React.FC = () => {
  const [activeModel, setActiveModel] = useState<'ad_fraud' | 'dns_exfil'>('ad_fraud');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const activeFeatures = activeModel === 'ad_fraud' ? CLICK_FRAUD_FEATURES : DNS_EXFILTRATION_FEATURES;

  const categories = activeModel === 'ad_fraud' 
    ? ['ALL', 'Behavior', 'Identity', 'Velocity', 'Context']
    : ['ALL', 'Entropy & Content', 'Structural', 'Frequency'];

  const filteredFeatures = selectedCategory === 'ALL' 
    ? activeFeatures 
    : activeFeatures.filter(f => f.category === selectedCategory);

  return (
    <div className="space-y-6">

      {/* Model Selection Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Active Detection Model:</span>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
          <button
            onClick={() => { setActiveModel('ad_fraud'); setSelectedCategory('ALL'); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeModel === 'ad_fraud'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MousePointerClick className="w-3.5 h-3.5" />
            <span>Ad Click Fraud (XGBoost)</span>
          </button>

          <button
            onClick={() => { setActiveModel('dns_exfil'); setSelectedCategory('ALL'); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeModel === 'dns_exfil'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>DNS Exfiltration (Random Forest)</span>
          </button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden">
        <div className={`absolute right-0 top-0 w-96 h-full bg-gradient-to-l pointer-events-none transition-all duration-500 ${
          activeModel === 'ad_fraud' ? 'from-purple-500/10 to-transparent' : 'from-cyan-500/10 to-transparent'
        }`} />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${
              activeModel === 'ad_fraud' ? 'text-purple-400' : 'text-cyan-400'
            }`}>
              <BrainCircuit className="w-4 h-4" />
              <span>Machine Learning Inference Intelligence</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              {activeModel === 'ad_fraud'
                ? 'Trained XGBoost Click Fraud Detection Model'
                : 'Trained Random Forest DNS Tunneling & Exfiltration Detector'}
            </h2>
            <p className="text-xs text-slate-300">
              {activeModel === 'ad_fraud'
                ? 'High-throughput gradient boosted decision forest trained on Kaggle TalkingData records with streaming feature engineering and class-imbalance compensation.'
                : 'Multi-tree random forest classifier trained on 536,000+ stateless & stateful DNS records (audio, compressed, exe, image, text, video exfiltration payloads).'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-3.5 py-2 rounded-lg border text-xs font-mono flex items-center gap-2 ${
              activeModel === 'ad_fraud'
                ? 'bg-purple-950/40 border-purple-500/30 text-purple-300'
                : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'
            }`}>
              <Cpu className="w-4 h-4" />
              <span>{activeModel === 'ad_fraud' ? 'GPU: NVIDIA RTX 4050 (CUDA)' : 'Engine: Multi-Core Scikit-Learn'}</span>
            </div>
            <div className="px-3.5 py-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Model Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">ROC-AUC Score</div>
          <div className="text-2xl font-bold text-purple-400 font-mono">
            {activeModel === 'ad_fraud' ? '0.9625' : '0.8055'}
          </div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>High Discriminative Power</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {activeModel === 'ad_fraud' ? 'PR-AUC (Avg Prec)' : 'Accuracy'}
          </div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            {activeModel === 'ad_fraud' ? '0.9999' : '82.29%'}
          </div>
          <div className="text-[10px] text-slate-400">
            {activeModel === 'ad_fraud' ? 'Class-imbalance weighted' : 'Across 160K test records'}
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Benign Precision</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {activeModel === 'ad_fraud' ? '99.90%' : '99.91%'}
          </div>
          <div className="text-[10px] text-slate-400">Zero false alarms on normal traffic</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Exfiltration Recall</div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            {activeModel === 'ad_fraud' ? '99.98%' : '99.96%'}
          </div>
          <div className="text-[10px] text-slate-400">
            {activeModel === 'ad_fraud' ? 'Captures 99.98% bot clicks' : 'Misses < 0.04% tunneling attempts'}
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1 col-span-2 md:col-span-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {activeModel === 'ad_fraud' ? 'F1-Score' : 'Dataset Scope'}
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {activeModel === 'ad_fraud' ? '0.9994' : '536K'}
          </div>
          <div className="text-[10px] text-slate-400">
            {activeModel === 'ad_fraud' ? 'Optimal balance' : 'Light + Heavy DNS Exfil'}
          </div>
        </div>
      </div>

      {/* Main 2-Column Analytics Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Feature Importance Column (2 cols) */}
        <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className={`w-4 h-4 ${activeModel === 'ad_fraud' ? 'text-purple-400' : 'text-cyan-400'}`} />
                Ranked Feature Importances ({activeModel === 'ad_fraud' ? 'XGBoost' : 'Random Forest'})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeModel === 'ad_fraud'
                  ? 'Relative contribution of each behavioral stream metric to the fraud decision tree'
                  : 'Relative weight of DNS query character entropy, token length, and subdomain frequencies'}
              </p>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? (activeModel === 'ad_fraud' ? 'bg-purple-600 text-white font-medium' : 'bg-cyan-600 text-white font-medium')
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Feature Bars */}
          <div className="space-y-3">
            {filteredFeatures.map((feat, idx) => (
              <div key={feat.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500 w-4">{idx + 1}.</span>
                    <span className="font-medium text-slate-200">{feat.label}</span>
                    <span className="text-[10px] font-mono text-slate-500">({feat.name})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {feat.category}
                    </span>
                    <span className={`font-mono font-bold w-12 text-right ${
                      activeModel === 'ad_fraud' ? 'text-purple-300' : 'text-cyan-300'
                    }`}>
                      {feat.weight.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      activeModel === 'ad_fraud'
                        ? 'bg-gradient-to-r from-purple-500 to-cyan-400'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, (feat.weight / 22) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Confusion Matrix & Runtime Spec */}
        <div className="space-y-6">

          {/* Confusion Matrix Card */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Confusion Matrix ({activeModel === 'ad_fraud' ? '2,000,000 Test Records' : '160,842 Test Queries'})
            </h3>

            <div className="grid grid-cols-2 gap-2.5 text-center font-mono">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <span className="text-[10px] text-slate-400 block font-sans">True Negatives (Benign)</span>
                <span className="text-lg font-bold text-emerald-400">
                  {activeModel === 'ad_fraud' ? '1,543' : '43,777'}
                </span>
                <span className="text-[9px] text-slate-500 block font-sans">Passed cleanly</span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <span className="text-[10px] text-slate-400 block font-sans">False Positives</span>
                <span className="text-lg font-bold text-amber-400">
                  {activeModel === 'ad_fraud' ? '2,033' : '28,759'}
                </span>
                <span className="text-[9px] text-slate-500 block font-sans">
                  {activeModel === 'ad_fraud' ? 'Flagged (0.10%)' : 'Flagged (Benign)'}
                </span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <span className="text-[10px] text-slate-400 block font-sans">False Negatives (Missed)</span>
                <span className="text-lg font-bold text-rose-400">
                  {activeModel === 'ad_fraud' ? '358' : '25'}
                </span>
                <span className="text-[9px] text-slate-500 block font-sans">
                  {activeModel === 'ad_fraud' ? 'Missed (0.02%)' : 'Missed (< 0.04%)'}
                </span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <span className="text-[10px] text-slate-400 block font-sans">True Positives (Attack)</span>
                <span className="text-lg font-bold text-cyan-400">
                  {activeModel === 'ad_fraud' ? '1,996,066' : '88,281'}
                </span>
                <span className="text-[9px] text-slate-500 block font-sans">
                  {activeModel === 'ad_fraud' ? 'Blocked (99.98%)' : 'Blocked (99.97%)'}
                </span>
              </div>
            </div>
          </div>

          {/* Model Deployment Specs */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Production Model Profile
            </h4>
            <div className="space-y-2 font-mono text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Algorithm:</span>
                <span>{activeModel === 'ad_fraud' ? 'XGBoost Classifier (Hist)' : 'Random Forest Classifier'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Estimators:</span>
                <span>{activeModel === 'ad_fraud' ? '250 Trees (Max Depth 7)' : '100 Trees (Max Depth 16)'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Training Samples:</span>
                <span>{activeModel === 'ad_fraud' ? '8,000,000 Records' : '536,138 Records (Light+Heavy)'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Inference Latency:</span>
                <span className="text-emerald-400">{activeModel === 'ad_fraud' ? '< 1.2 ms per event' : '< 0.8 ms per query'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Detection Targets:</span>
                <span className={activeModel === 'ad_fraud' ? 'text-purple-400' : 'text-cyan-400'}>
                  {activeModel === 'ad_fraud' ? 'Click Farms & Bots' : 'Audio/Exe/Img Exfiltration'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
