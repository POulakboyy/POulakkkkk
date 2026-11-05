# POuxis sync relay — build context: apps/sync-server
#   docker build -t pouxis-sync apps/sync-server
#   docker run --read-only -v pouxis-sync-data:/data -e POUXIS_SYNC_SECRET=... -p 8787:8787 pouxis-sync
#
# Node >= 22.18 runs the TypeScript sources directly (type stripping): no build step.
# For reproducible builds, pin the base image by digest (node:22-alpine@sha256:...).

FROM node:22-alpine AS deps
WORKDIR /app
# The only runtime dependency (`ws` itself has no dependencies), installed with `npm ci` from a
# lockfile carrying the same sha512 integrity as the repository's package-lock.json: a tampered
# or substituted tarball fails the build (EINTEGRITY). Update both together.
RUN printf '%s\n' '{"name":"pouxis-sync-server","private":true,"type":"module","dependencies":{"ws":"8.22.0"}}' > package.json \
 && printf '%s\n' '{"name":"pouxis-sync-server","lockfileVersion":3,"requires":true,"packages":{"":{"name":"pouxis-sync-server","dependencies":{"ws":"8.22.0"}},"node_modules/ws":{"version":"8.22.0","resolved":"https://registry.npmjs.org/ws/-/ws-8.22.0.tgz","integrity":"sha512-Ydggc987+RO0AnWtZ/7Wq9FtNvcrL1b/RO0ud9mWjUPgDrsAAwQSF51sm2hm1XofbU/4jkpGEsLFsZZxU+1DOg==","license":"MIT"}}}' > package-lock.json \
 && npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
 && npm cache clean --force

FROM node:22-alpine
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    POUXIS_DATA_DIR=/data \
    POUXIS_STORAGE=file \
    POUXIS_FSYNC=always
WORKDIR /app
COPY --from=deps --chown=root:root /app/package.json /app/package-lock.json /app/
COPY --from=deps --chown=root:root /app/node_modules /app/node_modules
COPY --chown=root:root src /app/src
# Only the data volume is writable, and only by the unprivileged `node` user (uid 1000).
RUN mkdir -p /data && chown node:node /data && chmod 0700 /data
VOLUME ["/data"]
USER node
EXPOSE 8787
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
# Run node directly (not npm) so that SIGTERM reaches the process and drains connections.
CMD ["node", "src/index.ts"]
