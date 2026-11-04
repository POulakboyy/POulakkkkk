import { describe, it, expect } from 'vitest';
import * as g from './index.ts';
const node = (id: string, label: string, extra: object = {}) => ({ id, label, kind: 'idea', x: 0, y: 0, ...extra }) as any;
describe('probe', () => {
  it('outline roundtrip tricky labels', () => {
    const labels = ['1. foo', '- [ ] x', '# h', '> q', '* star', '+ plus', '```', '---', '  spaced  ', 'a\nb', '\\back', '[x] done'];
    const nodes = [node('r', 'root'), ...labels.map((l, i) => node('n' + i, l, { parentId: 'r' }))];
    const md = g.toOutline({ nodes, edges: [] } as any);
    const back = g.fromOutline(md);
    console.log(md);
    console.log(back.nodes.map((n: any) => JSON.stringify(n.label)).join(' | '));
    expect(back.nodes.length).toBe(nodes.length);
  });
  it('opml roundtrip', () => {
    const nodes = [node('r', 'a & <b> "c" \'d\' é 😀'), node('c', 'child', { parentId: 'r' })];
    const xml = g.toOPML({ nodes, edges: [] } as any, { title: 'T&' });
    const back = g.fromOPML(xml);
    expect(back.nodes.map((n: any) => n.label)).toEqual(['a & <b> "c" \'d\' é 😀', 'child']);
    expect(back.title).toBe('T&');
    expect(() => g.fromOPML('<!DOCTYPE opml [<!ENTITY a "x">]><opml><body/></opml>')).toThrow();
    expect(() => g.fromOPML('<opml><body><outline text="x"></body></opml>')).toThrow();
  });
  it('zoomAround fixed point', () => {
    const v = { x: 10, y: -20, zoom: 1.3 };
    const p = { x: 200, y: 150 };
    const w = g.screenToWorld(p, v);
    const v2 = g.zoomAround(v, p, 2);
    const w2 = g.screenToWorld(p, v2);
    console.log(v2, w, w2);
    expect(w2.x).toBeCloseTo(w.x); expect(w2.y).toBeCloseTo(w.y);
  });
  it('timeline DST', () => {
    const s = g.createTimeScale({ start: Date.parse('2026-03-28T00:00:00Z'), end: Date.parse('2026-04-02T00:00:00Z'), x0: 0, x1: 1000, timeZone: 'Europe/Paris' } as any);
    console.log(JSON.stringify(s.ticks().slice(0, 8).map((t:any)=>[new Date(t.time??t.t??t.at).toISOString(), t])));
  });
});
