#!/usr/bin/env node
/**
 * Weekly price-match report.
 *
 *   node src/cli.js [--config config.json] [--catalog products.json | --storefront]
 *                   [--limit N] [--sku "278384RBR dkgio"] [--out reports]
 *
 * Reads our catalog, checks the competitor sources enabled in the config, and
 * writes a CSV + JSON report of suggested prices. It never changes prices.
 */
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { loadCatalogFromFile, loadCatalogFromShopify, loadCatalogFromStorefront } from './catalog.js';
import { runPriceMatch } from './run.js';
import { summarize, writeReport } from './report.js';
import { createShopifyStoreSource } from './sources/shopify-store.js';
import { createSerpApiSource } from './sources/serpapi.js';
import { createDataForSeoSource } from './sources/dataforseo.js';

const log = msg => console.error(`[price-match] ${msg}`);

function buildSources(config, env) {
  const sources = [];
  for (const cfg of config.sources || []) {
    if (cfg.enabled === false) continue;
    switch (cfg.type) {
      case 'shopify-store':
        sources.push(createShopifyStoreSource(cfg, { log }));
        break;
      case 'serpapi':
        sources.push(createSerpApiSource(cfg, { apiKey: env.SERPAPI_KEY }));
        break;
      case 'dataforseo':
        sources.push(createDataForSeoSource(cfg, {
          login: env.DATAFORSEO_LOGIN, password: env.DATAFORSEO_PASSWORD, log
        }));
        break;
      default:
        throw new Error(`Unknown source type "${cfg.type}" for ${cfg.id}`);
    }
  }
  return sources;
}

async function main() {
  const { values: args } = parseArgs({
    options: {
      config: { type: 'string', default: 'config.json' },
      catalog: { type: 'string' },
      storefront: { type: 'boolean', default: false },
      limit: { type: 'string' },
      sku: { type: 'string' },
      out: { type: 'string', default: 'reports' }
    }
  });

  const config = JSON.parse(await readFile(args.config, 'utf8'));
  const env = process.env;
  const storefrontDomain = env.STOREFRONT_DOMAIN || config.ownDomains?.[0];
  const limit = args.limit ? Number(args.limit) : undefined;

  const sources = buildSources(config, env);
  if (!sources.length) {
    log('No competitor sources are enabled in the config yet, so there is nothing to compare. Add some and run again.');
    return;
  }

  let catalog;
  if (args.catalog) {
    catalog = await loadCatalogFromFile(args.catalog, { storefrontDomain });
  } else if (args.storefront || !env.SHOPIFY_ADMIN_TOKEN) {
    log(`reading our catalog from https://${storefrontDomain} (no cost data; floor uses maxDropPct only)`);
    catalog = await loadCatalogFromStorefront(storefrontDomain, { limit });
  } else {
    catalog = await loadCatalogFromShopify({
      shop: env.SHOPIFY_STORE, token: env.SHOPIFY_ADMIN_TOKEN, storefrontDomain, limit
    });
  }
  if (args.sku) catalog = catalog.filter(p => p.sku === args.sku);
  if (limit) catalog = catalog.slice(0, limit);
  log(`catalog: ${catalog.length} items`);

  const results = await runPriceMatch({
    catalog, sources, pricing: config.pricing, ownDomains: config.ownDomains || [], log
  });

  const { csvPath, jsonPath } = await writeReport(results, args.out);
  const counts = summarize(results);
  log(`done: ${JSON.stringify(counts)}`);
  console.log(csvPath);
  console.log(jsonPath);
}

main().catch(err => {
  log(err.message);
  process.exit(1);
});
