import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  DollarSign, 
  Activity, 
  Cpu, 
  Zap, 
  Search, 
  SlidersHorizontal,
  Flame,
  RotateCcw,
  Eye,
  HelpCircle,
  PieChart,
  Users,
  Smartphone,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { AdClickEvent, FlinkEngineState, FraudType, KafkaConsumerLagState } from '../types/fraud';
import { globalFlinkStream } from '../services/streamSimulator';
import { KafkaConsumerLagSection } from './KafkaConsumerLagSection';

interface DashboardViewProps {
  engineState: FlinkEngineState;
  kafkaState: KafkaConsumerLagState;
  events: AdClickEvent[];
  isStreamRunning: boolean;
  onSelectClick: (click: AdClickEvent) => void;
  onUpdateEngineState: (newConfig: Partial<FlinkEngineState>) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  engineState,
  kafkaState,
  events,
  isStreamRunning,
  onSelectClick,
  onUpdateEngineState
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'BLOCKED' | 'FLAGGED' | 'VALID'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [selectedSpeed, setSelectedSpeed] = useState<number>(1);

  // Compute filtered events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (filterType !== 'ALL' && e.action !== filterType) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          e.eventId.toLowerCase().includes(q) ||
          e.userId.toLowerCase().includes(q) ||
          e.adId.toLowerCase().includes(q) ||
          e.ipAddress.toLowerCase().includes(q) ||
          e.publisherName.toLowerCase().includes(q) ||
          e.campaignName.toLowerCase().includes(q) ||
          e.detectedFraudType.toLowerCase().includes(q) ||
          e.asn.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, filterType, searchQuery]);

  // Aggregations for Dashboard Tables
  const topSuspiciousIps = useMemo(() => {
    const ipMap = new Map<string, { ip: string; clicks: number; users: Set<string>; highRiskCount: number }>();
    events.forEach(e => {
      let rec = ipMap.get(e.ipAddress);
      if (!rec) {
        rec = { ip: e.ipAddress, clicks: 0, users: new Set(), highRiskCount: 0 };
        ipMap.set(e.ipAddress, rec);
      }
      rec.clicks += 1;
      rec.users.add(e.userId);
      if (e.riskLevel === 'HIGH') rec.highRiskCount += 1;
    });
    return Array.from(ipMap.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 4);
  }, [events]);

  const topSuspiciousDevices = useMemo(() => {
    const devMap = new Map<string, { device: string; clicks: number; risk: string }>();
    events.forEach(e => {
      let rec = devMap.get(e.deviceType);
      if (!rec) {
        rec = { device: e.deviceType, clicks: 0, risk: 'LOW' };
        devMap.set(e.deviceType, rec);
      }
      rec.clicks += 1;
      if (e.riskLevel === 'HIGH') rec.risk = 'HIGH';
      else if (e.riskLevel === 'MEDIUM' && rec.risk !== 'HIGH') rec.risk = 'MEDIUM';
    });
    return Array.from(devMap.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 4);
  }, [events]);

  // Fraud reasons distribution
  const fraudReasonsDistribution = useMemo(() => {
    const reasonCounts: Record<string, number> = {
      'High click frequency': 0,
      'Rapid clicking (< 1s)': 0,
      'Same IP repetition': 0,
      'Same advertisement': 0,
      'Datacenter / Botnet ASN': 0
    };
    events.forEach(e => {
      if (e.riskLevel !== 'LOW') {
        e.reasons.forEach(r => {
          if (r.includes('frequency')) reasonCounts['High click frequency'] += 1;
          else if (r.includes('Rapid') || r.includes('interval')) reasonCounts['Rapid clicking (< 1s)'] += 1;
          else if (r.includes('IP')) reasonCounts['Same IP repetition'] += 1;
          else if (r.includes('advertisement')) reasonCounts['Same advertisement'] += 1;
          else if (r.includes('Datacenter') || r.includes('Proxy')) reasonCounts['Datacenter / Botnet ASN'] += 1;
        });
      }
    });
    const total = Object.values(reasonCounts).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(reasonCounts).map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / total) * 100)
    }));
  }, [events]);

  const fraudRate = engineState.totalIngested > 0
    ? ((engineState.totalFraud / engineState.totalIngested) * 100).toFixed(1)
    : '0.0';

  const handleSpeedChange = (multiplier: number) => {
    setSelectedSpeed(multiplier);
    globalFlinkStream.setSpeed(multiplier);
  };

  const handleInjectAttack = (fraudType: FraudType) => {
    globalFlinkStream.injectAttack(fraudType, 8);
  };

  return (
    <div className="space-y-6">

      <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-xs text-amber-200">
        <strong>Click-fraud demo:</strong> these events and Kafka/Flink-style metrics are generated in the browser,
        not processed by the backend. Use <strong>Live DNS Pipeline</strong> for Kafka- and Apache Flink-backed events.
      </div>

      {/* Top 6 KPI Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Ingested</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1 tabular-nums">
            {engineState.totalIngested.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Throughput: <span className="text-slate-300 font-mono">{engineState.currentThroughputEps} eps</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Fraud Intercepted</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1 tabular-nums">
            {engineState.totalFraud.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Fraud Ratio: <span className="text-rose-400 font-mono font-semibold">{fraudRate}%</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Budget Protected</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            ${engineState.totalBudgetProtected.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Saved advertiser spend
          </div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Clean Billable</span>
            <Zap className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-bold font-mono text-sky-300 mt-1 tabular-nums">
            {engineState.totalValid.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Passed to billing sink
          </div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Stream Latency</span>
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-300 mt-1 tabular-nums">
            {engineState.watermarkDelayMs}ms
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Apache Flink SLA: &lt;50ms
          </div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active RocksDB Keys</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-300 mt-1 tabular-nums">
            {engineState.activeRocksDbKeys.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            State TTL: 1 hr sliding
          </div>
        </div>
      </div>

      {/* Stream Controls & Attack Injection Bar */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stream Velocity:</span>
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            {[1, 2, 5].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors ${
                  selectedSpeed === speed
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {!isStreamRunning && (
            <button
              onClick={() => globalFlinkStream.stepOnce()}
              className="px-3 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
            >
              Step Single Event
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            Inject Attack Wave:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleInjectAttack('CLICK_SPAMMING')}
              className="px-2.5 py-1 text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors whitespace-nowrap"
            >
              + Click Flood
            </button>
            <button
              onClick={() => handleInjectAttack('CLICK_INJECTION')}
              className="px-2.5 py-1 text-xs font-medium text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-colors whitespace-nowrap"
            >
              + Install Hijack
            </button>
            <button
              onClick={() => handleInjectAttack('DATACENTER_BOT')}
              className="px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors whitespace-nowrap"
            >
              + Cloud Botnet
            </button>
            <button
              onClick={() => handleInjectAttack('GHOST_CLICK')}
              className="px-2.5 py-1 text-xs font-medium text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-colors whitespace-nowrap"
            >
              + Ghost Click
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowConfigDrawer(!showConfigDrawer)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 border ${
            showConfigDrawer
              ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Tune Flink Rules</span>
        </button>
      </div>

      {/* Rules Tuning Drawer */}
      {showConfigDrawer && (
        <div className="p-5 bg-slate-900 border border-cyan-500/30 rounded-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-semibold text-white">
              Dynamic Flink Stream Processing & Hybrid Scoring Parameters
            </h4>
            <button
              onClick={() => {
                onUpdateEngineState({
                  slidingWindowSeconds: 10,
                  clickThresholdPerWindow: 8,
                  minAllowedCtitMs: 1800,
                  ruleWeight: 0.4,
                  mlWeight: 0.6
                });
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Sliding Window Length:</span>
                <span className="font-mono text-cyan-300 font-bold">{engineState.slidingWindowSeconds}s</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="1"
                value={engineState.slidingWindowSeconds}
                onChange={(e) => onUpdateEngineState({ slidingWindowSeconds: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">Duration Flink tracks IP click timestamps in RocksDB state.</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Velocity Threshold (Max Clicks):</span>
                <span className="font-mono text-cyan-300 font-bold">{engineState.clickThresholdPerWindow}</span>
              </div>
              <input
                type="range"
                min="3"
                max="25"
                step="1"
                value={engineState.clickThresholdPerWindow}
                onChange={(e) => onUpdateEngineState({ clickThresholdPerWindow: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">Clicks above this count in the window trigger an immediate BLOCK.</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Hybrid Rule Weight:</span>
                <span className="font-mono text-cyan-300 font-bold">{(engineState.ruleWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={engineState.ruleWeight}
                onChange={(e) => {
                  const r = Number(e.target.value);
                  onUpdateEngineState({ ruleWeight: r, mlWeight: parseFloat((1 - r).toFixed(1)) });
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">Balance between Rule Engine and ML Model probability.</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>ML Model Weight:</span>
                <span className="font-mono text-cyan-300 font-bold">{(engineState.mlWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={engineState.mlWeight}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  onUpdateEngineState({ mlWeight: m, ruleWeight: parseFloat((1 - m).toFixed(1)) });
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">Weight given to XGBoost TalkingData probability score.</p>
            </div>
          </div>
        </div>
      )}

      {/* 3-Column Auxiliary Analytics: Top IPs, Top Devices, Fraud Reasons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Top Suspicious IPs */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              Top Suspicious IPs (Window)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-500 font-mono">
                  <th className="py-1">IP Address</th>
                  <th className="py-1">Clicks</th>
                  <th className="py-1">Users</th>
                  <th className="py-1 text-right">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
                {topSuspiciousIps.length === 0 ? (
                  <tr><td colSpan={4} className="py-3 text-slate-500 text-center">Awaiting stream...</td></tr>
                ) : (
                  topSuspiciousIps.map(item => (
                    <tr key={item.ip}>
                      <td className="py-1.5 text-white font-mono">{item.ip}</td>
                      <td className="py-1.5 text-slate-300">{item.clicks}</td>
                      <td className="py-1.5 text-slate-300">{item.users.size}</td>
                      <td className="py-1.5 text-right">
                        <span className={item.highRiskCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                          {item.highRiskCount > 0 ? 'HIGH' : 'LOW'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 2: Top Devices */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              Top Click Devices
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-500 font-mono">
                  <th className="py-1">Device Type</th>
                  <th className="py-1">Clicks</th>
                  <th className="py-1 text-right">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
                {topSuspiciousDevices.length === 0 ? (
                  <tr><td colSpan={3} className="py-3 text-slate-500 text-center">Awaiting stream...</td></tr>
                ) : (
                  topSuspiciousDevices.map(item => (
                    <tr key={item.device}>
                      <td className="py-1.5 text-white uppercase">{item.device}</td>
                      <td className="py-1.5 text-slate-300">{item.clicks}</td>
                      <td className="py-1.5 text-right">
                        <span className={item.risk === 'HIGH' ? 'text-rose-400 font-bold' : item.risk === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'}>
                          {item.risk}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 3: Fraud Reasons Breakdown */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-amber-400" />
            Fraud Reasons Analysis
          </span>
          <div className="space-y-2 text-xs">
            {fraudReasonsDistribution.map(item => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300 truncate">{item.label}</span>
                  <span className="font-mono text-cyan-300 font-bold">{item.pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Real-Time Kafka Consumer Lag & Partition Offset Telemetry (Viva Justification) */}
      <KafkaConsumerLagSection kafkaState={kafkaState} />

      {/* Main Stream Activity Feed */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        
        {/* Table Controls Bar */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === 'ALL' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Events ({events.length})
            </button>
            <button
              onClick={() => setFilterType('BLOCKED')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === 'BLOCKED' ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60' : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              Blocked ({events.filter(e => e.action === 'BLOCKED').length})
            </button>
            <button
              onClick={() => setFilterType('FLAGGED')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === 'FLAGGED' ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60' : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              Flagged ({events.filter(e => e.action === 'FLAGGED').length})
            </button>
            <button
              onClick={() => setFilterType('VALID')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === 'VALID' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              Clean Valid ({events.filter(e => e.action === 'VALID').length})
            </button>
          </div>

          <div className="relative min-w-[280px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search Event, User, Ad, IP, Campaign..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Live Stream Table */}
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Event ID / Time</th>
                <th className="py-2.5 px-4">User & Device</th>
                <th className="py-2.5 px-4">Ad & Campaign</th>
                <th className="py-2.5 px-4">IP & Location</th>
                <th className="py-2.5 px-4">Stream Features</th>
                <th className="py-2.5 px-4">Risk & ML Score</th>
                <th className="py-2.5 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <p className="font-medium text-slate-400">No events matching current filter</p>
                    <p className="text-xs mt-1">Continuous events are streaming in... or launch an attack wave above.</p>
                  </td>
                </tr>
              ) : (
                filteredEvents.slice(0, 40).map((click) => {
                  const isBlocked = click.action === 'BLOCKED';
                  const isFlagged = click.action === 'FLAGGED';

                  return (
                    <tr 
                      key={click.eventId}
                      onClick={() => onSelectClick(click)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-2.5 px-4">
                        <div className="font-mono text-slate-200 font-semibold">{click.eventId}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {click.timestamp.split('T')[1].split('.')[0]} · {click.processingLatencyMs}ms
                        </div>
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="font-mono text-cyan-300 font-medium">{click.userId}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {click.deviceType} ({click.browser})
                        </div>
                      </td>

                      <td className="py-2.5 px-4 max-w-[180px]">
                        <div className="font-mono text-white font-medium">{click.adId}</div>
                        <div className="text-[11px] text-slate-400 truncate">{click.campaignName}</div>
                      </td>

                      <td className="py-2.5 px-4 max-w-[200px]">
                        <div className="font-mono text-slate-200">{click.ipAddress}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {click.city}, {click.country}
                        </div>
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="font-mono text-slate-300">
                          {click.features.clicksFromSameIp} IP clicks · {click.features.timeSincePreviousClickMs}ms int
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {click.features.sameAdClickCount} same ad · {click.features.uniqueUsersPerIp} users/IP
                        </div>
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-bold ${isBlocked ? 'text-rose-400' : isFlagged ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {click.riskScore}/100
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            (ML: {click.mlProbability})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {click.reasons[0]}
                        </div>
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectClick(click);
                          }}
                          className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors border border-slate-700 flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3 h-3 text-cyan-400" />
                          <span>Forensic</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Showing latest {Math.min(filteredEvents.length, 40)} simulated click events</span>
          <span>Click any event to view the 8 core project questions answered directly</span>
        </div>

      </div>

    </div>
  );
};
