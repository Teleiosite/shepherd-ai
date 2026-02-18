# Shepherd AI - Oracle Cloud Bridge Deployment Status

## ❌ CRITICAL ISSUE: VM INSTABILITY & TIMEOUTS

Despite fixing the internal configuration, the **Oracle VM is unresponsive**.

### Diagnosis
1.  **SSH Timeouts:** The VM allows SSH for a few seconds after reboot, then stops responding.
2.  **Resource Exhaustion:** The `shepherd-bridge` application (Node.js) likely consumes more than the available **1GB RAM** on this free-tier VM, causing it to freeze or crash repeatedly.
3.  **Firewall Unverifiable:** Because the VM freezes, we cannot confirm if the firewall rules are successfully persisting.

### � RECOMMENDATION: DEPLOY TO RENDER

The Oracle Free Tier VM (1GB RAM) is **too weak** to run this bridge reliably. Even if we fix the firewall, it will likely crash again under load.

**I strongly recommend deploying to Render instead.**
You already have the code ready in `shepherd-cloud-bridge`.

#### How to Deploy to Render (Free & Reliable):
1.  Go to [dashboard.render.com](https://dashboard.render.com)
2.  Click **New +** -> **Web Service**
3.  Connect your GitHub repository
4.  Select the `shepherd-cloud-bridge` folder (Root Directory)
5.  Add Environment Variables:
    -   `BACKEND_URL`: `https://shepherd-ai-backend.onrender.com`
    -   `CONNECTION_CODE`: `1DCFEA1A`
    -   `NODE_ENV`: `production`
6.  Click **Deploy**.

This takes 2 minutes and will be **much more stable** than the Oracle VM.

---

### If you still want to try Oracle (Not Recommended):
You must:
1.  **Stop** the instance (don't reboot).
2.  **Resize** it to a larger shape (e.g. `VM.Standard.E2.1.Micro` is too small; try `VM.Standard.A1.Flex` with 4GB RAM if available in free tier).
3.  **Start** it again.

