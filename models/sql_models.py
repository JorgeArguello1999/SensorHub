from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class SensorReading(Base):
    __tablename__ = 'sensor_readings'

    timestamp = Column(DateTime, primary_key=True, default=datetime.now)
    # Using specific columns for known sensors, as per current usage
    sala_temp = Column(Float, nullable=True)
    sala_hum = Column(Float, nullable=True)
    cuarto_temp = Column(Float, nullable=True)
    cuarto_hum = Column(Float, nullable=True)
    local_temp = Column(Float, nullable=True)
    local_hum = Column(Float, nullable=True)

    def to_dict(self):
        return {
            "timestamp": self.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "sala_temp": self.sala_temp,
            "sala_hum": self.sala_hum,
            "cuarto_temp": self.cuarto_temp,
            "cuarto_hum": self.cuarto_hum,
            "local_temp": self.local_temp,
            "local_hum": self.local_hum
        }
