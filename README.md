# Watch Price Scraper - Chrome Extension

A Chrome extension for watch traders to extract and track watch listing prices from Facebook groups.

## Features

- **One-click extraction** - Click the "Extract" button on Facebook posts to capture listing details
- **Smart parsing** - Automatically identifies brand, model, reference number, year, dial color, price
- **Multi-brand support** - Recognizes 15+ luxury watch brands including:
  - Rolex, Omega, Patek Philippe, Audemars Piguet
  - Tudor, Cartier, IWC, Panerai, Breitling
  - Grand Seiko, Richard Mille, Vacheron Constantin
  - Jaeger-LeCoultre, A. Lange & Söhne, Hublot
- **Manual entry** - Paste listing text and manually adjust parsed data
- **Data export** - Export to CSV or JSON for spreadsheet analysis
- **Local storage** - All data stored locally on your device

## Installation

### From Source (Developer Mode)

1. Download or clone this repository
2. Generate icon files (see `icons/README.md`)
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Select the extension folder

### Usage

1. Navigate to a Facebook watch group
2. Find a watch listing post
3. Click the **"⌚ Extract"** button that appears on posts
4. View extracted data in the extension popup
5. Export your data as CSV or JSON

## How It Works

### Automatic Parsing

The extension uses pattern matching to extract:

| Field | Detection Method |
|-------|-----------------|
| Brand | Name matching + aliases (e.g., "PP" → Patek Philippe) |
| Model | Model name keywords (e.g., "Sub" → Submariner) |
| Reference | Brand-specific reference patterns |
| Year | 4-digit years (1950-present) |
| Dial Color | Color keywords + "dial" association |
| Price | Currency symbols, "k" notation, price keywords |
| Condition | Condition keywords (mint, excellent, etc.) |
| Box/Papers | Keywords indicating completeness |

### Manual Entry

For listings that don't parse well automatically:
1. Click the "Manual Entry" tab in the popup
2. Paste the listing text
3. Click "Parse Listing"
4. Edit any fields that weren't detected correctly
5. Click "Save Listing"

## File Structure

```
├── manifest.json      # Chrome extension manifest
├── parser.js          # Watch listing text parser
├── content.js         # Facebook page integration
├── content.css        # Styling for extract buttons
├── background.js      # Service worker for context menu
├── popup/
│   ├── popup.html     # Extension popup UI
│   ├── popup.css      # Popup styles
│   └── popup.js       # Popup functionality
└── icons/
    ├── icon.svg       # Source icon
    └── *.png          # Generated icons
```

## Privacy

- All data is stored locally in Chrome's storage
- No data is sent to external servers
- The extension only runs on Facebook pages
- You control what gets extracted and saved

## Limitations

- Requires manual browsing of Facebook groups
- Parsing accuracy depends on listing format
- Some reference numbers may not be recognized
- Prices in non-standard formats may not be detected

## Tips for Best Results

1. **Well-formatted listings** parse better
2. **Include reference numbers** for accurate matching
3. **Standard price formats** ($12,500 or 12.5K) work best
4. **Review parsed data** and correct any errors before saving
5. **Export regularly** to back up your data

## Contributing

Feel free to submit issues or pull requests to improve:
- Brand/model recognition patterns
- Reference number formats
- Price parsing
- UI/UX improvements

## License

MIT License - Use freely for personal or commercial purposes.
