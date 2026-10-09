/**
 * @pouxis/core — the domain engine shared by every POuxis client (desktop, mobile, CLI, server).
 *
 * Shared primitives are exported flat; each engine module is exported as a namespace to keep
 * names unambiguous (`scheduler.route(...)`, `nlp.parse(...)`). Modules can also be imported
 * directly: `import { route } from '@pouxis/core/scheduler'`.
 */
export * from './model.ts';
export * from './time.ts';
export * from './id.ts';

export * as nlp from './nlp/index.ts';
export * as recurrence from './recurrence/index.ts';
export * as scheduler from './scheduler/index.ts';
export * as tasks from './tasks/index.ts';
export * as sync from './sync/index.ts';
export * as insights from './insights/index.ts';
export * as ideation from './ideation/index.ts';
export * as search from './search/index.ts';
export * as graph from './graph/index.ts';
export * as crypto from './crypto/index.ts';
