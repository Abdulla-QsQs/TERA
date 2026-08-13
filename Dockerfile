FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    PORT=4173
WORKDIR /app
COPY --chown=node:node index.html TERA.html NOTICE.html robots.txt sitemap.xml core.js wall.js wall.css server.js visitor-store.js runtime-manifest.js ./
COPY --chown=node:node THIRD_PARTY_NOTICES.md ./
COPY --chown=node:node LICENSE SUPPORT.md ./
COPY --chown=node:node LICENSES ./LICENSES
COPY --chown=node:node vendor ./vendor
COPY --chown=node:node assets ./assets
COPY --chown=node:node docs/IMPACT_METHOD.md ./docs/IMPACT_METHOD.md

USER node
EXPOSE 4173
CMD ["node", "server.js"]
