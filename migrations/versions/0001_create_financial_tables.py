```python
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001_create_financial_tables'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('financial_profiles',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, nullable=False),
        sa.Column('profile_data', sa.JSON, nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    
    op.create_table('scenario_simulations',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('profile_id', sa.Integer, sa.ForeignKey('financial_profiles.id'), nullable=False),
        sa.Column('simulation_results', sa.JSON, nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    
    op.create_table('federated_learning_updates',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('model_version', sa.String, nullable=False),
        sa.Column('update_data', sa.JSON, nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    
    op.create_table('financial_milestones',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('profile_id', sa.Integer, sa.ForeignKey('financial_profiles.id'), nullable=False),
        sa.Column('milestone_data', sa.JSON, nullable=False),
        sa.Column('achieved_at', sa.DateTime),
    )

def downgrade():
    op.drop_table('financial_milestones')
    op.drop_table('federated_learning_updates')
    op.drop_table('scenario_simulations')
    op.drop_table('financial_profiles')
```