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
    id: 'source-api',
    step: '01',
    title: 'Threat Event API',
    category: 'External Source',
    icon: Server,
    summary: 'An optional authenticated REST poller reads cursor-paginated DNS threat events. Until the source URL is configured, events can be pushed through the backend ingestion endpoint.',
    latency: 'Configured interval',
    throughput: 'Source-dependent',
    features: ['Credentials supplied through environment variables', 'Cursor and response paths configurable', 'No browser-generated events']
  },
  {
    id: 'kafka-input',
    step: '02',
    title: 'Kafka Input Topic',
    category: 'Durable Ingestion',
    icon: Database,
    summary: 'The FastAPI gateway or API poller waits for an all-replica broker acknowledgement before reporting an event as accepted.',
    latency: 'Broker dependent',
    throughput: 'Kafka dependent',
    features: ['KRaft single broker in local Compose', 'Source IP used as Kafka message key', 'Raw input topic is replayable']
  },
  {
    id: 'flink-state',
    step: '03',
    title: 'Apache Flink State',
    category: 'Stream Processing',
    icon: Zap,
    summary: 'A Java DataStream job consumes the input topic and tracks a processing-time rolling 60-second event count keyed by source IP.',
    latency: 'Live job metric',
    throughput: 'Cluster dependent',
    features: ['Managed keyed ListState', 'Checkpointing enabled', 'Malformed records routed to a dead-letter topic']
  },
  {
    id: 'ml_scoring',
    step: '04',
    title: 'DNS Model Inference',
    category: 'FastAPI ML Service',
    icon: Cpu,
    summary: 'For each valid DNS event, Flink calls the FastAPI service, which derives the model feature schema and scores the query using the loaded Random Forest artifact.',
    latency: 'Live request latency',
    throughput: 'API dependent',
    features: ['Uses the checked-in DNS model artifact', 'Model-derived probability replaces upstream score', 'HTTP failures are retried by Flink']
  },
  {
    id: 'fusion',
    step: '05',
    title: 'Risk Fusion',
    category: 'Decision Policy',
    icon: ShieldCheck,
    summary: 'The Flink operator combines the local DNS model probability with the event-provided abuse score and emits an ALLOW, FLAG, or BLOCK decision.',
    latency: 'Included in job',
    throughput: 'Cluster dependent',
    features: ['60% local model / 40% supplied threat score', 'BLOCK at 0.65 and FLAG at 0.45', 'Original source event retained for audit']
  },
  {
    id: 'sink',
    step: '06',
    title: 'Kafka Output & UI',
    category: 'Delivery',
    icon: Activity,
    summary: 'Scored events and malformed records go to separate Kafka topics. FastAPI consumes the scored topic and broadcasts it to the Live DNS Pipeline WebSocket.',
    latency: 'Live status endpoint',
    throughput: 'Kafka dependent',
    features: ['At-least-once Kafka sink delivery', 'FastAPI WebSocket fan-out', 'Flink and Kafka health shown in the UI']
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
          Deployable DNS threat pipeline with optional REST polling, Kafka, a stateful Apache Flink job, FastAPI model inference, and a backend-fed WebSocket monitor.
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
