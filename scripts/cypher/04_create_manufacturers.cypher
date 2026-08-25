// AtmoGraph — Mock Manufacturer Nodes

UNWIND [
  {node_id: "MAN-001", name: "Apple", country: "United States", production_capacity: 950000, industry: "Consumer Electronics"},
  {node_id: "MAN-002", name: "Samsung Electronics", country: "South Korea", production_capacity: 1200000, industry: "Consumer Electronics"},
  {node_id: "MAN-003", name: "Toyota Motor Corporation", country: "Japan", production_capacity: 1050000, industry: "Automotive"},
  {node_id: "MAN-004", name: "Volkswagen Group", country: "Germany", production_capacity: 980000, industry: "Automotive"},
  {node_id: "MAN-005", name: "Tesla", country: "United States", production_capacity: 700000, industry: "Electric Vehicles"},
  {node_id: "MAN-006", name: "Tata Motors", country: "India", production_capacity: 520000, industry: "Automotive"},
  {node_id: "MAN-007", name: "BMW Group", country: "Germany", production_capacity: 610000, industry: "Automotive"},
  {node_id: "MAN-008", name: "Hyundai Motor Company", country: "South Korea", production_capacity: 780000, industry: "Automotive"},
  {node_id: "MAN-009", name: "Honda Motor Company", country: "Japan", production_capacity: 720000, industry: "Automotive"},
  {node_id: "MAN-010", name: "Ford Motor Company", country: "United States", production_capacity: 680000, industry: "Automotive"},

  {node_id: "MAN-011", name: "Siemens", country: "Germany", production_capacity: 430000, industry: "Industrial Equipment"},
  {node_id: "MAN-012", name: "General Electric", country: "United States", production_capacity: 390000, industry: "Industrial Equipment"},
  {node_id: "MAN-013", name: "ABB", country: "Switzerland", production_capacity: 350000, industry: "Industrial Automation"},
  {node_id: "MAN-014", name: "Schneider Electric", country: "France", production_capacity: 370000, industry: "Electrical Equipment"},
  {node_id: "MAN-015", name: "Caterpillar", country: "United States", production_capacity: 320000, industry: "Heavy Machinery"},
  {node_id: "MAN-016", name: "Komatsu", country: "Japan", production_capacity: 280000, industry: "Heavy Machinery"},
  {node_id: "MAN-017", name: "Boeing", country: "United States", production_capacity: 120000, industry: "Aerospace"},
  {node_id: "MAN-018", name: "Airbus", country: "France", production_capacity: 115000, industry: "Aerospace"},
  {node_id: "MAN-019", name: "Honeywell", country: "United States", production_capacity: 290000, industry: "Aerospace"},
  {node_id: "MAN-020", name: "Raytheon Technologies", country: "United States", production_capacity: 240000, industry: "Aerospace"},

  {node_id: "MAN-021", name: "Intel", country: "United States", production_capacity: 450000, industry: "Semiconductors"},
  {node_id: "MAN-022", name: "TSMC", country: "Taiwan", production_capacity: 880000, industry: "Semiconductors"},
  {node_id: "MAN-023", name: "NVIDIA", country: "United States", production_capacity: 420000, industry: "Semiconductors"},
  {node_id: "MAN-024", name: "Qualcomm", country: "United States", production_capacity: 380000, industry: "Semiconductors"},
  {node_id: "MAN-025", name: "Sony", country: "Japan", production_capacity: 460000, industry: "Consumer Electronics"},
  {node_id: "MAN-026", name: "LG Electronics", country: "South Korea", production_capacity: 510000, industry: "Consumer Electronics"},
  {node_id: "MAN-027", name: "Panasonic", country: "Japan", production_capacity: 490000, industry: "Electronics"},
  {node_id: "MAN-028", name: "Dell Technologies", country: "United States", production_capacity: 410000, industry: "Computing"},
  {node_id: "MAN-029", name: "HP", country: "United States", production_capacity: 400000, industry: "Computing"},
  {node_id: "MAN-030", name: "Lenovo", country: "China", production_capacity: 530000, industry: "Computing"},

  {node_id: "MAN-031", name: "Pfizer", country: "United States", production_capacity: 260000, industry: "Pharmaceuticals"},
  {node_id: "MAN-032", name: "Roche", country: "Switzerland", production_capacity: 230000, industry: "Pharmaceuticals"},
  {node_id: "MAN-033", name: "Novartis", country: "Switzerland", production_capacity: 250000, industry: "Pharmaceuticals"},
  {node_id: "MAN-034", name: "Johnson and Johnson", country: "United States", production_capacity: 270000, industry: "Healthcare"},
  {node_id: "MAN-035", name: "Unilever", country: "United Kingdom", production_capacity: 600000, industry: "Consumer Goods"},
  {node_id: "MAN-036", name: "Procter and Gamble", country: "United States", production_capacity: 590000, industry: "Consumer Goods"},
  {node_id: "MAN-037", name: "Nestle", country: "Switzerland", production_capacity: 650000, industry: "Food and Beverage"},
  {node_id: "MAN-038", name: "PepsiCo", country: "United States", production_capacity: 540000, industry: "Food and Beverage"},
  {node_id: "MAN-039", name: "Coca-Cola", country: "United States", production_capacity: 560000, industry: "Food and Beverage"},
  {node_id: "MAN-040", name: "Adidas", country: "Germany", production_capacity: 330000, industry: "Apparel"}
] AS manufacturer

MERGE (m:Manufacturer {node_id: manufacturer.node_id})
SET m.name = manufacturer.name,
    m.country = manufacturer.country,
    m.production_capacity = manufacturer.production_capacity,
    m.industry = manufacturer.industry;