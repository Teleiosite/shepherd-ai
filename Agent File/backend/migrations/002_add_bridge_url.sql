-- ============================================
-- Add WPPConnect Bridge URL to Organizations
-- Run this in Supabase SQL Editor
-- ============================================

-- Add bridge_url column to organizations table
-- This allows each organization to configure their own WPPConnect bridge
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS wppconnect_bridge_url VARCHAR(255) DEFAULT 'http://localhost:3001';

CREATE INDEX IF NOT EXISTS idx_organizations_bridge_url ON organizations(wppconnect_bridge_url);

COMMENT ON COLUMN organizations.wppconnect_bridge_url IS 'WPPConnect bridge server URL for this organization';

-- Verification
SELECT 'organizations.wppconnect_bridge_url added' as status 
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'wppconnect_bridge_url'
);
