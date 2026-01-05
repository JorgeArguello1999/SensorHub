from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class Sensor(Base):
    __tablename__ = 'sensors'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # 'esp32' or 'openweather'
    token = Column(String, unique=True, nullable=True) # For ESP32 auth
    lat = Column(Float, nullable=True) # For OpenWeather
    lon = Column(Float, nullable=True) # For OpenWeather
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

    readings = relationship("SensorReading", back_populates="sensor", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "token": self.token,
            "lat": self.lat,
            "lon": self.lon,
            "active": self.active,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }

class SensorReading(Base):
    __tablename__ = 'sensor_readings'

    id = Column(Integer, primary_key=True, autoincrement=True)
    sensor_id = Column(Integer, ForeignKey('sensors.id'), nullable=False)
    timestamp = Column(DateTime, default=datetime.now)
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)

    sensor = relationship("Sensor", back_populates="readings")

    def to_dict(self):
        return {
            "timestamp": self.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "temperature": self.temperature,
            "humidity": self.humidity,
            "sensor_id": self.sensor_id,
            "sensor_name": self.sensor.name if self.sensor else "Unknown"
        }

class SystemConfig(Base):
    __tablename__ = 'system_config'

    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)
    updated_at = Column(DateTime, default=datetime.now)

    def to_dict(self):
        return {
            "key": self.key,
            "value": self.value,
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M:%S")
        }
