import uuid
from sqlalchemy import Column, Integer, String, DateTime, func, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

DEFAULT_STORAGE_QUOTA_BYTES = 5 * 1024 ** 3  # 5GB free tier default


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    storage_used = Column(BigInteger, nullable=False, default=0, server_default="0")
    storage_quota_bytes = Column(
        BigInteger,
        nullable=False,
        default=DEFAULT_STORAGE_QUOTA_BYTES,
        server_default=str(DEFAULT_STORAGE_QUOTA_BYTES),
    )
    token_version = Column(Integer, nullable=False, default=1, server_default="1")

    
    files = relationship("File", back_populates="owner")