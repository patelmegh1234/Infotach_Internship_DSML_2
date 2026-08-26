// AtmoGraph — Mock Product Nodes

UNWIND [
  {node_id: "PROD-001", name: "Smartphone", category: "Consumer Electronics", lead_time_days: 28},
  {node_id: "PROD-002", name: "Laptop Computer", category: "Computing", lead_time_days: 35},
  {node_id: "PROD-003", name: "Tablet Device", category: "Consumer Electronics", lead_time_days: 30},
  {node_id: "PROD-004", name: "Semiconductor Chip", category: "Semiconductors", lead_time_days: 60},
  {node_id: "PROD-005", name: "Lithium-Ion Battery", category: "Energy Storage", lead_time_days: 45},
  {node_id: "PROD-006", name: "Electric Vehicle", category: "Automotive", lead_time_days: 50},
  {node_id: "PROD-007", name: "Passenger Car", category: "Automotive", lead_time_days: 42},
  {node_id: "PROD-008", name: "Truck Engine", category: "Automotive Parts", lead_time_days: 38},
  {node_id: "PROD-009", name: "Industrial Robot", category: "Industrial Automation", lead_time_days: 55},
  {node_id: "PROD-010", name: "Wind Turbine", category: "Renewable Energy", lead_time_days: 75},

  {node_id: "PROD-011", name: "Solar Panel", category: "Renewable Energy", lead_time_days: 40},
  {node_id: "PROD-012", name: "Medical Vaccine", category: "Pharmaceuticals", lead_time_days: 65},
  {node_id: "PROD-013", name: "Diagnostic Equipment", category: "Healthcare", lead_time_days: 50},
  {node_id: "PROD-014", name: "Commercial Aircraft Component", category: "Aerospace", lead_time_days: 90},
  {node_id: "PROD-015", name: "Construction Excavator", category: "Heavy Machinery", lead_time_days: 70},
  {node_id: "PROD-016", name: "Steel Coil", category: "Raw Materials", lead_time_days: 22},
  {node_id: "PROD-017", name: "Aluminium Sheet", category: "Raw Materials", lead_time_days: 24},
  {node_id: "PROD-018", name: "Plastic Polymer", category: "Chemicals", lead_time_days: 20},
  {node_id: "PROD-019", name: "Fertilizer", category: "Agriculture", lead_time_days: 25},
  {node_id: "PROD-020", name: "Cotton Textile", category: "Apparel", lead_time_days: 32},

  {node_id: "PROD-021", name: "Sports Footwear", category: "Apparel", lead_time_days: 36},
  {node_id: "PROD-022", name: "Packaged Food", category: "Food and Beverage", lead_time_days: 18},
  {node_id: "PROD-023", name: "Beverage Concentrate", category: "Food and Beverage", lead_time_days: 16},
  {node_id: "PROD-024", name: "Home Cleaning Product", category: "Consumer Goods", lead_time_days: 21},
  {node_id: "PROD-025", name: "Industrial Sensor", category: "Electrical Equipment", lead_time_days: 34}
] AS product

MERGE (p:Product {node_id: product.node_id})
SET p.name = product.name,
    p.category = product.category,
    p.lead_time_days = product.lead_time_days;