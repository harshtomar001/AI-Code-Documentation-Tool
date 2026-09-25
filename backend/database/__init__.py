from .database import Base
from .database import engine
from .database import SessionLocal
from .database import get_db

from .models import User


def create_tables():
    Base.metadata.create_all(bind=engine)