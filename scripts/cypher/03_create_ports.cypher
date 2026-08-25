// AtmoGraph — Mock Global Port Nodes

UNWIND [
  {node_id: "PORT-001", name: "Port of Shanghai", city: "Shanghai", country: "China", throughput_teu: 49158000, geo_importance_score: 0.98},
  {node_id: "PORT-002", name: "Port of Singapore", city: "Singapore", country: "Singapore", throughput_teu: 37200000, geo_importance_score: 0.97},
  {node_id: "PORT-003", name: "Port of Rotterdam", city: "Rotterdam", country: "Netherlands", throughput_teu: 13500000, geo_importance_score: 0.91},
  {node_id: "PORT-004", name: "Port of Los Angeles", city: "Los Angeles", country: "United States", throughput_teu: 9200000, geo_importance_score: 0.89},
  {node_id: "PORT-005", name: "Port of Hamburg", city: "Hamburg", country: "Germany", throughput_teu: 7500000, geo_importance_score: 0.85},
  {node_id: "PORT-006", name: "Port of Ningbo-Zhoushan", city: "Ningbo", country: "China", throughput_teu: 35000000, geo_importance_score: 0.95},
  {node_id: "PORT-007", name: "Port of Shenzhen", city: "Shenzhen", country: "China", throughput_teu: 29800000, geo_importance_score: 0.94},
  {node_id: "PORT-008", name: "Port of Guangzhou", city: "Guangzhou", country: "China", throughput_teu: 25000000, geo_importance_score: 0.92},
  {node_id: "PORT-009", name: "Port of Busan", city: "Busan", country: "South Korea", throughput_teu: 22700000, geo_importance_score: 0.91},
  {node_id: "PORT-010", name: "Port of Hong Kong", city: "Hong Kong", country: "China", throughput_teu: 16600000, geo_importance_score: 0.88},
  {node_id: "PORT-011", name: "Port of Qingdao", city: "Qingdao", country: "China", throughput_teu: 30000000, geo_importance_score: 0.90},
  {node_id: "PORT-012", name: "Port of Tianjin", city: "Tianjin", country: "China", throughput_teu: 22000000, geo_importance_score: 0.87},
  {node_id: "PORT-013", name: "Port Klang", city: "Klang", country: "Malaysia", throughput_teu: 14000000, geo_importance_score: 0.84},
  {node_id: "PORT-014", name: "Port of Tanjung Pelepas", city: "Johor", country: "Malaysia", throughput_teu: 11000000, geo_importance_score: 0.82},
  {node_id: "PORT-015", name: "Port of Dubai", city: "Dubai", country: "United Arab Emirates", throughput_teu: 14000000, geo_importance_score: 0.86},
  {node_id: "PORT-016", name: "Port of Jeddah", city: "Jeddah", country: "Saudi Arabia", throughput_teu: 5000000, geo_importance_score: 0.76},
  {node_id: "PORT-017", name: "Port of Mumbai", city: "Mumbai", country: "India", throughput_teu: 5500000, geo_importance_score: 0.79},
  {node_id: "PORT-018", name: "Mundra Port", city: "Mundra", country: "India", throughput_teu: 7500000, geo_importance_score: 0.81},
  {node_id: "PORT-019", name: "Port of Colombo", city: "Colombo", country: "Sri Lanka", throughput_teu: 6900000, geo_importance_score: 0.78},
  {node_id: "PORT-020", name: "Port of Antwerp-Bruges", city: "Antwerp", country: "Belgium", throughput_teu: 12700000, geo_importance_score: 0.89},
  {node_id: "PORT-021", name: "Port of Bremerhaven", city: "Bremerhaven", country: "Germany", throughput_teu: 4700000, geo_importance_score: 0.74},
  {node_id: "PORT-022", name: "Port of Felixstowe", city: "Felixstowe", country: "United Kingdom", throughput_teu: 3600000, geo_importance_score: 0.72},
  {node_id: "PORT-023", name: "Port of Le Havre", city: "Le Havre", country: "France", throughput_teu: 3200000, geo_importance_score: 0.70},
  {node_id: "PORT-024", name: "Port of New York and New Jersey", city: "Newark", country: "United States", throughput_teu: 9000000, geo_importance_score: 0.87},
  {node_id: "PORT-025", name: "Port of Long Beach", city: "Long Beach", country: "United States", throughput_teu: 8200000, geo_importance_score: 0.85},
  {node_id: "PORT-026", name: "Port of Savannah", city: "Savannah", country: "United States", throughput_teu: 5300000, geo_importance_score: 0.78},
  {node_id: "PORT-027", name: "Port of Vancouver", city: "Vancouver", country: "Canada", throughput_teu: 3400000, geo_importance_score: 0.73},
  {node_id: "PORT-028", name: "Port of Santos", city: "Santos", country: "Brazil", throughput_teu: 4500000, geo_importance_score: 0.75},
  {node_id: "PORT-029", name: "Port of Durban", city: "Durban", country: "South Africa", throughput_teu: 2700000, geo_importance_score: 0.69},
  {node_id: "PORT-030", name: "Port of Melbourne", city: "Melbourne", country: "Australia", throughput_teu: 3400000, geo_importance_score: 0.71}
] AS port

MERGE (p:Port {node_id: port.node_id})
SET p.name = port.name,
    p.city = port.city,
    p.country = port.country,
    p.throughput_teu = port.throughput_teu,
    p.geo_importance_score = port.geo_importance_score;