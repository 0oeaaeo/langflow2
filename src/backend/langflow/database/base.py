from langflow.settings import settings
from sqlmodel import SQLModel, Session, create_engine
from langflow.utils.logger import logger

if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    connect_args = {}
engine = create_engine(settings.database_url, connect_args=connect_args)


def create_db_and_tables():
    logger.debug("Creating database and tables")
    SQLModel.metadata.create_all(engine)
    logger.debug("Database and tables created")


def get_session():
    with Session(engine) as session:
        yield session
