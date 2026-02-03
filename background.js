/**
 * Background Service Worker
 * Handles context menu and cross-script communication
 */

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'extractWatch',
    title: 'Extract Watch Listing',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'extractPage',
    title: 'Extract from Current Post',
    contexts: ['page']
  });

  console.log('Watch Price Scraper: Extension installed');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'extractWatch' && info.selectionText) {
    // Send selected text to content script for parsing
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractSelection'
      });

      if (response && response.success) {
        // Save to storage
        const result = await chrome.storage.local.get(['watchListings']);
        const listings = result.watchListings || [];

        const parsed = response.data;
        parsed.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        parsed.scrapedAt = new Date().toISOString();

        listings.unshift(parsed);
        await chrome.storage.local.set({ watchListings: listings });

        // Show notification
        await showBadge('✓', '#10b981');
      }
    } catch (error) {
      console.error('Watch Scraper: Error extracting selection', error);
      await showBadge('!', '#ef4444');
    }
  }
});

// Show temporary badge
async function showBadge(text, color) {
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color });

  setTimeout(async () => {
    const result = await chrome.storage.local.get(['watchListings']);
    const count = (result.watchListings || []).length;
    await chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
    await chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
  }, 2000);
}

// Update badge count when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.watchListings) {
    const count = (changes.watchListings.newValue || []).length;
    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
  }
});

// Initialize badge on startup
chrome.runtime.onStartup.addListener(async () => {
  const result = await chrome.storage.local.get(['watchListings']);
  const count = (result.watchListings || []).length;
  if (count > 0) {
    await chrome.action.setBadgeText({ text: count.toString() });
    await chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
  }
});
