-- ============================================
-- Shepherd AI - Database Schema Updates
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add whatsapp_id to contacts table
-- This stores WhatsApp @lid IDs for proper message routing
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS whatsapp_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp_id ON contacts(whatsapp_id);

COMMENT ON COLUMN contacts.whatsapp_id IS 'WhatsApp internal ID (@lid format) for message replies';

-- 2. Add attachment_name to messages table
-- This stores the original filename of media attachments
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);

COMMENT ON COLUMN messages.attachment_name IS 'Original filename of image/file attachments';

-- 3. Create AI configuration table
-- Stores AI provider settings (Gemini, OpenAI, etc.) per organization
CREATE TABLE IF NOT EXISTS ai_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'gemini',
    api_key TEXT NOT NULL,
    model VARCHAR(100) DEFAULT 'gemini-pro',
    base_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_org_ai_config UNIQUE (organization_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_configs_org ON ai_configs(organization_id);

COMMENT ON TABLE ai_configs IS 'AI provider configuration per organization (Gemini, OpenAI, etc.)';

-- 4. Create campaign templates table
-- Stores reusable message templates for follow-up campaigns
CREATE TABLE IF NOT EXISTS campaign_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    days_offset INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_org_template UNIQUE (organization_id, category, days_offset)
);

CREATE INDEX IF NOT EXISTS idx_campaign_templates_org ON campaign_templates(organization_id, category);

COMMENT ON TABLE campaign_templates IS 'Campaign message templates for automated follow-up schedules';

-- Verification queries
-- Run these to confirm changes were applied
SELECT 'contacts.whatsapp_id added' as status 
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contacts' AND column_name = 'whatsapp_id'
);

SELECT 'messages.attachment_name added' as status 
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'attachment_name'
);

SELECT 'ai_configs table created' as status 
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'ai_configs'
);

SELECT 'campaign_templates table created' as status 
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'campaign_templates'
);
