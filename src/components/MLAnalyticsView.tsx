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
  BarChart3
} from 'lucide-react';

interface FeatureImportance {
  name: string;
  label: string;
  weight: number;
  category: 'Velocity' | 'Identity' | 'Behavior' | 'Context';
}

const FEATURE_IMPORTANCES: FeatureImportance[] = [
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

export const MLAnalyticsView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredFeatures = selectedCategory === 'ALL' 
    ? FEATURE_IMPORTANCES 
    : FEATURE_IMPORTANCES.filter(f => f.category === selectedCategory);

  return (
    <div className="space-y-6">

      {/* Hero Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
              <BrainCircuit className="w-4 h-4" />
              <span>Machine Learning Inference Intelligence</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              Trained XGBoost Click Fraud Detection Model
            </h2>
            <p className="text-xs text-slate-300">
              High-throughput gradient boosted decision forest trained on Kaggle TalkingData records with streaming feature engineering and class-imbalance compensation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-lg bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-mono flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>GPU: NVIDIA RTX 4050 (CUDA)</span>
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
          <div className="text-2xl font-bold text-purple-400 font-mono">0.9625</div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>High Discriminative Power</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">PR-AUC (Avg Prec)</div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">0.9999</div>
          <div className="text-[10px] text-slate-400">Class-imbalance weighted</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Precision</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">99.90%</div>
          <div className="text-[10px] text-slate-400">Minimizes false flags</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Recall</div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">99.98%</div>
          <div className="text-[10px] text-slate-400">Captures 99.98% bot clicks</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1 col-span-2 md:col-span-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">F1-Score</div>
          <div className="text-2xl font-bold text-amber-400 font-mono">0.9994</div>
          <div className="text-[10px] text-slate-400">Optimal balance</div>
        </div>
      </div>

      {/* Main 2-Column Analytics Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Feature Importance Column (2 cols) */}
        <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                Ranked Feature Importances (XGBoost)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Relative contribution of each behavioral stream metric to the fraud decision tree
              </p>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              {['ALL', 'Behavior', 'Identity', 'Velocity', 'Context'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    selectedCategory === cat
                      ? 'bg-purple-600 text-white font-medium'
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
                    <span className="font-mono font-bold text-purple-300 w-12 text-right">
                      {feat.weight.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(feat.weight / 20) * 100}%` }}
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
              Confusion Matrix (2,000,000 Test Records)
            </h3>

            <div className="grid grid-cols-2 gap-2.5 text-center font-mono">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <span className="text-[10px] text-slate-400 block font-sans">True Negatives (Legit)</span>
                <span className="text-lg font-bold text-emerald-400">1,543</span>
                <span className="text-[9px] text-slate-500 block font-sans">Passed cleanly</span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <span className="text-[10px] text-slate-400 block font-sans">False Positives</span>
                <span className="text-lg font-bold text-amber-400">2,033</span>
                <span className="text-[9px] text-slate-500 block font-sans">Flagged (0.10%)</span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <span className="text-[10px] text-slate-400 block font-sans">False Negatives</span>
                <span className="text-lg font-bold text-rose-400">358</span>
                <span className="text-[9px] text-slate-500 block font-sans">Missed (0.02%)</span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <span className="text-[10px] text-slate-400 block font-sans">True Positives (Fraud)</span>
                <span className="text-lg font-bold text-cyan-400">1,996,066</span>
                <span className="text-[9px] text-slate-500 block font-sans">Blocked (99.98%)</span>
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
                <span>XGBoost Classifier (Hist)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Estimators:</span>
                <span>250 Trees (Max Depth 7)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Training Samples:</span>
                <span>8,000,000 Records</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Inference Latency:</span>
                <span className="text-emerald-400">&lt; 1.2 ms per event</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Decision Threshold:</span>
                <span className="text-purple-400">0.60 Confidence</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
