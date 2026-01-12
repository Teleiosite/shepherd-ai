"""add groups tables

Revision ID: add_groups_tables
Revises: 
Create Date: 2026-01-11

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
import uuid


# revision identifiers, used by Alembic.
revision = 'add_groups_tables'
down_revision = None  # Update this to your latest migration
branch_labels = None
depends_on = None


def upgrade():
    # Create groups table
    op.create_table(
        'groups',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('organization_id', UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('whatsapp_group_id', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('member_count', sa.Integer, default=0),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('auto_welcome_enabled', sa.Boolean, default=False),
        sa.Column('welcome_message_template', sa.Text, nullable=True),
        sa.Column('auto_add_as_contact', sa.Boolean, default=True),
        sa.Column('default_contact_category', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint('organization_id', 'whatsapp_group_id', name='uq_org_whatsapp_group')
    )
    
    op.create_index('idx_groups_org', 'groups', ['organization_id'])
    op.create_index('idx_groups_whatsapp_id', 'groups', ['whatsapp_group_id'])
    
    # Create group_members table
    op.create_table(
        'group_members',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('group_id', UUID(as_uuid=True), sa.ForeignKey('groups.id', ondelete='CASCADE'), nullable=False),
        sa.Column('contact_id', UUID(as_uuid=True), sa.ForeignKey('contacts.id', ondelete='SET NULL'), nullable=True),
        sa.Column('whatsapp_id', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('is_admin', sa.Boolean, default=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('left_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('group_id', 'whatsapp_id', name='uq_group_member')
    )
    
    op.create_index('idx_group_members_group', 'group_members', ['group_id'])
    op.create_index('idx_group_members_contact', 'group_members', ['contact_id'])
    
    # Create group_messages table
    op.create_table(
        'group_messages',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('organization_id', UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('group_id', UUID(as_uuid=True), sa.ForeignKey('groups.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('status', sa.String(50), default='pending'),
        sa.Column('scheduled_for', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )
    
    op.create_index('idx_group_messages_group', 'group_messages', ['group_id'])
    op.create_index('idx_group_messages_status', 'group_messages', ['status', 'scheduled_for'])


def downgrade():
    op.drop_table('group_messages')
    op.drop_table('group_members')
    op.drop_table('groups')
