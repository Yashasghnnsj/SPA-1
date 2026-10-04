import React, { useState } from 'react';
import { 
  Workflow, 
  Layers, 
  Zap, 
  Database, 
  Cpu, 
  ShieldCheck, 
  Server, 
  Activity, 
  ArrowRight,
  CheckCircle2,
  Lock,
  Gauge
} from 'lucide-react';

interface ArchitectureNode {
  id: string;
  step: string;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  summary: string;
  latency: string;
  throughput: string;
  features: string[];
}

const ARCHITECTURE_NODES: ArchitectureNode[] = [
  {
    id: 'ingestion',
    step: '01',
    title: 'Kafka Telemetry Ingestion',
    category: 'Ingestion Layer',
    icon: Server,
    summary: 'High-throughput distributed message broker streaming raw ad click and impression payloads across 6 balanced partitions.',
    latency: '< 5 ms',
    throughput: '35,000 EPS',
    features: ['KRaft consensus protocol', 'Strict timestamped event ordering', '6 parallel partition streams']
  },
  {
    id: 'windowing',
    step: '02',
    title: 'Flink Stateful Windowing',
    category: 'Stream Engine',
    icon: Zap,
    summary: 'Calculates rolling 10-second sliding and 60-second tumbling window metrics per IP address and User ID backed by RocksDB.',
    latency: '< 15 ms',
    throughput: '30,000 EPS',
    features: ['Out-of-order event watermarks', 'Incremental RocksDB checkpointing', 'Rolling IP velocity counters']
  },
  {
    id: 'joins',
    step: '03',
    title: 'Stream Interval Joins',
    category: 'Event Correlation',
    icon: Layers,
    summary: 'Temporal interval join matching click events with prior impression events to immediately catch Ghost Click fraud.',
    latency: '< 20 ms',
    throughput: '28,000 EPS',
    features: ['Impression-to-Click time bounds', 'Bounded state retention', 'Ghost click immediate rejection']
  },
  {
    id: 'ml_scoring',
    step: '04',
    title: 'XGBoost ML Inference',
    category: 'AI Engine',
    icon: Cpu,
    summary: 'Sub-2ms real-time inference on 15 streaming behavioral features with 96.25% ROC-AUC and 99.90% precision.',
    latency: '< 1.2 ms',
    throughput: '45,000 EPS',
    features: ['15 behavioral feature inputs', 'Class-imbalance weighted scoring', 'Real-time confidence evaluation']
  },
  {
    id: 'cep_rules',
    step: '05',
    title: 'CEP Pattern Matcher',
    category: 'Pattern Engine',
    icon: ShieldCheck,
    summary: 'Deterministic Complex Event Processing automata catching high-speed click spamming bursts and fast CTIT click injections.',
    latency: '< 2 ms',
    throughput: '50,000 EPS',
    features: ['CTIT threshold validation', 'Bot coordinate entropy analysis', 'Datacenter ASN blacklisting']
  },
  {
    id: 'sink',
    step: '06',
    title: 'Decision Routing & Sink',
    category: 'Action & Storage',
    icon: Database,
    summary: 'Diverts valid clicks to advertiser billing and dispatches malicious clicks to quarantine storage and real-time security alerts.',
    latency: '< 8 ms',
    throughput: '30,000 EPS',
    features: ['Side-output error routing', 'PostgreSQL / Parquet cold storage', 'Real-time billing gateway protection']
  }
];

export const ArchitectureView: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(ARCHITECTURE_NODES[0].id);

  const selectedNode = ARCHITECTURE_NODES.find(n => n.id === selectedNodeId) || ARCHITECTURE_NODES[0];
  const IconComponent = selectedNode.icon;

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />
        <div className="max-w-2xl space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
            <Workflow className="w-4 h-4" />
            <span>End-to-End Pipeline Architecture</span>
          </div>
          <h2 className="text-xl font-bold text-white">
            Real-Time Stream Processing Topology
          </h2>
          <p className="text-xs text-slate-300">
            Distributed event streaming architecture combining Apache Kafka, Apache Flink stateful sliding windows, and GPU-trained XGBoost inference.
          </p>
        </div>
      </div>

      {/* Interactive Architecture Flow Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {ARCHITECTURE_NODES.map((node) => {
          const isSelected = node.id === selectedNodeId;
          const NodeIcon = node.icon;
          return (
            <button
              key={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              className={`p-4 text-left rounded-xl transition-all border flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-800/90 border-cyan-400 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/50'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                  <span className="text-slate-500">STAGE {node.step}</span>
                  <NodeIcon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                </div>
                <h4 className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                  {node.title}
                </h4>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-3">
                {node.category}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Node Details Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono text-cyan-400 uppercase font-semibold">
                Pipeline Stage {selectedNode.step} · {selectedNode.category}
              </span>
              <h3 className="text-lg font-bold text-white">
                {selectedNode.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 mr-2">SLA Latency:</span>
              <span className="text-emerald-400 font-bold">{selectedNode.latency}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 mr-2">Max Capacity:</span>
              <span className="text-cyan-400 font-bold">{selectedNode.throughput}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed max-w-3xl">
          {selectedNode.summary}
        </p>

        {/* Feature Capabilities */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Operational Capabilities
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {selectedNode.features.map((feat, idx) => (
              <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
