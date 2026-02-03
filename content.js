/**
 * Content Script - Runs on Facebook pages
 * Adds extraction buttons to posts and handles selection
 */

(function() {
  'use strict';

  // Extraction button class
  const BUTTON_CLASS = 'watch-scraper-btn';
  const EXTRACTED_CLASS = 'watch-scraper-extracted';

  /**
   * Create extraction button element
   */
  function createExtractButton() {
    const btn = document.createElement('button');
    btn.className = BUTTON_CLASS;
    btn.innerHTML = '⌚ Extract';
    btn.title = 'Extract watch listing data';
    return btn;
  }

  /**
   * Get post text content
   */
  function getPostText(postElement) {
    // Try multiple selectors for Facebook's various post structures
    const selectors = [
      '[data-ad-preview="message"]',
      '[data-ad-comet-preview="message"]',
      '[dir="auto"]',
      '.userContent',
      '[data-testid="post_message"]'
    ];

    let text = '';

    for (const selector of selectors) {
      const elements = postElement.querySelectorAll(selector);
      for (const el of elements) {
        const elText = el.innerText || el.textContent;
        if (elText && elText.length > 20) {
          text += elText + ' ';
        }
      }
    }

    // Fallback to entire post text
    if (text.length < 30) {
      text = postElement.innerText || postElement.textContent;
    }

    return text.trim();
  }

  /**
   * Get post URL/permalink
   */
  function getPostUrl(postElement) {
    // Look for timestamp links which are usually permalinks
    const linkSelectors = [
      'a[href*="/posts/"]',
      'a[href*="/permalink/"]',
      'a[href*="story_fbid"]',
      '[data-testid="story-subtitle"] a'
    ];

    for (const selector of linkSelectors) {
      const link = postElement.querySelector(selector);
      if (link && link.href) {
        return link.href;
      }
    }

    return window.location.href;
  }

  /**
   * Get group name from page
   */
  function getGroupName() {
    // Try to get group name from page
    const selectors = [
      'h1',
      '[role="main"] h1',
      'a[href*="/groups/"] span'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent) {
        const text = el.textContent.trim();
        if (text.length > 2 && text.length < 100) {
          return text;
        }
      }
    }

    return null;
  }

  /**
   * Show extraction result notification
   */
  function showNotification(message, isSuccess = true) {
    const notification = document.createElement('div');
    notification.className = 'watch-scraper-notification';
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 16px 24px;
      background: ${isSuccess ? '#10b981' : '#ef4444'};
      color: white;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Handle extraction button click
   */
  async function handleExtract(event) {
    event.preventDefault();
    event.stopPropagation();

    const btn = event.target;
    const postElement = btn.closest('[role="article"], [data-pagelet*="FeedUnit"], .userContentWrapper, [data-testid="Keycommand_wrapper"]')
                        || btn.parentElement.parentElement;

    const text = getPostText(postElement);

    if (!text || text.length < 20) {
      showNotification('Could not find listing text', false);
      return;
    }

    // Parse the text
    const parsed = WatchParser.parse(text);

    // Add metadata
    parsed.sourceUrl = getPostUrl(postElement);
    parsed.groupName = getGroupName();
    parsed.scrapedAt = new Date().toISOString();

    // Save to storage
    try {
      const result = await chrome.storage.local.get(['watchListings']);
      const listings = result.watchListings || [];

      // Check for duplicates (same text and same day)
      const isDuplicate = listings.some(l =>
        l.rawText === parsed.rawText &&
        l.scrapedAt.substring(0, 10) === parsed.scrapedAt.substring(0, 10)
      );

      if (isDuplicate) {
        showNotification('Listing already saved', false);
        return;
      }

      // Add unique ID
      parsed.id = Date.now().toString(36) + Math.random().toString(36).substr(2);

      listings.unshift(parsed);
      await chrome.storage.local.set({ watchListings: listings });

      // Mark as extracted
      btn.classList.add(EXTRACTED_CLASS);
      btn.innerHTML = '✓ Saved';

      // Build success message
      let msg = 'Saved';
      if (parsed.brand) msg += `: ${parsed.brand}`;
      if (parsed.model) msg += ` ${parsed.model}`;
      if (parsed.reference) msg += ` (${parsed.reference})`;
      if (parsed.price) msg += ` - ${parsed.price.formatted}`;

      showNotification(msg, true);

    } catch (error) {
      console.error('Watch Scraper: Error saving listing', error);
      showNotification('Error saving listing', false);
    }
  }

  /**
   * Add extraction buttons to posts
   */
  function addButtonsToPosts() {
    // Find Facebook posts
    const postSelectors = [
      '[role="article"]',
      '[data-pagelet*="FeedUnit"]',
      '.userContentWrapper',
      '[data-testid="Keycommand_wrapper"]'
    ];

    for (const selector of postSelectors) {
      const posts = document.querySelectorAll(selector);

      posts.forEach(post => {
        // Skip if already has button
        if (post.querySelector('.' + BUTTON_CLASS)) return;

        // Skip if post is too small (probably not a listing)
        const text = post.innerText || '';
        if (text.length < 50) return;

        // Create and add button
        const btn = createExtractButton();
        btn.addEventListener('click', handleExtract);

        // Find a good place to insert the button
        const insertTarget = post.querySelector('[role="toolbar"]')
                            || post.querySelector('.userContent')
                            || post.firstChild;

        if (insertTarget) {
          // Create wrapper
          const wrapper = document.createElement('div');
          wrapper.className = 'watch-scraper-btn-wrapper';
          wrapper.appendChild(btn);

          if (insertTarget.parentNode) {
            insertTarget.parentNode.insertBefore(wrapper, insertTarget);
          } else {
            post.insertBefore(wrapper, post.firstChild);
          }
        }
      });
    }
  }

  /**
   * Handle text selection and extraction via context menu
   */
  function setupSelectionHandler() {
    document.addEventListener('mouseup', () => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text && text.length > 30) {
        // Store selection for context menu
        chrome.storage.local.set({ selectedText: text });
      }
    });
  }

  /**
   * Listen for messages from popup/background
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'extractSelection') {
      const selection = window.getSelection().toString().trim();
      if (selection && selection.length > 20) {
        const parsed = WatchParser.parse(selection);
        parsed.sourceUrl = window.location.href;
        parsed.groupName = getGroupName();
        sendResponse({ success: true, data: parsed });
      } else {
        sendResponse({ success: false, error: 'No text selected' });
      }
    } else if (message.action === 'getPageInfo') {
      sendResponse({
        url: window.location.href,
        groupName: getGroupName()
      });
    }
    return true;
  });

  /**
   * Initialize
   */
  function init() {
    // Add buttons to existing posts
    addButtonsToPosts();

    // Watch for new posts (infinite scroll)
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldUpdate = true;
          break;
        }
      }
      if (shouldUpdate) {
        setTimeout(addButtonsToPosts, 500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Setup selection handler
    setupSelectionHandler();

    console.log('Watch Price Scraper: Initialized');
  }

  // Wait for page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
