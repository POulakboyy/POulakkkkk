/**
 * Entry point: `node src/index.ts`. Reads the configuration from the environment, starts
 * the relay and drains gracefully on SIGTERM/SIGINT.
 */
import { ConfigError, loadConfig, type ServerConfig } from './config.ts';
import { createLogger, serializeError } from './logger.ts';
import { startServer, type SyncServer } from './server.ts';

async function main(): Promise<void> {
  let config: ServerConfig;
  try {
    config = loadConfig(process.env);
  } catch (error) {
    const logger = createLogger();
    logger.error('config.invalid', {
      problems: error instanceof ConfigError ? error.problems : [String(error)],
    });
    process.exitCode = 2;
    return;
  }
  const logger = createLogger({ level: config.logLevel });
  if (config.development && config.secrets.length === 1 && process.env['POUXIS_SYNC_SECRET'] === undefined) {
    logger.warn('config.insecure_dev_secret', {
      hint: 'NODE_ENV=development without POUXIS_SYNC_SECRET: tokens use a public secret',
    });
  }

  let server: SyncServer;
  try {
    server = await startServer(config, { logger });
  } catch (error) {
    logger.error('server.start_failed', { err: error });
    process.exitCode = 1;
    return;
  }

  let stopping = false;
  const stop = (signal: string): void => {
    if (stopping) {
      logger.warn('server.forced_exit', { signal });
      process.exit(1);
    }
    stopping = true;
    logger.info('server.signal', { signal });
    server.close().then(
      () => process.exit(0),
      (error: unknown) => {
        logger.error('server.shutdown_failed', { err: error });
        process.exit(1);
      },
    );
  };
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));

  const crash = (kind: string) => (error: unknown) => {
    logger.error(kind, { err: serializeError(error) });
    // Best effort: flush storage before exiting.
    const timer = setTimeout(() => process.exit(1), config.shutdownTimeoutMs + 1000);
    timer.unref();
    server.close().finally(() => process.exit(1));
  };
  process.on('uncaughtException', crash('process.uncaught_exception'));
  process.on('unhandledRejection', crash('process.unhandled_rejection'));
}

void main();
