# Shepherd AI - Oracle Cloud Bridge Deployment Status

## ✅ Service is Running!
I confirmed the service is `active (running)` on the VM.

### ❓ If you cannot access the bridge URL:
If `http://145.241.187.4:3001/api/status` does not load in your browser, the issue is the **Oracle Cloud Firewall (Security List)** or **Ingress Rules**.

**How to Fix:**
1.  Go to [Oracle Cloud Console](https://cloud.oracle.com).
2.  Navigate to **Compute > Instances > click your instance**.
3.  Click on the **Subnet** link (under "Primary VNIC").
4.  Click on the **Security List** (e.g., `Default Security List...`) or **Network Security Group**.
5.  Add an **Ingress Rule**:
    -   **Source CIDR:** `0.0.0.0/0`
    -   **Protocol:** TCP
    -   **Destination Port Range:** `3001`
6.  Save and try the URL again!

If it still doesn't work, ensure port `3001` is open on the VM's internal firewall (which we did earlier via `firewall-cmd`).

## ✅ Completed Steps

1.  **Fixed SSH Key Permissions:**
    -   Adjusted file permissions on `ssh-key-2026-02-15.key` to work on Windows (`icacls`).
    -   Can successfully SSH into the VM.

2.  **Deployed Code:**
    -   Uploaded all bridge files (`index.js`, `package.json`, `.env`, `setup.sh`) to `/home/opc/shepherd-bridge/`.

3.  **Installed Dependencies:**
    -   Ran `npm install` successfully on the VM.
    -   Node.js v20 is installed and available.

4.  **Configured Firewall (Internal & External):**
    -   Internal: Ran `firewall-cmd` to open ports 3001 & 3002.
    -   External: **FIXED**. You successfully added the Ingress Rule on Oracle Cloud Console.
    -   **Result:** The error changed from `ERR_CONNECTION_TIMED_OUT` (blocked) to `ERR_CONNECTION_REFUSED` (open but nothing listening). This confirms the firewall is OPEN.

5.  **Fixed SELinux Permission Denied (203/EXEC):**
    -   **Root Cause:** SELinux was in `Enforcing` mode and blocked systemd from executing the NVM-installed `node` binary.
    -   **Fix:** Ran `sudo chcon -Rv -t bin_t /home/opc/.nvm/versions/node/v20.20.0/bin/node` to set the correct SELinux context.
    -   **Result:** The `203/EXEC` error is gone. Node.js now starts successfully.

## ❌ Current Issue: App Crash (Exit Code 1) + SSH Timeouts

**Symptom:** Service starts but immediately exits with `status=1/FAILURE`.
**SSH Problem:** All SSH attempts are timing out (the crash-looping service may be overloading the VM).

**Root Cause Analysis:**
-   The `203/EXEC` (SELinux) issue is **FIXED** ✅
-   Node.js now starts, but the `index.js` application crashes immediately.
-   Likely cause: missing `.env` file, missing `node_modules`, or a dependency issue.
-   SSH is timing out, preventing us from reading `journalctl` logs.

6.  **Install Application Dependencies:**
    -   Automated upload of `node_modules.tar.gz` succeeded.
    -   **FAILED:** Automated extraction via SSH timed out multiple times.
    -   **Action Required:** You need to SSH manually and extract the file.

## 🛠️ Next Steps (Manual Intervention Required)

Because the automated SSH commands are timing out, please run these commands manually in your PowerShell window:

### Step 1: **Reboot the VM** (This is critical!)
1.  Go to the [Oracle Cloud Console](https://cloud.oracle.com).
2.  Navigate to **Compute > Instances**.
3.  Click on your instance (`shepherd-ai-oracle-bridge` or similar).
4.  Click **Reboot** (or **Reset** if reboot fails).
5.  Wait `1-2 minutes` for it to come back online.

### Step 2: SSH into the VM
Once the VM is rebooted:
```powershell
ssh -i "C:\Users\USER\Downloads\ssh-key-2026-02-15.key" opc@145.241.187.4
```

### Step 3: Extract Dependencies & Start Service
Once logged in, paste these commands:

```bash
cd /home/opc/shepherd-bridge
### Step 5: If modules are missing, reinstall
```bash
export PATH="/home/opc/.nvm/versions/node/v20.20.0/bin:$PATH"
npm install
```

### Step 6: Re-enable the service
```bash
sudo systemctl start shepherd-bridge
sudo systemctl status shepherd-bridge
```

**Paste the output of Step 3 or Step 4 so I can diagnose further!**
