# Icons

Place your application icons here for Tauri bundling.

## Required Sizes

| File | Size | Purpose |
|------|------|---------|
| `32x32.png` | 32×32 px | Small icon (taskbar, alt-tab) |
| `128x128.png` | 128×128 px | Standard icon |
| `128x128@2x.png` | 256×256 px | Retina/HiDPI icon |
| `icon.icns` | — | macOS app icon |
| `icon.ico` | — | Windows app icon |

## Generating Icons

Use `tauri icon` or `cargo tauri icon` to generate all required formats from a single source image (recommended 1024×1024 PNG).

```bash
# Install Tauri CLI if not already available
cargo install tauri-cli

# Generate all icon sizes from a source image
cargo tauri icon path/to/source-icon.png
```

## Notes

- The source image should be at least 1024×1024 pixels
- Use PNG format with transparency support
- Keep the design simple and recognizable at small sizes
