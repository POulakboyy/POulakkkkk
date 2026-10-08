/**
 * Minimal Prometheus-compatible metrics registry (text exposition format 0.0.4).
 *
 * Only aggregate counters and gauges with bounded, server-defined label values: no space
 * ids, node ids, addresses or anything else that could identify a user.
 */

const COUNTERS = {
  pouxis_sync_connections_total: 'WebSocket connections accepted.',
  pouxis_sync_connections_rejected_total: 'Upgrade requests rejected, by reason.',
  pouxis_sync_messages_received_total: 'Valid client messages, by type.',
  pouxis_sync_bytes_received_total: 'Inbound WebSocket text bytes.',
  pouxis_sync_bytes_sent_total: 'Outbound WebSocket text bytes.',
  pouxis_sync_envelopes_stored_total: 'Envelopes appended to space logs.',
  pouxis_sync_envelopes_duplicate_total: 'Pushed envelopes ignored because already stored.',
  pouxis_sync_envelopes_delivered_total: 'Envelopes sent to clients (backlog and live).',
  pouxis_sync_auth_failures_total: 'Hello messages rejected by token verification.',
  pouxis_sync_protocol_errors_total: 'Connections closed for protocol or schema violations.',
  pouxis_sync_rate_limited_total: 'Frames dropped by the per-connection rate limiter.',
  pouxis_sync_frames_too_large_total: 'Connections closed for exceeding the max frame size.',
  pouxis_sync_slow_consumers_total: 'Connections closed because their send buffer was full.',
  pouxis_sync_heartbeat_timeouts_total: 'Connections terminated after a missed pong.',
  pouxis_sync_storage_errors_total: 'Storage operations that failed.',
  pouxis_sync_quota_exceeded_total: 'Pushes refused because the space quota was reached.',
} as const;

export type CounterName = keyof typeof COUNTERS;

const GAUGES = {
  pouxis_sync_connections_active: 'Open WebSocket connections.',
  pouxis_sync_spaces_active: 'Space logs currently open.',
  pouxis_sync_uptime_seconds: 'Seconds since the server started.',
} as const;

export type GaugeName = keyof typeof GAUGES;

export class Metrics {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<GaugeName, () => number>();
  private readonly startedAt: number;

  constructor(now: () => number = Date.now) {
    this.startedAt = now();
    this.gauges.set('pouxis_sync_uptime_seconds', () => Math.floor((now() - this.startedAt) / 1000));
  }

  inc(name: CounterName, by = 1, label?: { key: string; value: string }): void {
    const id = label ? `${name}{${label.key}="${escapeLabel(label.value)}"}` : name;
    this.counters.set(id, (this.counters.get(id) ?? 0) + by);
  }

  /** Current value of a counter series (tests and health reporting). */
  get(name: CounterName, label?: { key: string; value: string }): number {
    const id = label ? `${name}{${label.key}="${escapeLabel(label.value)}"}` : name;
    return this.counters.get(id) ?? 0;
  }

  gauge(name: GaugeName, read: () => number): void {
    this.gauges.set(name, read);
  }

  render(): string {
    const lines: string[] = [];
    for (const [name, help] of Object.entries(COUNTERS)) {
      lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} counter`);
      let any = false;
      for (const [id, value] of this.counters) {
        if (id === name || id.startsWith(`${name}{`)) {
          lines.push(`${id} ${value}`);
          any = true;
        }
      }
      if (!any) lines.push(`${name} 0`);
    }
    for (const [name, help] of Object.entries(GAUGES)) {
      const read = this.gauges.get(name as GaugeName);
      lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} gauge`, `${name} ${read ? read() : 0}`);
    }
    return lines.join('\n') + '\n';
  }
}

function escapeLabel(value: string): string {
  return value.replace(/[\\"\n]/g, (c) => (c === '\n' ? '\\n' : `\\${c}`));
}
