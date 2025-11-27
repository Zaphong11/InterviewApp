"""PDF import and check list

Revision ID: dc200805957f
Revises: 96781a5dad32
Create Date: 2025-11-27 19:51:59.430454

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dc200805957f'
down_revision: Union[str, Sequence[str], None] = '96781a5dad32'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
