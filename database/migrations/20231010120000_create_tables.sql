CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  organization_id INT REFERENCES organizations(id)
);

CREATE TABLE shipments (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id),
  status VARCHAR(50),
  details TEXT
);

CREATE TABLE iot_devices (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  status VARCHAR(50)
);

CREATE TABLE compliance_records (
  id SERIAL PRIMARY KEY,
  shipment_id INT REFERENCES shipments(id),
  compliant BOOLEAN
);