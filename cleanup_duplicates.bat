@echo off
echo ========================================
echo Cleaning Up Duplicate Files
echo ========================================
echo.
echo This will DELETE the following duplicates from root:
echo - App.tsx, index.tsx, index.html
echo - package.json, package-lock.json
echo - vite.config.ts, vite-env.d.ts, tsconfig.json
echo - types.ts, build-timestamp.ts
echo - design-system.css
echo - favicon.png, logo.png, shepherd-sheep.png, illustration.png
echo - node_modules folder
echo - utils folder
echo.
echo Your actual app in "Agent File" folder will NOT be touched.
echo.
pause

echo Deleting duplicate code files...
del /Q "App.tsx" 2>nul
del /Q "index.tsx" 2>nul
del /Q "index.html" 2>nul
del /Q "package.json" 2>nul
del /Q "package-lock.json" 2>nul
del /Q "vite.config.ts" 2>nul
del /Q "vite-env.d.ts" 2>nul
del /Q "tsconfig.json" 2>nul
del /Q "types.ts" 2>nul
del /Q "build-timestamp.ts" 2>nul
del /Q "design-system.css" 2>nul

echo Deleting duplicate images...
del /Q "favicon.png" 2>nul
del /Q "logo.png" 2>nul
del /Q "shepherd-sheep.png" 2>nul
del /Q "illustration.png" 2>nul

echo Deleting duplicate folders...
rmdir /S /Q "node_modules" 2>nul
rmdir /S /Q "utils" 2>nul

echo.
echo ========================================
echo Cleanup Complete!
echo ========================================
echo.
echo All duplicates removed. Your app in "Agent File" is intact.
pause
