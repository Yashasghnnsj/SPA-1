import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Ban, CheckCircle2, Radio, RefreshCw, ShieldAlert } from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

interface ScoredThreatEvent {
  event_id: string;
  timestamp: string;
  source_ip: string;
  vector_type: string;
  domain_query: string;
  ml_inference?: {
    classification?: string;
    exfiltration_probability?: number;
    confidence?: number;
  };
  policy_decision?: {
    action?: 'ALLOW' | 'FLAG' | 'BLOCK';
    final_risk_score?: number;
    reason?: string;
  };
  flink?: {
    engine?: string;
    processed_at?: string;
    source_ip_events_last_minute?: number;
  };
  source_event?: {
    source_type?: string;
    simulation_scenario?: string;
  };
}

interface PipelineStatus {
  source_api_configured: boolean;
  kafka: {
    output_consumer_connected: boolean;
    last_event_at: string | null;
    last_error: string | null;
  };
  flink: {
    reachable: boolean;
    jobs?: { jid: string; name: string; state: string }[];
    error?: string;
  };
  model: { loaded: boolean; version: string };
  topics: { input: string; scored: string; dead_letter: string };
}

export const DnsThreatPipelineView: React.FC = () => {
  const [events, setEvents] = useState<ScoredThreatEvent[]>([]);
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [socketState, setSocketState] = useState<'connecting' | 'connected' | 'reconnecting'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [reconnectToken, setReconnectToken] = useState(0);

  useEffect(() => {
    let active = true;
    let retryTimer: number | undefined;
    let socket: WebSocket | undefined;

    const connect = () => {
      if (!active) return;
      setSocketState('connecting');
      const wsUrl = new URL(`${API_BASE_URL}/ws/threat-events`);
      wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(wsUrl);
      socket.onopen = () => {
        if (active) {
          setSocketState('connected');
          setError(null);
        }
      };
      socket.onmessage = (message) => {
        if (!active) return;
        try {
          const event = JSON.parse(message.data) as ScoredThreatEvent & { type?: string };
          if (event.type !== 'connected' && event.event_id) {
            setEvents((current) => [event, ...current].slice(0, 100));
          }
        } catch {
          setError('Received an unreadable event from the backend stream.');
        }
      };
      socket.onerror = () => {
        if (active) setError('Backend WebSocket is unavailable; retrying connection.');
      };
      socket.onclose = () => {
        if (active) {
          setSocketState('reconnecting');
          retryTimer = window.setTimeout(connect, 3000);
        }
      };
    };

    const refreshStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/pipeline/status`);
        if (!response.ok) throw new Error(`Pipeline status returned HTTP ${response.status}.`);
        const nextStatus = (await response.json()) as PipelineStatus;
        if (active) setStatus(nextStatus);
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Failed to load pipeline status.');
        }
      }
    };

    connect();
    void refreshStatus();
    const statusTimer = window.setInterval(() => void refreshStatus(), 10000);

    return () => {
      active = false;
      window.clearInterval(statusTimer);
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [reconnectToken]);

  const blockedCount = useMemo(
    () => events.filter((event) => event.policy_decision?.action === 'BLOCK').length,
    [events],
  );
  const runningJob = status?.flink.jobs?.find((job) => job.state === 'RUNNING');

  const statusLabel = (healthy: boolean, readyText: string, waitingText: string) => (
    <span className={`inline-flex items-center gap-1.5 text-xs ${healthy ? 'text-emerald-300' : 'text-amber-300'}`}>
      {healthy ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {healthy ? readyText : waitingText}
    </span>
  );

  return (
    <section className="space-y-5">
      <header className="rounded-xl border border-cyan-900/70 bg-slate-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
              <Radio className="h-4 w-4" />
              Live DNS threat pipeline
            </div>
            <h2 className="mt-2 text-xl font-bold text-white">API → Kafka → Apache Flink → ML → WebSocket</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Events are shown only after the backend receives them, Flink performs per-IP stateful windowing,
              and the DNS model scores the domain. Synthetic events are sent through this same backend path and are labeled.
            </p>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
            socketState === 'connected'
              ? 'border-emerald-700 bg-emerald-950/60 text-emerald-300'
              : 'border-amber-700 bg-amber-950/40 text-amber-300'
          }`}>
            <span className={`h-2 w-2 rounded-full ${socketState === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {socketState === 'connected' ? 'Backend stream connected' : socketState === 'connecting' ? 'Connecting to backend' : 'Reconnecting'}
          </span>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs text-slate-400">Events received by UI</div>
          <div className="mt-1 font-mono text-2xl font-bold text-white">{events.length}</div>
          <div className="mt-2">{statusLabel(socketState === 'connected', 'WebSocket live', 'Waiting for WebSocket')}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs text-slate-400">Blocked in recent events</div>
          <div className="mt-1 font-mono text-2xl font-bold text-rose-300">{blockedCount}</div>
          <div className="mt-2 text-xs text-slate-500">Based on Flink output shown below</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs text-slate-400">Kafka output consumer</div>
          <div className="mt-2">{statusLabel(status?.kafka.output_consumer_connected === true, 'Connected', 'Not connected')}</div>
          <div className="mt-2 truncate font-mono text-[11px] text-slate-500">{status?.topics.scored || 'dns-threat-events-scored'}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs text-slate-400">Flink job / DNS model</div>
          <div className="mt-2">{statusLabel(Boolean(runningJob), runningJob?.name || 'Job running', 'Flink job not detected')}</div>
          <div className="mt-2 truncate font-mono text-[11px] text-slate-500">
            {status?.model.loaded ? `Model ${status.model.version}` : 'DNS model unavailable'}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Activity className="h-4 w-4 text-cyan-400" />
            Runtime dependencies
          </div>
          <button
            type="button"
            onClick={() => setReconnectToken((current) => current + 1)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reconnect
          </button>
        </div>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-slate-950 p-3">
            <div className="text-xs text-slate-500">External event API</div>
            <div className="mt-1 text-slate-200">{status?.source_api_configured ? 'Configured' : 'Not configured — waiting for endpoint'}</div>
          </div>
          <div className="rounded-lg bg-slate-950 p-3">
            <div className="text-xs text-slate-500">Kafka broker / Flink REST</div>
            <div className="mt-1 text-slate-200">
              {status?.kafka.output_consumer_connected ? 'Kafka connected' : 'Kafka unavailable'}
              {' · '}
              {status?.flink.reachable ? 'Flink reachable' : 'Flink unavailable'}
            </div>
          </div>
          <div className="rounded-lg bg-slate-950 p-3">
            <div className="text-xs text-slate-500">Input / dead-letter topics</div>
            <div className="mt-1 break-all font-mono text-xs text-slate-300">
              {status?.topics.input || 'dns-threat-events'} / {status?.topics.dead_letter || 'dns-threat-events-dead-letter'}
            </div>
          </div>
        </div>
        {error && <p role="status" className="mt-3 text-xs text-amber-300">{error}</p>}
        {!status?.source_api_configured && (
          <p className="mt-3 text-xs text-slate-400">
            The external API URL is not ready yet. Configure EVENT_API_URL and API_SECRET for polling, or POST a
            validated event to <code className="text-cyan-300">/api/events</code>. To stream demo data through Kafka and
            Flink, run <code className="text-cyan-300">docker compose --profile simulation up -d --build synthetic-dns-source</code>.
            Simulated events are not real threat telemetry.
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Flink-scored DNS events</h3>
          <span className="text-xs text-slate-500">Latest {events.length} · live output topic</span>
        </div>
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead className="sticky top-0 bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Event / time</th>
                <th className="px-4 py-3 font-medium">Domain</th>
                <th className="px-4 py-3 font-medium">Source IP</th>
                <th className="px-4 py-3 font-medium">Model risk</th>
                <th className="px-4 py-3 font-medium">Decision</th>
                <th className="px-4 py-3 font-medium">Flink window</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-slate-600" />
                      No scored events yet. Start the optional simulation profile or publish an event to /api/events.
                    </div>
                  </td>
                </tr>
              ) : events.map((event, index) => {
                const action = event.policy_decision?.action || 'ALLOW';
                const actionClass = action === 'BLOCK'
                  ? 'text-rose-300'
                  : action === 'FLAG' ? 'text-amber-300' : 'text-emerald-300';
                return (
                  <tr key={`${event.event_id}-${index}`} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="font-mono text-slate-200">{event.event_id || '—'}</div>
                      <div className="mt-1 text-slate-500">{event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '—'}</div>
                    </td>
                    <td className="max-w-[280px] px-4 py-3">
                      <div className="break-all font-mono text-cyan-200">{event.domain_query || '—'}</div>
                      <div className="mt-1 text-slate-500">{event.vector_type || 'dns_exfiltration'}</div>
                      {event.source_event?.source_type === 'synthetic' && (
                        <div className="mt-1 text-amber-300">
                          SIMULATED · {event.source_event.simulation_scenario || 'demo'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">{event.source_ip || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-slate-200">
                        {typeof event.policy_decision?.final_risk_score === 'number'
                          ? `${(event.policy_decision.final_risk_score * 100).toFixed(1)}%`
                          : '—'}
                      </div>
                      <div className="mt-1 text-slate-500">
                        ML {event.ml_inference?.exfiltration_probability ?? '—'}%
                      </div>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${actionClass}`}>
                      {action === 'BLOCK' ? <Ban className="mr-1 inline h-3.5 w-3.5" /> : null}
                      {action}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {event.flink?.source_ip_events_last_minute ?? '—'} / 60s
                      <div className="mt-1 text-slate-500">{event.flink?.engine || 'Flink'}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
