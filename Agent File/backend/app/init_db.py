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


if __name__ == "__main__":
    init_groups_tables()
