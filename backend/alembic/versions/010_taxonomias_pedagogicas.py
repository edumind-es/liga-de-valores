"""Taxonomías pedagógicas para Wiki de Juegos

Revision ID: 010_taxonomias_pedagogicas
Revises: 009_wiki_fichas_juegos
Create Date: 2026-01-11

Añade:
- Tabla taxonomias_pedagogicas: catálogo de taxonomías (Famose, Sánchez Bañuelos, Mosston, etc.)
- Tabla game_submission_taxonomias: relación many-to-many entre fichas y taxonomías
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = '010_taxonomias_pedagogicas'
down_revision = '009_wiki_fichas_juegos'
branch_labels = None
depends_on = None


def upgrade():
    # ═══════════════════════════════════════════════════════════════════════════
    # 1. TABLA DE TAXONOMÍAS PEDAGÓGICAS
    # ═══════════════════════════════════════════════════════════════════════════
    op.create_table(
        'taxonomias_pedagogicas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('categoria', sa.String(50), nullable=False),
        sa.Column('codigo', sa.String(50), nullable=False),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('orden', sa.Integer(), default=0),
        sa.Column('cluster', sa.String(50), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('categoria', 'codigo', name='uq_taxonomia_categoria_codigo')
    )
    op.create_index('ix_taxonomias_pedagogicas_categoria', 'taxonomias_pedagogicas', ['categoria'])
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 2. TABLA DE RELACIÓN FICHAS <-> TAXONOMÍAS
    # ═══════════════════════════════════════════════════════════════════════════
    op.create_table(
        'game_submission_taxonomias',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('game_submission_id', sa.Integer(), nullable=False),
        sa.Column('taxonomia_id', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['game_submission_id'], ['game_submissions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['taxonomia_id'], ['taxonomias_pedagogicas.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('game_submission_id', 'taxonomia_id', name='uq_game_taxonomia')
    )
    op.create_index('ix_game_submission_taxonomias_game_id', 'game_submission_taxonomias', ['game_submission_id'])
    op.create_index('ix_game_submission_taxonomias_taxonomia_id', 'game_submission_taxonomias', ['taxonomia_id'])
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 3. POBLAR DATOS INICIALES
    # ═══════════════════════════════════════════════════════════════════════════
    
    # Tipo de Tarea (Famose)
    op.execute("""
        INSERT INTO taxonomias_pedagogicas (categoria, codigo, nombre, descripcion, orden) VALUES
        ('famose', 'definida', 'Tarea Definida', 'Objetivo claro, medio estable, pocos estímulos', 1),
        ('famose', 'semidefinida', 'Tarea Semidefinida', 'Objetivo claro, medio variable, decisiones limitadas', 2),
        ('famose', 'no_definida', 'Tarea No Definida', 'Objetivo amplio, medio cambiante, múltiples decisiones', 3)
    """)
    
    # Estrategia en la Práctica (Sánchez Bañuelos)
    op.execute("""
        INSERT INTO taxonomias_pedagogicas (categoria, codigo, nombre, descripcion, orden) VALUES
        ('sanchez_banuelos', 'global_pura', 'Global Pura', 'Tarea completa sin modificar', 1),
        ('sanchez_banuelos', 'global_polarizando', 'Global Polarizando', 'Énfasis en un aspecto concreto', 2),
        ('sanchez_banuelos', 'global_modificando', 'Global Modificando', 'Simplificación de condiciones', 3),
        ('sanchez_banuelos', 'analitica_pura', 'Analítica Pura', 'Práctica de elementos aislados', 4),
        ('sanchez_banuelos', 'analitica_secuencial', 'Analítica Secuencial', 'Encadenamiento progresivo', 5),
        ('sanchez_banuelos', 'analitica_progresiva', 'Analítica Progresiva', 'Añadir elementos gradualmente', 6),
        ('sanchez_banuelos', 'mixta', 'Mixta', 'Combinación global-analítica-global', 7)
    """)
    
    # Estilo de Enseñanza (Mosston & Ashworth)
    op.execute("""
        INSERT INTO taxonomias_pedagogicas (categoria, codigo, nombre, descripcion, orden, cluster) VALUES
        ('mosston', 'mando_directo', 'Mando Directo', 'El profesor toma todas las decisiones', 1, 'reproduccion'),
        ('mosston', 'asignacion_tareas', 'Asignación de Tareas', 'El alumno decide cuándo, dónde y ritmo', 2, 'reproduccion'),
        ('mosston', 'ensenanza_reciproca', 'Enseñanza Recíproca', 'Los alumnos se evalúan entre sí', 3, 'reproduccion'),
        ('mosston', 'autoevaluacion', 'Autoevaluación', 'El alumno evalúa su propio trabajo', 4, 'reproduccion'),
        ('mosston', 'inclusion', 'Inclusión', 'Diferentes niveles de dificultad', 5, 'reproduccion'),
        ('mosston', 'descubrimiento_guiado', 'Descubrimiento Guiado', 'El profesor guía hacia la respuesta', 6, 'produccion'),
        ('mosston', 'resolucion_problemas', 'Resolución de Problemas', 'Múltiples soluciones válidas', 7, 'produccion'),
        ('mosston', 'programa_individualizado', 'Programa Individualizado', 'El alumno diseña su programa', 8, 'produccion'),
        ('mosston', 'alumnos_iniciados', 'Alumnos Iniciados', 'El alumno inicia la actividad', 9, 'produccion'),
        ('mosston', 'autoensenanza', 'Autoenseñanza', 'Autonomía total del alumno', 10, 'produccion')
    """)
    
    # Nivel de Iniciación Deportiva
    op.execute("""
        INSERT INTO taxonomias_pedagogicas (categoria, codigo, nombre, descripcion, orden) VALUES
        ('nivel_iniciacion', 'sensibilizacion', 'Sensibilización/Exploración', 'Primer contacto, juegos libres (4-6 años)', 1),
        ('nivel_iniciacion', 'predeportivo', 'Predeportivo', 'Habilidades básicas, juegos modificados (6-8 años)', 2),
        ('nivel_iniciacion', 'iniciacion', 'Iniciación Deportiva', 'Técnicas básicas, reglas simplificadas (8-10 años)', 3),
        ('nivel_iniciacion', 'desarrollo', 'Desarrollo', 'Consolidación técnico-táctica (10-12 años)', 4),
        ('nivel_iniciacion', 'perfeccionamiento', 'Perfeccionamiento', 'Especialización y competición (12+ años)', 5)
    """)


def downgrade():
    op.drop_table('game_submission_taxonomias')
    op.drop_table('taxonomias_pedagogicas')
