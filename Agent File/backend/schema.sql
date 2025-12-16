-- Shepherd AI Database Schema
-- PostgreSQL with pgvector extension

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    ai_name VARCHAR(255) DEFAULT 'Shepherd AI',
    whatsapp_phone_id VARCHAR(255),
    whatsapp_business_account_id VARCHAR(255),
    whatsapp_access_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'worker',
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_org ON users(organization_id);

-- Contacts table
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    join_date TIMESTAMPTZ NOT NULL,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    last_contacted TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_org_phone UNIQUE (organization_id, phone)
);

CREATE INDEX idx_contacts_org_category ON contacts(organization_id, category);
CREATE INDEX idx_contacts_join_date ON contacts(join_date);
CREATE INDEX idx_contacts_status ON contacts(status);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    whatsapp_message_id VARCHAR(255),
    attachment_url TEXT,
    attachment_type VARCHAR(50),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_contact ON messages(contact_id, created_at DESC);
CREATE INDEX idx_messages_scheduled ON messages(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_messages_status ON messages(status);

-- Knowledge resources table
CREATE TABLE knowledge_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    file_name VARCHAR(255),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_org ON knowledge_resources(organization_id);

-- Knowledge embeddings table (for RAG)
CREATE TABLE knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES knowledge_resources(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_embeddings_resource ON knowledge_embeddings(resource_id);
CREATE INDEX idx_embeddings_vector ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_org_category UNIQUE (organization_id, name)
);

CREATE INDEX idx_categories_org ON categories(organization_id);

-- Workflow steps table
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    day INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_org_category_day UNIQUE (organization_id, category, day)
);

CREATE INDEX idx_workflow_org_category ON workflow_steps(organization_id, category);

-- Insert default categories
INSERT INTO categories (organization_id, name, is_default)
SELECT id, 'New Convert', TRUE FROM organizations
UNION ALL
SELECT id, 'First Timer', TRUE FROM organizations
UNION ALL
SELECT id, 'Born Again', TRUE FROM organizations;

-- Comments
COMMENT ON TABLE organizations IS 'Church organizations using the system';
COMMENT ON TABLE users IS 'System users (admins, pastors, workers)';
COMMENT ON TABLE contacts IS 'Church contacts and prospects';
COMMENT ON TABLE messages IS 'Message history and scheduled messages';
COMMENT ON TABLE knowledge_resources IS 'Knowledge base resources (books, sermons)';
COMMENT ON TABLE knowledge_embeddings IS 'Vector embeddings for RAG search';
COMMENT ON TABLE categories IS 'Contact categories';
COMMENT ON TABLE workflow_steps IS 'Automated follow-up workflow definitions';
