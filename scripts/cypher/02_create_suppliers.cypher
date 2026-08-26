// AtmoGraph — Mock Supplier Nodes

UNWIND [
  {
    node_id: "SUP-001",
    name: "Tata Steel",
    country: "India",
    capacity_utilization: 0.82,
    risk_score: 0.31,
    historical_delay_avg: 2.4
  },
  {
    node_id: "SUP-002",
    name: "Nippon Steel",
    country: "Japan",
    capacity_utilization: 0.78,
    risk_score: 0.22,
    historical_delay_avg: 1.8
  },
  {
    node_id: "SUP-003",
    name: "POSCO",
    country: "South Korea",
    capacity_utilization: 0.86,
    risk_score: 0.27,
    historical_delay_avg: 2.1
  },
  {
    node_id: "SUP-004",
    name: "BASF",
    country: "Germany",
    capacity_utilization: 0.74,
    risk_score: 0.19,
    historical_delay_avg: 1.5
  },
  {
    node_id: "SUP-005",
    name: "Reliance Industries",
    country: "India",
    capacity_utilization: 0.88,
    risk_score: 0.35,
    historical_delay_avg: 3.0
  },
  {
    node_id: "SUP-006", name: "ArcelorMittal", country: "Luxembourg",
    capacity_utilization: 0.81, risk_score: 0.28, historical_delay_avg: 2.2
  },
  {
    node_id: "SUP-007", name: "Rio Tinto", country: "Australia",
    capacity_utilization: 0.84, risk_score: 0.24, historical_delay_avg: 1.9
  },
  {
    node_id: "SUP-008", name: "BHP", country: "Australia",
    capacity_utilization: 0.79, risk_score: 0.26, historical_delay_avg: 2.0
  },
  {
    node_id: "SUP-009", name: "Cargill", country: "United States",
    capacity_utilization: 0.76, risk_score: 0.29, historical_delay_avg: 2.6
  },
  {
    node_id: "SUP-010", name: "ADM", country: "United States",
    capacity_utilization: 0.73, risk_score: 0.25, historical_delay_avg: 2.1
  },
  {
    node_id: "SUP-011", name: "LyondellBasell", country: "Netherlands",
    capacity_utilization: 0.77, risk_score: 0.23, historical_delay_avg: 1.7
  },
  {
    node_id: "SUP-012", name: "Dow", country: "United States",
    capacity_utilization: 0.80, risk_score: 0.30, historical_delay_avg: 2.5
  },
  {
    node_id: "SUP-013", name: "SABIC", country: "Saudi Arabia",
    capacity_utilization: 0.85, risk_score: 0.33, historical_delay_avg: 2.8
  },
  {
    node_id: "SUP-014", name: "Mitsubishi Chemical", country: "Japan",
    capacity_utilization: 0.72, risk_score: 0.20, historical_delay_avg: 1.6
  },
  {
    node_id: "SUP-015", name: "LG Chem", country: "South Korea",
    capacity_utilization: 0.83, risk_score: 0.27, historical_delay_avg: 2.3
  },
  {
    node_id: "SUP-016", name: "Umicore", country: "Belgium",
    capacity_utilization: 0.75, risk_score: 0.21, historical_delay_avg: 1.8
  },
  {
    node_id: "SUP-017", name: "Glencore", country: "Switzerland",
    capacity_utilization: 0.78, risk_score: 0.36, historical_delay_avg: 3.1
  },
  {
    node_id: "SUP-018", name: "Vale", country: "Brazil",
    capacity_utilization: 0.82, risk_score: 0.34, historical_delay_avg: 2.9
  },
  {
    node_id: "SUP-019", name: "Freeport-McMoRan", country: "United States",
    capacity_utilization: 0.74, risk_score: 0.32, historical_delay_avg: 2.7
  },
  {
    node_id: "SUP-020", name: "Alcoa", country: "United States",
    capacity_utilization: 0.70, risk_score: 0.24, historical_delay_avg: 2.0
  },
  {
    node_id: "SUP-021", name: "Hindalco Industries", country: "India",
    capacity_utilization: 0.86, risk_score: 0.30, historical_delay_avg: 2.6
  },
  {
    node_id: "SUP-022", name: "Sumitomo Metal Mining", country: "Japan",
    capacity_utilization: 0.77, risk_score: 0.22, historical_delay_avg: 1.9
  },
  {
    node_id: "SUP-023", name: "Olam Agri", country: "Singapore",
    capacity_utilization: 0.79, risk_score: 0.28, historical_delay_avg: 2.4
  },
  {
    node_id: "SUP-024", name: "Wilmar International", country: "Singapore",
    capacity_utilization: 0.81, risk_score: 0.25, historical_delay_avg: 2.1
  },
  {
    node_id: "SUP-025", name: "Nutrien", country: "Canada",
    capacity_utilization: 0.76, risk_score: 0.20, historical_delay_avg: 1.7
  },
  {
    node_id: "SUP-026", name: "Yara International", country: "Norway",
    capacity_utilization: 0.80, risk_score: 0.23, historical_delay_avg: 1.8
  },
  {
    node_id: "SUP-027", name: "Toyota Tsusho", country: "Japan",
    capacity_utilization: 0.73, risk_score: 0.21, historical_delay_avg: 1.6
  },
  {
    node_id: "SUP-028", name: "Foxconn Components", country: "Taiwan",
    capacity_utilization: 0.87, risk_score: 0.29, historical_delay_avg: 2.5
  },
  {
    node_id: "SUP-029", name: "Murata Manufacturing", country: "Japan",
    capacity_utilization: 0.84, risk_score: 0.18, historical_delay_avg: 1.4
  },
  {
    node_id: "SUP-030", name: "TDK", country: "Japan",
    capacity_utilization: 0.79, risk_score: 0.20, historical_delay_avg: 1.7
  },
  {
    node_id: "SUP-031", name: "Infineon Technologies", country: "Germany",
    capacity_utilization: 0.88, risk_score: 0.37, historical_delay_avg: 3.2
  },
  {
    node_id: "SUP-032", name: "NXP Semiconductors", country: "Netherlands",
    capacity_utilization: 0.85, risk_score: 0.34, historical_delay_avg: 2.9
  },
  {
    node_id: "SUP-033", name: "SK Hynix", country: "South Korea",
    capacity_utilization: 0.90, risk_score: 0.39, historical_delay_avg: 3.4
  },
  {
    node_id: "SUP-034", name: "Micron Technology", country: "United States",
    capacity_utilization: 0.83, risk_score: 0.31, historical_delay_avg: 2.7
  },
  {
    node_id: "SUP-035", name: "Corning", country: "United States",
    capacity_utilization: 0.71, risk_score: 0.22, historical_delay_avg: 1.9
  },
  {
    node_id: "SUP-036", name: "Saint-Gobain", country: "France",
    capacity_utilization: 0.75, risk_score: 0.21, historical_delay_avg: 1.8
  },
  {
    node_id: "SUP-037", name: "DuPont", country: "United States",
    capacity_utilization: 0.78, risk_score: 0.26, historical_delay_avg: 2.2
  },
  {
    node_id: "SUP-038", name: "3M", country: "United States",
    capacity_utilization: 0.74, risk_score: 0.24, historical_delay_avg: 2.0
  },
  {
    node_id: "SUP-039", name: "Denso", country: "Japan",
    capacity_utilization: 0.86, risk_score: 0.27, historical_delay_avg: 2.3
  },
  {
    node_id: "SUP-040", name: "Bosch", country: "Germany",
    capacity_utilization: 0.82, risk_score: 0.23, historical_delay_avg: 1.9
  },
  {
    node_id: "SUP-041", name: "Continental", country: "Germany",
    capacity_utilization: 0.77, risk_score: 0.25, historical_delay_avg: 2.1
  },
  {
    node_id: "SUP-042", name: "Magna International", country: "Canada",
    capacity_utilization: 0.76, risk_score: 0.22, historical_delay_avg: 1.8
  },
  {
    node_id: "SUP-043", name: "ZF Friedrichshafen", country: "Germany",
    capacity_utilization: 0.80, risk_score: 0.26, historical_delay_avg: 2.2
  },
  {
    node_id: "SUP-044", name: "Flex", country: "Singapore",
    capacity_utilization: 0.81, risk_score: 0.28, historical_delay_avg: 2.4
  },
  {
    node_id: "SUP-045", name: "Jabil", country: "United States",
    capacity_utilization: 0.79, risk_score: 0.27, historical_delay_avg: 2.3
  },
  {
    node_id: "SUP-046", name: "Maersk Logistics", country: "Denmark",
    capacity_utilization: 0.84, risk_score: 0.33, historical_delay_avg: 3.0
  },
  {
    node_id: "SUP-047", name: "DHL Supply Chain", country: "Germany",
    capacity_utilization: 0.82, risk_score: 0.24, historical_delay_avg: 2.0
  },
  {
    node_id: "SUP-048", name: "Kuehne and Nagel", country: "Switzerland",
    capacity_utilization: 0.78, risk_score: 0.23, historical_delay_avg: 1.9
  },
  {
    node_id: "SUP-049", name: "DB Schenker", country: "Germany",
    capacity_utilization: 0.75, risk_score: 0.25, historical_delay_avg: 2.1
  },
  {
    node_id: "SUP-050", name: "CEVA Logistics", country: "France",
    capacity_utilization: 0.73, risk_score: 0.27, historical_delay_avg: 2.3
  }
] AS supplier

MERGE (s:Supplier {node_id: supplier.node_id})
SET s.name = supplier.name,
    s.country = supplier.country,
    s.capacity_utilization = supplier.capacity_utilization,
    s.risk_score = supplier.risk_score,
    s.historical_delay_avg = supplier.historical_delay_avg;