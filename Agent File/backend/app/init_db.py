"""Database initialization script - creates tables if they don't exist."""
from sqlalchemy import text
from app.database import engine
import logging

logger = logging.getLogger(__name__)

def init_groups_tables():
    """Create Groups tables if they don't exist."""
    
    # SQL to create groups table
    create_groups_sql = """
    CREATE TABLE IF NOT EXISTS groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        whatsapp_group_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        avatar_url VARCHAR(500),
        member_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        auto_welcome_enabled BOOLEAN DEFAULT false,
        welcome_message_template TEXT,
        auto_add_as_contact BOOLEAN DEFAULT true,
        default_contact_category VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_org_whatsapp_group UNIQUE (organization_id, whatsapp_group_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_groups_org ON groups(organization_id);
    CREATE INDEX IF NOT EXISTS idx_groups_whatsapp_id ON groups(whatsapp_group_id);
    """
    
    # SQL to create group_members table
    create_members_sql = """
    CREATE TABLE IF NOT EXISTS group_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
        whatsapp_id VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        is_admin BOOLEAN DEFAULT false,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        left_at TIMESTAMP WITH TIME ZONE,
        CONSTRAINT uq_group_member UNIQUE (group_id, whatsapp_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
    CREATE INDEX IF NOT EXISTS idx_group_members_contact ON group_members(contact_id);
    """
    
    # SQL to create group_messages table
    create_messages_sql = """
    CREATE TABLE IF NOT EXISTS group_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        scheduled_for TIMESTAMP WITH TIME ZONE,
        sent_at TIMESTAMP WITH TIME ZONE,
        error_message TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id);
    CREATE INDEX IF NOT EXISTS idx_group_messages_status ON group_messages(status, scheduled_for);
    """
    
    try:
        with engine.connect() as conn:
            # Create groups table
            conn.execute(text(create_groups_sql))
            logger.info("✅ Groups table ready")
            
            # Create group_members table
            conn.execute(text(create_members_sql))
            logger.info("✅ Group members table ready")
            
            # Create group_messages table
            conn.execute(text(create_messages_sql))
            logger.info("✅ Group messages table ready")
            
            conn.commit()
            logger.info("🎉 All Groups tables initialized successfully!")
            
    except Exception as e:
        logger.error(f"❌ Error initializing Groups tables: {e}")
        # Don't crash the app if tables already exist or there's a minor error
        pass


def init_bookings_table():
    """Create Bookings table if it doesn't exist."""
    create_bookings_sql = """
    CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        contact_name VARCHAR(255) NOT NULL,
        contact_phone VARCHAR(50) NOT NULL,
        purpose VARCHAR(255) NOT NULL,
        date VARCHAR(50),
        time VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        confirmed_at TIMESTAMP WITH TIME ZONE
    );
    
    CREATE INDEX IF NOT EXISTS idx_bookings_contact ON bookings(contact_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    """
    try:
        with engine.connect() as conn:
            conn.execute(text(create_bookings_sql))
            conn.commit()
            logger.info("✅ Bookings table ready")
    except Exception as e:
        logger.error(f"❌ Error initializing Bookings table: {e}")
        pass


def init_chat_tables():
    """Ensure chat status columns on contacts, organization AI fields, and conversation_sessions exist."""
    chat_sql = """
    -- Add AI agent settings to organizations if not present
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS wppconnect_bridge_url VARCHAR(500) DEFAULT 'http://localhost:3001';
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(50) DEFAULT 'gemini';
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_api_key TEXT;
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100) DEFAULT 'gemini-2.0-flash';
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_base_url TEXT;
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_auto_reply_enabled VARCHAR(10) DEFAULT 'false';
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_reply_mode VARCHAR(50) DEFAULT 'suggest';
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_reply_delay_seconds VARCHAR(10) DEFAULT '5';
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_tone TEXT DEFAULT 'Warm, professional, and helpful.';
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_payment_link TEXT;
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_business_type VARCHAR(100) DEFAULT 'Organization';

    -- Add chat handover & triage columns to contacts if not present
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS conversation_status VARCHAR(50) DEFAULT 'open';
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ai_paused_until TIMESTAMP WITH TIME ZONE;

    -- Create conversation_sessions table for multi-turn booking/qualification flows
    CREATE TABLE IF NOT EXISTS conversation_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        active_flow VARCHAR(50) NOT NULL,
        collected_slots TEXT DEFAULT '{}',
        turn_count INTEGER DEFAULT 0,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_contact ON conversation_sessions(contact_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON conversation_sessions(expires_at);
    """
    try:
        with engine.connect() as conn:
            conn.execute(text(chat_sql))
            conn.commit()
            logger.info("✅ Chat and session tables/columns ready")
    except Exception as e:
        logger.error(f"❌ Error initializing Chat/Session schema: {e}")
        pass


def init_media_table():
    """Create Media Library table if it doesn't exist."""
    media_sql = """
    CREATE TABLE IF NOT EXISTS media_library (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_key VARCHAR(500),
        url TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER DEFAULT 0,
        upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_media_org ON media_library(organization_id);
    """
    try:
        with engine.connect() as conn:
            conn.execute(text(media_sql))
            conn.commit()
            logger.info("✅ Media Library table ready")
    except Exception as e:
        logger.error(f"❌ Error initializing Media Library table: {e}")
        pass


if __name__ == "__main__":
    init_groups_tables()
    init_bookings_table()
    init_chat_tables()
    init_media_table()

