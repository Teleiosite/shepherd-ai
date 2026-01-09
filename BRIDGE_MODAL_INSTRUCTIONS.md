# How to Add Bridge Options Modal to Settings

## Step 1: Import the Modal

At the top of `src/components/Settings.tsx`, add this import (around line 3):

```typescript
import BridgeOptionsModal from './BridgeOptionsModal';
```

## Step 2: Add State

After line 30 (where `restoreStatus` is declared), add:

```typescript
const [showBridgeModal, setShowBridgeModal] = useState(false);
```

## Step 3: Add "Compare Options" Button

In the WhatsApp Bridge Connection section (around line 372), add this button after the connection code:

```typescript
<button
  className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
  onClick={() => setShowBridgeModal(true)}
>
  <HelpCircle size={18} />
  Compare Bridge Options
</button>
```

## Step 4: Add Modal Component

At the very end of the Settings component (before the closing `</div>` and `</div>`), add:

```typescript
{/* Bridge Options Modal */}
<BridgeOptionsModal 
  isOpen={showBridgeModal}
  onClose={() => setShowBridgeModal(false)}
  connectionCode={connectionCode}
/>
```

## That's it!

Users will now see a "Compare Options" button that shows a beautiful modal comparing Desktop vs Cloud bridge!

---

## Quick Alternative (If Above is Complex):

Just add this simple link after the download button:

```typescript
<a 
  href="https://github.com/Teleiosite/shepherd-ai/tree/main/shepherd-cloud-bridge"
  target="_blank"
  className="block mt-3 text-center text-sm text-blue-600 hover:text-blue-700 underline"
>
  ☁️ Or deploy Cloud Bridge (24/7, mobile-friendly)
</a>
```

This gives users a direct link to the cloud bridge guide!
