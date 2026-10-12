/**
 * Loads our own catalog, either from the Shopify Admin API or from a JSON
 * file (useful for testing and for running against an exported snapshot).
 *
 * Read-only: this module never writes to Shopify.
 */
import { readFile } from 'node:fs/promises';
import { detectBrand, detectCondition, parseOwnReference } from './match.js';

const API_VERSION = '2025-07';

const QUERY = `
query Catalog($cursor: String, $query: String) {
  products(first: 100, after: $cursor, query: $query) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id title handle vendor tags status
      variants(first: 20) {
        nodes {
          id sku price inventoryQuantity
          inventoryItem { unitCost { amount } }
        }
      }
    }
  }
}`;

export function toCatalogItems(product, storefrontDomain) {
  const tags = (product.tags || []).map(t => String(t).toLowerCase());
  const tagText = tags.join(' ');
  const condition = detectCondition(`${product.title} ${tagText}`);
  const brand = detectBrand(product.title) || detectBrand(product.vendor);
  const variants = product.variants?.nodes || product.variants || [];

  return variants.map(v => {
    const { reference, dialCode } = parseOwnReference(v.sku, product.title);
    const cost = v.inventoryItem?.unitCost?.amount ?? v.cost;
    return {
      productId: product.id,
      variantId: v.id,
      title: product.title,
      handle: product.handle,
      url: storefrontDomain && product.handle ? `https://${storefrontDomain}/products/${product.handle}` : null,
      sku: v.sku,
      brand,
      reference,
      dialCode,
      condition,
      price: Number(v.price),
      cost: cost != null && cost !== '' ? Number(cost) : null,
      inventory: v.inventoryQuantity ?? null
    };
  });
}

export async function loadCatalogFromShopify({ shop, token, query = 'status:active', storefrontDomain, limit }) {
  if (!shop || !token) {
    throw new Error('Set SHOPIFY_STORE (e.g. mystore.myshopify.com) and SHOPIFY_ADMIN_TOKEN, or pass --catalog <file.json>.');
  }
  const items = [];
  let cursor = null;
  do {
    const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query: QUERY, variables: { cursor, query } })
    });
    if (!res.ok) throw new Error(`Shopify API ${res.status}: ${await res.text()}`);
    const body = await res.json();
    if (body.errors) throw new Error(`Shopify API: ${JSON.stringify(body.errors)}`);
    const page = body.data.products;
    for (const p of page.nodes) items.push(...toCatalogItems(p, storefrontDomain));
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor && (!limit || items.length < limit));
  return limit ? items.slice(0, limit) : items;
}

/** Accepts an array of Shopify-shaped products (Admin API or products.json). */
export async function loadCatalogFromFile(path, { storefrontDomain } = {}) {
  const raw = JSON.parse(await readFile(path, 'utf8'));
  const products = Array.isArray(raw) ? raw : raw.products;
  return products.flatMap(p => toCatalogItems(p, storefrontDomain));
}
