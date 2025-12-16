# Placeholder for app icons

Place your app icons here:

- `icon.png` - 512x512 PNG (master icon)
- `icon.ico` - Windows icon (generated)
- `icon.icns` - Mac icon (generated)

## Generate Icons:

```bash
# Install icon generator
npm install -g electron-icon-maker

# Generate from PNG
electron-icon-maker --input=icon.png --output=./
```

## Or use online tool:

https://www.electronjs.org/docs/latest/tutorial/application-distribution#creating-an-icon

For now, the app will use default Electron icon.
