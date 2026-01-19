"""Add AI configuration columns to organizations

Revision ID: add_ai_config
Revises: add_groups_tables
Create Date: 2026-01-19 16:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_ai_config'
down_revision = 'add_groups_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Add AI configuration columns to organizations table
    op.add_column('organizations', sa.Column('ai_provider', sa.String(50), nullable=True, server_default='gemini'))
    op.add_column('organizations', sa.Column('ai_api_key', sa.String(), nullable=True))
    op.add_column('organizations', sa.Column('ai_model', sa.String(100), nullable=True, server_default='gemini-2.0-flash'))
    op.add_column('organizations', sa.Column('ai_base_url', sa.String(), nullable=True))


def downgrade():
    # Remove AI configuration columns
    op.drop_column('organizations', 'ai_base_url')
    op.drop_column('organizations', 'ai_model')
    op.drop_column('organizations', 'ai_api_key')
    op.drop_column('organizations', 'ai_provider')
