/**
 * Watch Price Scraper - Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const listingCount = document.getElementById('listingCount');
  const searchInput = document.getElementById('searchInput');
  const filterBrand = document.getElementById('filterBrand');
  const listingsContainer = document.getElementById('listingsContainer');
  const manualText = document.getElementById('manualText');
  const parseBtn = document.getElementById('parseBtn');
  const parseResult = document.getElementById('parseResult');
  const saveBtn = document.getElementById('saveBtn');
  const exportCSV = document.getElementById('exportCSV');
  const exportJSON = document.getElementById('exportJSON');
  const clearData = document.getElementById('clearData');

  // State
  let listings = [];
  let currentParsed = null;

  /**
   * Initialize
   */
  async function init() {
    await loadListings();
    setupEventListeners();
    renderListings();
    updateBrandFilter();
  }

  /**
   * Load listings from storage
   */
  async function loadListings() {
    const result = await chrome.storage.local.get(['watchListings']);
    listings = result.watchListings || [];
    listingCount.textContent = listings.length;
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Tab switching
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}Tab`).classList.add('active');
      });
    });

    // Search and filter
    searchInput.addEventListener('input', renderListings);
    filterBrand.addEventListener('change', renderListings);

    // Manual entry
    parseBtn.addEventListener('click', handleParse);
    saveBtn.addEventListener('click', handleSave);

    // Export
    exportCSV.addEventListener('click', handleExportCSV);
    exportJSON.addEventListener('click', handleExportJSON);
    clearData.addEventListener('click', handleClearData);

    // Listen for storage changes
    chrome.storage.onChanged.addListener(async (changes) => {
      if (changes.watchListings) {
        listings = changes.watchListings.newValue || [];
        listingCount.textContent = listings.length;
        renderListings();
        updateBrandFilter();
      }
    });
  }

  /**
   * Render listings
   */
  function renderListings() {
    const search = searchInput.value.toLowerCase();
    const brandFilter = filterBrand.value;

    const filtered = listings.filter(listing => {
      // Brand filter
      if (brandFilter && listing.brand !== brandFilter) return false;

      // Search filter
      if (search) {
        const searchText = [
          listing.brand,
          listing.model,
          listing.reference,
          listing.dialColor,
          listing.rawText
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchText.includes(search)) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      listingsContainer.innerHTML = `
        <div class="empty-state">
          <p>${listings.length === 0 ? 'No listings yet' : 'No matching listings'}</p>
          <p class="hint">${listings.length === 0 ? 'Go to a Facebook watch group and click "Extract" on listings' : 'Try adjusting your search or filter'}</p>
        </div>
      `;
      return;
    }

    listingsContainer.innerHTML = filtered.map(listing => createListingCard(listing)).join('');

    // Add delete handlers
    listingsContainer.querySelectorAll('.delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.listing-card').dataset.id;
        handleDelete(id);
      });
    });

    // Add copy handlers
    listingsContainer.querySelectorAll('.copy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.listing-card').dataset.id;
        const listing = listings.find(l => l.id === id);
        if (listing) {
          copyToClipboard(formatListingText(listing));
          showToast('Copied to clipboard');
        }
      });
    });
  }

  /**
   * Create listing card HTML
   */
  function createListingCard(listing) {
    const tags = [];
    if (listing.reference) tags.push(`<span class="listing-tag ref">${listing.reference}</span>`);
    if (listing.year) tags.push(`<span class="listing-tag year">${listing.year}</span>`);
    if (listing.dialColor) tags.push(`<span class="listing-tag dial">${listing.dialColor}</span>`);
    if (listing.material) tags.push(`<span class="listing-tag">${listing.material}</span>`);
    if (listing.box) tags.push(`<span class="listing-tag">Box</span>`);
    if (listing.papers) tags.push(`<span class="listing-tag">Papers</span>`);
    if (listing.condition) tags.push(`<span class="listing-tag">${listing.condition}</span>`);

    const date = listing.scrapedAt ? new Date(listing.scrapedAt).toLocaleDateString() : 'Unknown date';

    return `
      <div class="listing-card" data-id="${listing.id}">
        <div class="listing-header">
          <div>
            <div class="listing-brand">${listing.brand || 'Unknown Brand'}</div>
            <div class="listing-model">${listing.model || 'Unknown Model'}</div>
          </div>
          <div class="listing-price">${listing.price?.formatted || 'Price N/A'}</div>
        </div>
        ${tags.length > 0 ? `<div class="listing-details">${tags.join('')}</div>` : ''}
        <div class="listing-footer">
          <span class="listing-date">${date}</span>
          <div class="listing-actions">
            <button class="copy" title="Copy">📋</button>
            <button class="delete" title="Delete">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Update brand filter options
   */
  function updateBrandFilter() {
    const brands = [...new Set(listings.map(l => l.brand).filter(Boolean))].sort();
    filterBrand.innerHTML = '<option value="">All Brands</option>' +
      brands.map(b => `<option value="${b}">${b}</option>`).join('');
  }

  /**
   * Handle parse button click
   */
  function handleParse() {
    const text = manualText.value.trim();
    if (!text) {
      showToast('Please enter listing text', 'error');
      return;
    }

    currentParsed = WatchParser.parse(text);

    // Populate fields
    document.getElementById('parsedBrand').value = currentParsed.brand || '';
    document.getElementById('parsedModel').value = currentParsed.model || '';
    document.getElementById('parsedReference').value = currentParsed.reference || '';
    document.getElementById('parsedYear').value = currentParsed.year || '';
    document.getElementById('parsedDialColor').value = currentParsed.dialColor || '';
    document.getElementById('parsedMaterial').value = currentParsed.material || '';
    document.getElementById('parsedPrice').value = currentParsed.price?.formatted || '';
    document.getElementById('parsedCondition').value = currentParsed.condition || '';
    document.getElementById('parsedBox').checked = currentParsed.box || false;
    document.getElementById('parsedPapers').checked = currentParsed.papers || false;

    parseResult.classList.remove('hidden');
  }

  /**
   * Handle save button click
   */
  async function handleSave() {
    if (!currentParsed) return;

    // Update with edited values
    currentParsed.brand = document.getElementById('parsedBrand').value || null;
    currentParsed.model = document.getElementById('parsedModel').value || null;
    currentParsed.reference = document.getElementById('parsedReference').value || null;
    currentParsed.year = parseInt(document.getElementById('parsedYear').value) || null;
    currentParsed.dialColor = document.getElementById('parsedDialColor').value || null;
    currentParsed.material = document.getElementById('parsedMaterial').value || null;
    currentParsed.condition = document.getElementById('parsedCondition').value || null;
    currentParsed.box = document.getElementById('parsedBox').checked;
    currentParsed.papers = document.getElementById('parsedPapers').checked;

    // Parse price if changed
    const priceInput = document.getElementById('parsedPrice').value;
    if (priceInput) {
      const priceNum = parseFloat(priceInput.replace(/[^0-9.]/g, ''));
      if (!isNaN(priceNum)) {
        currentParsed.price = {
          amount: priceNum,
          currency: 'USD',
          formatted: `$${priceNum.toLocaleString()}`
        };
      }
    }

    // Add ID and timestamp
    currentParsed.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    currentParsed.scrapedAt = new Date().toISOString();

    // Save
    listings.unshift(currentParsed);
    await chrome.storage.local.set({ watchListings: listings });

    // Reset form
    manualText.value = '';
    parseResult.classList.add('hidden');
    currentParsed = null;

    // Switch to listings tab
    tabs[0].click();

    showToast('Listing saved!', 'success');
  }

  /**
   * Handle delete
   */
  async function handleDelete(id) {
    listings = listings.filter(l => l.id !== id);
    await chrome.storage.local.set({ watchListings: listings });
    showToast('Listing deleted');
  }

  /**
   * Handle CSV export
   */
  function handleExportCSV() {
    if (listings.length === 0) {
      showToast('No listings to export', 'error');
      return;
    }

    const headers = ['Date', 'Brand', 'Model', 'Reference', 'Year', 'Dial Color', 'Material', 'Price', 'Currency', 'Condition', 'Box', 'Papers', 'Source URL'];

    const rows = listings.map(l => [
      l.scrapedAt ? new Date(l.scrapedAt).toLocaleDateString() : '',
      l.brand || '',
      l.model || '',
      l.reference || '',
      l.year || '',
      l.dialColor || '',
      l.material || '',
      l.price?.amount || '',
      l.price?.currency || 'USD',
      l.condition || '',
      l.box ? 'Yes' : 'No',
      l.papers ? 'Yes' : 'No',
      l.sourceUrl || ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    downloadFile(csv, 'watch_listings.csv', 'text/csv');
    showToast('CSV exported!', 'success');
  }

  /**
   * Handle JSON export
   */
  function handleExportJSON() {
    if (listings.length === 0) {
      showToast('No listings to export', 'error');
      return;
    }

    const json = JSON.stringify(listings, null, 2);
    downloadFile(json, 'watch_listings.json', 'application/json');
    showToast('JSON exported!', 'success');
  }

  /**
   * Handle clear data
   */
  async function handleClearData() {
    if (!confirm('Are you sure you want to delete all listings? This cannot be undone.')) {
      return;
    }

    listings = [];
    await chrome.storage.local.set({ watchListings: [] });
    showToast('All data cleared');
  }

  /**
   * Download file
   */
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Copy to clipboard
   */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  /**
   * Format listing as text
   */
  function formatListingText(listing) {
    const parts = [];
    if (listing.brand) parts.push(listing.brand);
    if (listing.model) parts.push(listing.model);
    if (listing.reference) parts.push(`(${listing.reference})`);
    if (listing.year) parts.push(`- ${listing.year}`);
    if (listing.dialColor) parts.push(`- ${listing.dialColor} dial`);
    if (listing.price?.formatted) parts.push(`- ${listing.price.formatted}`);
    return parts.join(' ');
  }

  /**
   * Show toast notification
   */
  function showToast(message, type = 'default') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  // Initialize
  init();
});
