[
  {
    "old_string": "",
    "new_string": "-- SYNOPSIS: Database migration — create target_customers table.\n-- @ssot docs/products/site-builder/PRODUCT_HOME.md\n\nCREATE TABLE IF NOT EXISTS target_customers (\n    customer_id SERIAL PRIMARY KEY,\n    name VARCHAR(255) NOT NULL,\n    email VARCHAR(255) UNIQUE NOT NULL,\n    phone VARCHAR(20),\n    target_identifier VARCHAR(100),\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n"
  }
]
