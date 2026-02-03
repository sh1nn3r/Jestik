# Extension Icons

This folder should contain PNG icons in the following sizes:
- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

## Generate icons from SVG

You can convert the included `icon.svg` to PNG using:

### Using ImageMagick:
```bash
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```

### Using Inkscape:
```bash
inkscape icon.svg -w 16 -h 16 -o icon16.png
inkscape icon.svg -w 48 -h 48 -o icon48.png
inkscape icon.svg -w 128 -h 128 -o icon128.png
```

### Online tools:
- https://svgtopng.com/
- https://cloudconvert.com/svg-to-png

## Temporary workaround

For testing, you can use any 128x128 PNG image, or the extension will work without icons (just won't show a custom icon).
