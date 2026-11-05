import React, { useState } from 'react';
import { KafkaConsumerLagState, KafkaPartitionMetric } from '../types/fraud';
import { 
  Layers, 
  Activity, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  HelpCircle, 
  Server, 
  CheckCircle2, 
  Flame, 
  Clock,
  ArrowRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { globalFlinkStream } from '../services/streamSimulator';

interface KafkaConsumerLagSectionProps {
  kafkaState: KafkaConsumerLagState;
}

export const KafkaConsumerLagSection: React.FC<KafkaConsumerLagSectionProps> = ({ kafkaState }) => {
  const [showVivaExplanation, setShowVivaExplanation] = useState(true);
  const [surgeTriggered, setSurgeTriggered] = useState(false);

  const handleSimulateSurge = () => {
    // Inject click spamming burst to demonstrate instant lag spike & Flink's rapid drain recovery
    globalFlinkStream.injectAttack('CLICK_SPAMMING', 12);
    setSurgeTriggered(true);
    setTimeout(() => setSurgeTriggered(false), 3000);
  };

  const isLagHealthy = kafkaState.totalLag < 30;
  const isElevated = kafkaState.totalLag >= 30 && kafkaState.totalLag < 60;

  return (
    <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-xl space-y-6 shadow-xl relative overflow-hidden">
      
      {/* Background Accent Mesh */}
      <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-indigo-500/10 via-cyan-500/5 to-transparent pointer-events-none" />

      {/* Header & Viva Defense Badge */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 font-mono">
              <Server className="w-3.5 h-3.5" />
              Demo Kafka & Flink Telemetry (Simulated)
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 rounded">
              Viva Stream Justification
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">
            Simulated Consumer Lag & Partition Offset Matrix
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Demo values for topic <code className="text-cyan-300 font-mono">ad-click-events</code>; this view is not connected to a Kafka broker. Consumer group label: <code className="text-cyan-300 font-mono">{kafkaState.consumerGroup}</code>.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateSurge}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border ${
              surgeTriggered 
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
            }`}
            title="Inject 12 clicks to observe broker LEO surge and Flink continuous drain"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Simulate Traffic Burst</span>
          </button>

          <button
            onClick={() => setShowVivaExplanation(!showVivaExplanation)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 border ${
              showVivaExplanation 
                ? 'bg-slate-800 text-white border-slate-700'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showVivaExplanation ? 'Hide Viva Guide' : 'Viva Defense Guide'}</span>
          </button>
        </div>
      </div>

      {/* Top 4 Lag & Offset KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        
        {/* Card 1: Total Lag */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Consumer Lag</span>
            <span className={`w-2 h-2 rounded-full ${
              isLagHealthy ? 'bg-emerald-400' : isElevated ? 'bg-amber-400' : 'bg-rose-400'
            }`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono tabular-nums ${
              isLagHealthy ? 'text-emerald-400' : isElevated ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {kafkaState.totalLag}
            </span>
            <span className="text-xs text-slate-500">records</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Status: <strong className="text-slate-300 font-mono">{isLagHealthy ? 'OPTIMAL (<30)' : 'ELEVATED (Draining)'}</strong>
          </div>
        </div>

        {/* Card 2: Broker LEO vs Flink Committed */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Broker LEO / Committed</span>
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white tabular-nums truncate">
            {kafkaState.totalLogEndOffset.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Committed: <span className="text-cyan-300">{kafkaState.totalCommittedOffset.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 3: Flink Backpressure Ratio */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Flink Backpressure</span>
            <Activity className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-purple-300 tabular-nums">
              {(kafkaState.backpressureRatio * 100).toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500 font-mono">credit flow</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Network Buffers: <strong className="text-slate-300 font-mono">Nominal</strong>
          </div>
        </div>

        {/* Card 4: Checkpoint & Two-Phase Commit */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Checkpoint ID & SLA</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-300 tabular-nums">
              #{kafkaState.checkpointId}
            </span>
            <span className="text-xs text-slate-500 font-mono">{kafkaState.lastCheckpointDurationMs}ms</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Two-Phase Commit: <span className="text-emerald-400 font-bold">ACTIVE</span>
          </div>
        </div>

      </div>

      {/* Partition-by-Partition Offset Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            Partition Offset Allocation Matrix (Topic: ad-click-events)
          </h4>
          <span className="text-[11px] text-slate-500 font-mono">
            Partition Key: publisher_id + ip_subnet
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-mono uppercase bg-slate-950/50">
                <th className="py-2.5 px-3">Partition</th>
                <th className="py-2.5 px-3">Broker Node</th>
                <th className="py-2.5 px-3">Assigned Flink Slot</th>
                <th className="py-2.5 px-3">Log End Offset (LEO)</th>
                <th className="py-2.5 px-3">Committed Offset</th>
                <th className="py-2.5 px-3">Current Lag</th>
                <th className="py-2.5 px-3">Buffer Headroom</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {kafkaState.partitions.map((partition) => {
                const isPartLagHigh = partition.lag > 20;
                const isPartLagElevated = partition.lag > 8 && partition.lag <= 20;

                return (
                  <tr key={partition.partitionId} className="hover:bg-slate-800/40 transition-colors">
                    
                    {/* Partition ID */}
                    <td className="py-2.5 px-3 font-bold text-white">
                      <span className="text-cyan-400">P-{partition.partitionId}</span>
                    </td>

                    {/* Broker Node */}
                    <td className="py-2.5 px-3 text-slate-400">
                      {partition.brokerNode}
                    </td>

                    {/* Flink TaskManager Slot */}
                    <td className="py-2.5 px-3 text-slate-300">
                      <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[11px]">
                        {partition.assignedSlot}
                      </span>
                    </td>

                    {/* LEO */}
                    <td className="py-2.5 px-3 text-white font-medium">
                      {partition.logEndOffset.toLocaleString()}
                    </td>

                    {/* Committed Offset */}
                    <td className="py-2.5 px-3 text-slate-300">
                      {partition.committedOffset.toLocaleString()}
                    </td>

                    {/* Lag */}
                    <td className="py-2.5 px-3 font-bold">
                      <span className={
                        isPartLagHigh ? 'text-rose-400' : isPartLagElevated ? 'text-amber-400' : 'text-emerald-400'
                      }>
                        {partition.lag} msgs
                      </span>
                    </td>

                    {/* Progress Bar */}
                    <td className="py-2.5 px-3 min-w-[140px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>{partition.progressPct}% caught up</span>
                          <span>{partition.eps} eps</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              isPartLagHigh ? 'bg-rose-500' : isPartLagElevated ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.max(10, partition.progressPct)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isPartLagHigh ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        isPartLagElevated ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {partition.status}
                      </span>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Viva Defense Explanation Panel */}
      {showVivaExplanation && (
        <div className="p-5 bg-slate-950 border border-indigo-500/30 rounded-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-semibold text-white">
                Viva Justification: Why Kafka Consumer Lag Proves Flink Superiority Over Spark Streaming
              </h4>
            </div>
            <span className="text-[11px] font-mono text-cyan-400">Examiner Q&A Key Topic</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
            
            {/* Point 1: Push-Based vs Pull-Based Micro-Batch */}
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                1. Continuous Event-Driven vs Micro-Batch Pull
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                <strong>Spark Streaming</strong> queries Kafka at fixed intervals (e.g., 500ms–2s). Under a click flood attack, batch processing time exceeds the interval (T_process &gt; T_batch), causing <em>exponential lag accumulation</em>. 
                <strong> Apache Flink</strong> reads records continuously via persistent TCP pipelines, processing each event in &lt;20ms with near-zero queue buildup.
              </p>
            </div>

            {/* Point 2: Chandy-Lamport Checkpoints */}
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                2. Chandy-Lamport Exactly-Once Offset Commits
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Rather than pausing stream ingestion to commit offsets like Spark RDD checkpoints, Flink injects lightweight <strong>Checkpoint Barriers</strong> into the stream. Offsets are committed atomically to Kafka using a Two-Phase Commit Sink only when the snapshot barrier successfully passes all operators.
              </p>
            </div>

            {/* Point 3: Financial Consequence of Consumer Lag */}
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                3. Financial Impact: Why Lag Must Be Sub-Second
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                In Pay-Per-Click (CPC) ad exchanges, advertisers set daily budget caps. If consumer lag grows to 30 seconds (common under Spark batch spikes), botnets successfully trigger 2,000+ clicks and drain the campaign budget before fraud classification can intercept them!
              </p>
            </div>

          </div>

          {/* Mathematical Formulation */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono space-y-1">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider block">
              Lag & Offset Mathematical Formulation:
            </span>
            <div className="text-cyan-300">
              Partition Lag[p](t) = LogEndOffset[p](t) - CommittedOffset[p](t)
            </div>
            <div className="text-slate-400 text-[11px]">
              Where Total Group Lag(t) = Σ (p=0 to P-1) Lag[p](t). In Flink, d/dt(Lag) ≤ 0 under continuous flow control.
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
