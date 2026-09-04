"""
AtmoGraph — Sample Demo Graphs & Templates
============================================
Defines 10 diverse, realistic supply chain datasets:
- 5 built-in 1-click templates for direct UI selection.
- 5 exportable/importable JSON datasets stored in data/sample_graphs/
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

# ==========================================
# 1. Semiconductor & High-Tech Corridor
# ==========================================
SEMICONDUCTOR_TEMPLATE = {
    "id": "semiconductor",
    "name": "Global Semiconductor & Tech Corridor",
    "industry": "High-Tech Electronics",
    "description": "Critical silicon wafers, lithography equipment, foundry fabrication, packaging, and global distribution.",
    "nodes": [
        {"node_id": "SUP-SEMI-01", "node_type": "Supplier", "name": "ASML Lithography Systems", "country": "Netherlands", "city": "Veldhoven", "capacity_utilization": 0.95, "historical_delay_avg": 4.5, "risk_score": 0.15},
        {"node_id": "SUP-SEMI-02", "node_type": "Supplier", "name": "Shin-Etsu Silicon Wafers", "country": "Japan", "city": "Tokyo", "capacity_utilization": 0.90, "historical_delay_avg": 2.0, "risk_score": 0.20},
        {"node_id": "SUP-SEMI-03", "node_type": "Supplier", "name": "Tokyo Electron Chemicals", "country": "Japan", "city": "Tokyo", "capacity_utilization": 0.88, "historical_delay_avg": 2.5, "risk_score": 0.18},
        {"node_id": "SUP-SEMI-04", "node_type": "Supplier", "name": "Applied Materials Fab Tools", "country": "United States", "city": "Santa Clara", "capacity_utilization": 0.82, "historical_delay_avg": 3.0, "risk_score": 0.22},
        {"node_id": "MAN-SEMI-01", "node_type": "Manufacturer", "name": "TSMC Fab 18 (3nm GigaFab)", "country": "Taiwan", "city": "Tainan", "capacity_utilization": 0.98, "historical_delay_avg": 1.2, "risk_score": 0.35},
        {"node_id": "MAN-SEMI-02", "node_type": "Manufacturer", "name": "Samsung Semiconductor Hwaseong", "country": "South Korea", "city": "Hwaseong", "capacity_utilization": 0.92, "historical_delay_avg": 2.1, "risk_score": 0.28},
        {"node_id": "MAN-SEMI-03", "node_type": "Manufacturer", "name": "Intel Ronler Acres Fab", "country": "United States", "city": "Hillsboro", "capacity_utilization": 0.86, "historical_delay_avg": 3.2, "risk_score": 0.20},
        {"node_id": "MAN-SEMI-04", "node_type": "Manufacturer", "name": "Foxconn Precision Assembly", "country": "China", "city": "Zhengzhou", "capacity_utilization": 0.94, "historical_delay_avg": 2.8, "risk_score": 0.30},
        {"node_id": "PORT-SEMI-01", "node_type": "Port", "name": "Port of Kaohsiung", "country": "Taiwan", "city": "Kaohsiung", "capacity_utilization": 0.89, "throughput_teu": 9800000, "risk_score": 0.25},
        {"node_id": "PORT-SEMI-02", "node_type": "Port", "name": "Port of Busan", "country": "South Korea", "city": "Busan", "capacity_utilization": 0.87, "throughput_teu": 22000000, "risk_score": 0.20},
        {"node_id": "PORT-SEMI-03", "node_type": "Port", "name": "Port of Rotterdam", "country": "Netherlands", "city": "Rotterdam", "capacity_utilization": 0.84, "throughput_teu": 15000000, "risk_score": 0.15},
        {"node_id": "PORT-SEMI-04", "node_type": "Port", "name": "Port of Long Beach", "country": "United States", "city": "Long Beach", "capacity_utilization": 0.91, "throughput_teu": 9100000, "risk_score": 0.28},
        {"node_id": "DC-SEMI-01", "node_type": "DistributionCenter", "name": "APAC Logistics Hub Singapore", "country": "Singapore", "city": "Singapore", "capacity_utilization": 0.85, "historical_delay_avg": 1.5, "risk_score": 0.12},
        {"node_id": "DC-SEMI-02", "node_type": "DistributionCenter", "name": "Silicon Valley Regional DC", "country": "United States", "city": "San Jose", "capacity_utilization": 0.80, "historical_delay_avg": 2.0, "risk_score": 0.15},
        {"node_id": "DC-SEMI-03", "node_type": "DistributionCenter", "name": "European Tech Distribution Hub", "country": "Germany", "city": "Frankfurt", "capacity_utilization": 0.82, "historical_delay_avg": 1.8, "risk_score": 0.14},
        {"node_id": "RET-SEMI-01", "node_type": "Retailer", "name": "North America Enterprise Tech Outlets", "country": "United States", "city": "Dallas", "capacity_utilization": 0.78, "historical_delay_avg": 1.0, "risk_score": 0.10},
        {"node_id": "RET-SEMI-02", "node_type": "Retailer", "name": "European Consumer Electronics Retail", "country": "Germany", "city": "Berlin", "capacity_utilization": 0.75, "historical_delay_avg": 1.2, "risk_score": 0.10},
        {"node_id": "RET-SEMI-03", "node_type": "Retailer", "name": "East Asia Direct-to-Consumer Market", "country": "Japan", "city": "Tokyo", "capacity_utilization": 0.82, "historical_delay_avg": 0.8, "risk_score": 0.12},
    ],
    "edges": [
        {"source": "SUP-SEMI-01", "target": "MAN-SEMI-01", "relationship": "SUPPLIES", "transport_mode": "air", "transit_days": 2, "quantity": 12},
        {"source": "SUP-SEMI-01", "target": "MAN-SEMI-02", "relationship": "SUPPLIES", "transport_mode": "air", "transit_days": 2, "quantity": 10},
        {"source": "SUP-SEMI-02", "target": "MAN-SEMI-01", "relationship": "SUPPLIES", "transport_mode": "sea", "transit_days": 4, "quantity": 50000},
        {"source": "SUP-SEMI-02", "target": "MAN-SEMI-02", "relationship": "SUPPLIES", "transport_mode": "sea", "transit_days": 3, "quantity": 40000},
        {"source": "SUP-SEMI-03", "target": "MAN-SEMI-01", "relationship": "SUPPLIES", "transport_mode": "sea", "transit_days": 3, "quantity": 25000},
        {"source": "SUP-SEMI-04", "target": "MAN-SEMI-03", "relationship": "SUPPLIES", "transport_mode": "road", "transit_days": 2, "quantity": 1500},
        {"source": "MAN-SEMI-01", "target": "PORT-SEMI-01", "relationship": "SHIPS_THROUGH", "transport_mode": "road", "transit_days": 1, "quantity": 80000},
        {"source": "MAN-SEMI-02", "target": "PORT-SEMI-02", "relationship": "SHIPS_THROUGH", "transport_mode": "road", "transit_days": 1, "quantity": 60000},
        {"source": "MAN-SEMI-01", "target": "MAN-SEMI-04", "relationship": "SUPPLIES", "transport_mode": "air", "transit_days": 1, "quantity": 95000},
        {"source": "MAN-SEMI-02", "target": "MAN-SEMI-04", "relationship": "SUPPLIES", "transport_mode": "air", "transit_days": 1, "quantity": 70000},
        {"source": "PORT-SEMI-01", "target": "DC-SEMI-01", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 5, "quantity": 120000},
        {"source": "PORT-SEMI-01", "target": "PORT-SEMI-04", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 14, "quantity": 150000},
        {"source": "PORT-SEMI-02", "target": "PORT-SEMI-04", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 12, "quantity": 90000},
        {"source": "PORT-SEMI-01", "target": "PORT-SEMI-03", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 24, "quantity": 85000},
        {"source": "PORT-SEMI-04", "target": "DC-SEMI-02", "relationship": "DELIVERS_TO", "transport_mode": "rail", "transit_days": 3, "quantity": 210000},
        {"source": "PORT-SEMI-03", "target": "DC-SEMI-03", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 2, "quantity": 110000},
        {"source": "MAN-SEMI-04", "target": "PORT-SEMI-04", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 15, "quantity": 300000},
        {"source": "DC-SEMI-02", "target": "RET-SEMI-01", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 2, "quantity": 180000},
        {"source": "DC-SEMI-03", "target": "RET-SEMI-02", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 2, "quantity": 95000},
        {"source": "DC-SEMI-01", "target": "RET-SEMI-03", "relationship": "DELIVERS_TO", "transport_mode": "air", "transit_days": 2, "quantity": 115000},
    ],
}

# ==========================================
# 2. EV Battery & Automotive Network
# ==========================================
EV_AUTOMOTIVE_TEMPLATE = {
    "id": "ev_automotive",
    "name": "Electric Vehicle & Battery Supply Chain",
    "industry": "Automotive & Clean Mobility",
    "description": "Lithium/Nickel precursor cells, Gigafactories, powertrain assembly, stamping plants, and dealership networks.",
    "nodes": [
        {"node_id": "SUP-EV-01", "node_type": "Supplier", "name": "Albemarle Lithium Refining", "country": "Chile", "city": "Antofagasta", "capacity_utilization": 0.92, "historical_delay_avg": 5.0, "risk_score": 0.25},
        {"node_id": "SUP-EV-02", "node_type": "Supplier", "name": "Sumitomo Metal Cathode Active Materials", "country": "Japan", "city": "Niihama", "capacity_utilization": 0.89, "historical_delay_avg": 2.2, "risk_score": 0.18},
        {"node_id": "SUP-EV-03", "node_type": "Supplier", "name": "Bosch E-Motor Drives & Inverters", "country": "Germany", "city": "Stuttgart", "capacity_utilization": 0.85, "historical_delay_avg": 1.8, "risk_score": 0.15},
        {"node_id": "SUP-EV-04", "node_type": "Supplier", "name": "Vale Nickel Class-1 Pellets", "country": "Canada", "city": "Sudbury", "capacity_utilization": 0.88, "historical_delay_avg": 3.1, "risk_score": 0.20},
        {"node_id": "MAN-EV-01", "node_type": "Manufacturer", "name": "CATL Yibin Gigafactory", "country": "China", "city": "Yibin", "capacity_utilization": 0.96, "historical_delay_avg": 2.0, "risk_score": 0.28},
        {"node_id": "MAN-EV-02", "node_type": "Manufacturer", "name": "Panasonic Energy Giga Nevada", "country": "United States", "city": "Sparks", "capacity_utilization": 0.91, "historical_delay_avg": 2.5, "risk_score": 0.22},
        {"node_id": "MAN-EV-03", "node_type": "Manufacturer", "name": "Tesla Giga Berlin Grünheide", "country": "Germany", "city": "Grünheide", "capacity_utilization": 0.94, "historical_delay_avg": 2.4, "risk_score": 0.20},
        {"node_id": "MAN-EV-04", "node_type": "Manufacturer", "name": "BMW Dingolfing Assembly Plant", "country": "Germany", "city": "Dingolfing", "capacity_utilization": 0.88, "historical_delay_avg": 1.9, "risk_score": 0.16},
        {"node_id": "PORT-EV-01", "node_type": "Port", "name": "Port of Shanghai", "country": "China", "city": "Shanghai", "capacity_utilization": 0.93, "throughput_teu": 47300000, "risk_score": 0.25},
        {"node_id": "PORT-EV-02", "node_type": "Port", "name": "Port of Hamburg", "country": "Germany", "city": "Hamburg", "capacity_utilization": 0.83, "throughput_teu": 8500000, "risk_score": 0.18},
        {"node_id": "PORT-EV-03", "node_type": "Port", "name": "Port of Nagoya", "country": "Japan", "city": "Nagoya", "capacity_utilization": 0.86, "throughput_teu": 2800000, "risk_score": 0.15},
        {"node_id": "PORT-EV-04", "node_type": "Port", "name": "Port of Los Angeles", "country": "United States", "city": "Los Angeles", "capacity_utilization": 0.92, "throughput_teu": 10600000, "risk_score": 0.30},
        {"node_id": "DC-EV-01", "node_type": "DistributionCenter", "name": "European Vehicle Logistic Park", "country": "Belgium", "city": "Zeebrugge", "capacity_utilization": 0.87, "historical_delay_avg": 1.4, "risk_score": 0.12},
        {"node_id": "DC-EV-02", "node_type": "DistributionCenter", "name": "Midwest Automotive Distribution Hub", "country": "United States", "city": "Detroit", "capacity_utilization": 0.84, "historical_delay_avg": 2.2, "risk_score": 0.16},
        {"node_id": "RET-EV-01", "node_type": "Retailer", "name": "European EV Dealership Network", "country": "Germany", "city": "Munich", "capacity_utilization": 0.79, "historical_delay_avg": 1.1, "risk_score": 0.10},
        {"node_id": "RET-EV-02", "node_type": "Retailer", "name": "North America EV Showrooms & Hubs", "country": "United States", "city": "Chicago", "capacity_utilization": 0.83, "historical_delay_avg": 1.5, "risk_score": 0.12},
    ],
    "edges": [
        {"source": "SUP-EV-01", "target": "PORT-EV-01", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 28, "quantity": 45000},
        {"source": "SUP-EV-01", "target": "PORT-EV-04", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 18, "quantity": 30000},
        {"source": "SUP-EV-02", "target": "PORT-EV-03", "relationship": "SHIPS_THROUGH", "transport_mode": "road", "transit_days": 1, "quantity": 25000},
        {"source": "SUP-EV-04", "target": "MAN-EV-02", "relationship": "SUPPLIES", "transport_mode": "rail", "transit_days": 6, "quantity": 18000},
        {"source": "PORT-EV-01", "target": "MAN-EV-01", "relationship": "DELIVERS_TO", "transport_mode": "rail", "transit_days": 3, "quantity": 55000},
        {"source": "PORT-EV-04", "target": "MAN-EV-02", "relationship": "DELIVERS_TO", "transport_mode": "rail", "transit_days": 2, "quantity": 40000},
        {"source": "PORT-EV-03", "target": "PORT-EV-02", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 30, "quantity": 35000},
        {"source": "SUP-EV-03", "target": "MAN-EV-03", "relationship": "SUPPLIES", "transport_mode": "road", "transit_days": 1, "quantity": 12000},
        {"source": "SUP-EV-03", "target": "MAN-EV-04", "relationship": "SUPPLIES", "transport_mode": "road", "transit_days": 1, "quantity": 15000},
        {"source": "MAN-EV-01", "target": "PORT-EV-01", "relationship": "SHIPS_THROUGH", "transport_mode": "rail", "transit_days": 3, "quantity": 80000},
        {"source": "PORT-EV-01", "target": "PORT-EV-02", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 26, "quantity": 90000},
        {"source": "PORT-EV-02", "target": "MAN-EV-03", "relationship": "DELIVERS_TO", "transport_mode": "rail", "transit_days": 2, "quantity": 60000},
        {"source": "PORT-EV-02", "target": "MAN-EV-04", "relationship": "DELIVERS_TO", "transport_mode": "rail", "transit_days": 2, "quantity": 45000},
        {"source": "MAN-EV-02", "target": "DC-EV-02", "relationship": "DELIVERS_TO", "transport_mode": "rail", "transit_days": 4, "quantity": 75000},
        {"source": "MAN-EV-03", "target": "DC-EV-01", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 2, "quantity": 40000},
        {"source": "MAN-EV-04", "target": "DC-EV-01", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 2, "quantity": 38000},
        {"source": "DC-EV-01", "target": "RET-EV-01", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 2, "quantity": 70000},
        {"source": "DC-EV-02", "target": "RET-EV-02", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 3, "quantity": 65000},
    ],
}

# ==========================================
# 3. Pharma & Cold-Chain Vaccine Distribution
# ==========================================
PHARMA_VACCINE_TEMPLATE = {
    "id": "pharma_vaccine",
    "name": "Global Pharma & Ultra-Cold Chain Vaccines",
    "industry": "Pharmaceuticals & Healthcare",
    "description": "Active Pharmaceutical Ingredients (API), bio-reactors, temperature-monitored air corridors, and national healthcare distribution.",
    "nodes": [
        {"node_id": "SUP-BIO-01", "node_type": "Supplier", "name": "Lonza Biological Reagents", "country": "Switzerland", "city": "Basel", "capacity_utilization": 0.94, "historical_delay_avg": 1.5, "risk_score": 0.12},
        {"node_id": "SUP-BIO-02", "node_type": "Supplier", "name": "Aarti Industries API Chemicals", "country": "India", "city": "Mumbai", "capacity_utilization": 0.90, "historical_delay_avg": 3.5, "risk_score": 0.22},
        {"node_id": "SUP-BIO-03", "node_type": "Supplier", "name": "Corning Specialized Glass Vials", "country": "United States", "city": "Corning", "capacity_utilization": 0.86, "historical_delay_avg": 2.0, "risk_score": 0.15},
        {"node_id": "MAN-BIO-01", "node_type": "Manufacturer", "name": "Novartis Stein Bio-Production", "country": "Switzerland", "city": "Stein", "capacity_utilization": 0.96, "historical_delay_avg": 1.2, "risk_score": 0.14},
        {"node_id": "MAN-BIO-02", "node_type": "Manufacturer", "name": "Serum Institute Mega Vaccine Facility", "country": "India", "city": "Pune", "capacity_utilization": 0.98, "historical_delay_avg": 2.1, "risk_score": 0.26},
        {"node_id": "MAN-BIO-03", "node_type": "Manufacturer", "name": "Pfizer Kalamazoo Injectables", "country": "United States", "city": "Kalamazoo", "capacity_utilization": 0.92, "historical_delay_avg": 1.8, "risk_score": 0.16},
        {"node_id": "PORT-BIO-01", "node_type": "Port", "name": "Port of Antwerp-Bruges Cold Gateway", "country": "Belgium", "city": "Antwerp", "capacity_utilization": 0.88, "throughput_teu": 13500000, "risk_score": 0.18},
        {"node_id": "PORT-BIO-02", "node_type": "Port", "name": "Jawaharlal Nehru Port (JNPT)", "country": "India", "city": "Navi Mumbai", "capacity_utilization": 0.91, "throughput_teu": 6000000, "risk_score": 0.28},
        {"node_id": "PORT-BIO-03", "node_type": "Port", "name": "Port of New York and New Jersey", "country": "United States", "city": "Elizabeth", "capacity_utilization": 0.89, "throughput_teu": 8900000, "risk_score": 0.22},
        {"node_id": "DC-BIO-01", "node_type": "DistributionCenter", "name": "DHL Pharma Logistics Hub Leipzig", "country": "Germany", "city": "Leipzig", "capacity_utilization": 0.93, "historical_delay_avg": 0.8, "risk_score": 0.10},
        {"node_id": "DC-BIO-02", "node_type": "DistributionCenter", "name": "McKesson Healthcare Hub Memphis", "country": "United States", "city": "Memphis", "capacity_utilization": 0.90, "historical_delay_avg": 1.1, "risk_score": 0.12},
        {"node_id": "DC-BIO-03", "node_type": "DistributionCenter", "name": "Zuellig Pharma Singapore Cold Vault", "country": "Singapore", "city": "Singapore", "capacity_utilization": 0.87, "historical_delay_avg": 0.9, "risk_score": 0.10},
        {"node_id": "RET-BIO-01", "node_type": "Retailer", "name": "European Hospital Systems & Clinics", "country": "France", "city": "Paris", "capacity_utilization": 0.82, "historical_delay_avg": 0.5, "risk_score": 0.08},
        {"node_id": "RET-BIO-02", "node_type": "Retailer", "name": "North American Health Pharmacy Networks", "country": "United States", "city": "New York", "capacity_utilization": 0.85, "historical_delay_avg": 0.6, "risk_score": 0.08},
        {"node_id": "RET-BIO-03", "node_type": "Retailer", "name": "Asia-Pacific Regional Medical Centers", "country": "Australia", "city": "Sydney", "capacity_utilization": 0.80, "historical_delay_avg": 0.8, "risk_score": 0.10},
    ],
    "edges": [
        {"source": "SUP-BIO-01", "target": "MAN-BIO-01", "relationship": "SUPPLIES", "transport_mode": "road", "transit_days": 1, "quantity": 5000},
        {"source": "SUP-BIO-02", "target": "MAN-BIO-02", "relationship": "SUPPLIES", "transport_mode": "road", "transit_days": 1, "quantity": 12000},
        {"source": "SUP-BIO-02", "target": "MAN-BIO-01", "relationship": "SUPPLIES", "transport_mode": "air", "transit_days": 2, "quantity": 8000},
        {"source": "SUP-BIO-03", "target": "MAN-BIO-03", "relationship": "SUPPLIES", "transport_mode": "road", "transit_days": 1, "quantity": 40000},
        {"source": "SUP-BIO-03", "target": "MAN-BIO-01", "relationship": "SUPPLIES", "transport_mode": "air", "transit_days": 2, "quantity": 25000},
        {"source": "MAN-BIO-01", "target": "PORT-BIO-01", "relationship": "SHIPS_THROUGH", "transport_mode": "road", "transit_days": 1, "quantity": 50000},
        {"source": "MAN-BIO-01", "target": "DC-BIO-01", "relationship": "DELIVERS_TO", "transport_mode": "air", "transit_days": 1, "quantity": 70000},
        {"source": "MAN-BIO-02", "target": "PORT-BIO-02", "relationship": "SHIPS_THROUGH", "transport_mode": "road", "transit_days": 1, "quantity": 120000},
        {"source": "PORT-BIO-02", "target": "PORT-BIO-01", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 18, "quantity": 100000},
        {"source": "PORT-BIO-01", "target": "DC-BIO-01", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 1, "quantity": 140000},
        {"source": "MAN-BIO-03", "target": "DC-BIO-02", "relationship": "DELIVERS_TO", "transport_mode": "air", "transit_days": 1, "quantity": 85000},
        {"source": "DC-BIO-01", "target": "DC-BIO-03", "relationship": "DELIVERS_TO", "transport_mode": "air", "transit_days": 2, "quantity": 60000},
        {"source": "DC-BIO-01", "target": "RET-BIO-01", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 1, "quantity": 90000},
        {"source": "DC-BIO-02", "target": "RET-BIO-02", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 1, "quantity": 80000},
        {"source": "DC-BIO-03", "target": "RET-BIO-03", "relationship": "DELIVERS_TO", "transport_mode": "air", "transit_days": 2, "quantity": 55000},
    ],
}

# ==========================================
# 4. Renewable Energy & Solar/Wind
# ==========================================
RENEWABLE_ENERGY_TEMPLATE = {
    "id": "renewable_energy",
    "name": "Renewable Energy & Solar/Wind Infrastructure",
    "industry": "Clean Tech & Energy Transition",
    "description": "Polysilicon refining, photovoltaic cells, wind turbine nacelles/blades, and utility grid installations.",
    "nodes": [
        {"node_id": "SUP-REN-01", "node_type": "Supplier", "name": "Wacker Chemie High-Purity Polysilicon", "country": "Germany", "city": "Burghausen", "capacity_utilization": 0.91, "historical_delay_avg": 2.5, "risk_score": 0.16},
        {"node_id": "SUP-REN-02", "node_type": "Supplier", "name": "Daido Steel Rare-Earth Generator Magnets", "country": "Japan", "city": "Nagoya", "capacity_utilization": 0.88, "historical_delay_avg": 3.0, "risk_score": 0.22},
        {"node_id": "SUP-REN-03", "node_type": "Supplier", "name": "Hexcel Carbon Fiber Composite Fabrics", "country": "United States", "city": "Stamford", "capacity_utilization": 0.85, "historical_delay_avg": 2.0, "risk_score": 0.15},
        {"node_id": "MAN-REN-01", "node_type": "Manufacturer", "name": "LONGi Green Energy PV Cell Fab", "country": "China", "city": "Xi'an", "capacity_utilization": 0.97, "historical_delay_avg": 1.8, "risk_score": 0.28},
        {"node_id": "MAN-REN-02", "node_type": "Manufacturer", "name": "Vestas Offshore Wind Nacelle Plant", "country": "Denmark", "city": "Aarhus", "capacity_utilization": 0.92, "historical_delay_avg": 2.6, "risk_score": 0.18},
        {"node_id": "MAN-REN-03", "node_type": "Manufacturer", "name": "Siemens Gamesa Blade Works", "country": "Spain", "city": "Zamudio", "capacity_utilization": 0.89, "historical_delay_avg": 2.2, "risk_score": 0.20},
        {"node_id": "PORT-REN-01", "node_type": "Port", "name": "Port of Ningbo-Zhoushan", "country": "China", "city": "Ningbo", "capacity_utilization": 0.94, "throughput_teu": 33300000, "risk_score": 0.26},
        {"node_id": "PORT-REN-02", "node_type": "Port", "name": "Port of Esbjerg Wind Port", "country": "Denmark", "city": "Esbjerg", "capacity_utilization": 0.87, "throughput_teu": 4500000, "risk_score": 0.14},
        {"node_id": "PORT-REN-03", "node_type": "Port", "name": "Port of Houston Industrial Gateway", "country": "United States", "city": "Houston", "capacity_utilization": 0.89, "throughput_teu": 3800000, "risk_score": 0.24},
        {"node_id": "DC-REN-01", "node_type": "DistributionCenter", "name": "European Clean Grid Storage Hub", "country": "Netherlands", "city": "Groningen", "capacity_utilization": 0.84, "historical_delay_avg": 1.5, "risk_score": 0.12},
        {"node_id": "DC-REN-02", "node_type": "DistributionCenter", "name": "North America Sunbelt Distribution Base", "country": "United States", "city": "Phoenix", "capacity_utilization": 0.86, "historical_delay_avg": 1.9, "risk_score": 0.15},
        {"node_id": "RET-REN-01", "node_type": "Retailer", "name": "European North Sea Wind Farm Projects", "country": "United Kingdom", "city": "Hull", "capacity_utilization": 0.80, "historical_delay_avg": 1.0, "risk_score": 0.10},
        {"node_id": "RET-REN-02", "node_type": "Retailer", "name": "US Utility-Scale Solar Array Grid", "country": "United States", "city": "Las Vegas", "capacity_utilization": 0.83, "historical_delay_avg": 1.4, "risk_score": 0.12},
    ],
    "edges": [
        {"source": "SUP-REN-01", "target": "MAN-REN-01", "relationship": "SUPPLIES", "transport_mode": "sea", "transit_days": 24, "quantity": 30000},
        {"source": "SUP-REN-02", "target": "MAN-REN-02", "relationship": "SUPPLIES", "transport_mode": "sea", "transit_days": 28, "quantity": 15000},
        {"source": "SUP-REN-03", "target": "MAN-REN-03", "relationship": "SUPPLIES", "transport_mode": "sea", "transit_days": 14, "quantity": 20000},
        {"source": "MAN-REN-01", "target": "PORT-REN-01", "relationship": "SHIPS_THROUGH", "transport_mode": "rail", "transit_days": 3, "quantity": 90000},
        {"source": "PORT-REN-01", "target": "PORT-REN-03", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 22, "quantity": 70000},
        {"source": "MAN-REN-02", "target": "PORT-REN-02", "relationship": "SHIPS_THROUGH", "transport_mode": "road", "transit_days": 1, "quantity": 35000},
        {"source": "MAN-REN-03", "target": "PORT-REN-02", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 5, "quantity": 28000},
        {"source": "PORT-REN-02", "target": "DC-REN-01", "relationship": "DELIVERS_TO", "transport_mode": "sea", "transit_days": 2, "quantity": 60000},
        {"source": "PORT-REN-03", "target": "DC-REN-02", "relationship": "DELIVERS_TO", "transport_mode": "rail", "transit_days": 3, "quantity": 65000},
        {"source": "DC-REN-01", "target": "RET-REN-01", "relationship": "DELIVERS_TO", "transport_mode": "sea", "transit_days": 2, "quantity": 55000},
        {"source": "DC-REN-02", "target": "RET-REN-02", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 2, "quantity": 60000},
    ],
}

# ==========================================
# 5. Global Maritime & Megahub Shipping Network
# ==========================================
MARITIME_SHIPPING_TEMPLATE = {
    "id": "maritime_shipping",
    "name": "Global Maritime & Transshipment Megahubs",
    "industry": "Maritime Logistics & Freight",
    "description": "The world's highest-throughput container ports, straits, canal bottlenecks, and feeder networks.",
    "nodes": [
        {"node_id": "PORT-HUB-01", "node_type": "Port", "name": "Port of Shanghai (Yangshan Deepwater)", "country": "China", "city": "Shanghai", "capacity_utilization": 0.96, "throughput_teu": 47300000, "risk_score": 0.32},
        {"node_id": "PORT-HUB-02", "node_type": "Port", "name": "Port of Singapore (PSA Megahub)", "country": "Singapore", "city": "Singapore", "capacity_utilization": 0.94, "throughput_teu": 37200000, "risk_score": 0.25},
        {"node_id": "PORT-HUB-03", "node_type": "Port", "name": "Port of Rotterdam (Maasvlakte)", "country": "Netherlands", "city": "Rotterdam", "capacity_utilization": 0.88, "throughput_teu": 15000000, "risk_score": 0.18},
        {"node_id": "PORT-HUB-04", "node_type": "Port", "name": "Port of Los Angeles (San Pedro Bay)", "country": "United States", "city": "Los Angeles", "capacity_utilization": 0.93, "throughput_teu": 10600000, "risk_score": 0.30},
        {"node_id": "PORT-HUB-05", "node_type": "Port", "name": "Port of Jebel Ali (DP World)", "country": "United Arab Emirates", "city": "Dubai", "capacity_utilization": 0.89, "throughput_teu": 14000000, "risk_score": 0.22},
        {"node_id": "PORT-HUB-06", "node_type": "Port", "name": "Port of Busan (New Port)", "country": "South Korea", "city": "Busan", "capacity_utilization": 0.90, "throughput_teu": 22000000, "risk_score": 0.20},
        {"node_id": "PORT-HUB-07", "node_type": "Port", "name": "Port of Santos", "country": "Brazil", "city": "Santos", "capacity_utilization": 0.85, "throughput_teu": 4800000, "risk_score": 0.28},
        {"node_id": "PORT-HUB-08", "node_type": "Port", "name": "Port of Tangier Med", "country": "Morocco", "city": "Tangier", "capacity_utilization": 0.92, "throughput_teu": 7500000, "risk_score": 0.20},
        {"node_id": "DC-HUB-01", "node_type": "DistributionCenter", "name": "Rhine-Alpine Freight Corridor Hub", "country": "Germany", "city": "Duisburg", "capacity_utilization": 0.91, "historical_delay_avg": 1.6, "risk_score": 0.15},
        {"node_id": "DC-HUB-02", "node_type": "DistributionCenter", "name": "Inland Empire Logistics Basin", "country": "United States", "city": "Ontario", "capacity_utilization": 0.95, "historical_delay_avg": 2.8, "risk_score": 0.26},
        {"node_id": "DC-HUB-03", "node_type": "DistributionCenter", "name": "Greater Bay Logistics Gateway", "country": "China", "city": "Shenzhen", "capacity_utilization": 0.93, "historical_delay_avg": 1.9, "risk_score": 0.22},
        {"node_id": "RET-HUB-01", "node_type": "Retailer", "name": "European Consumer Commercial Core", "country": "Germany", "city": "Cologne", "capacity_utilization": 0.84, "historical_delay_avg": 1.0, "risk_score": 0.12},
        {"node_id": "RET-HUB-02", "node_type": "Retailer", "name": "North American Retail Inbound Network", "country": "United States", "city": "Chicago", "capacity_utilization": 0.88, "historical_delay_avg": 1.8, "risk_score": 0.16},
    ],
    "edges": [
        {"source": "PORT-HUB-01", "target": "PORT-HUB-02", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 6, "quantity": 400000},
        {"source": "PORT-HUB-01", "target": "PORT-HUB-06", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 2, "quantity": 250000},
        {"source": "PORT-HUB-01", "target": "PORT-HUB-04", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 14, "quantity": 600000},
        {"source": "PORT-HUB-06", "target": "PORT-HUB-04", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 12, "quantity": 350000},
        {"source": "PORT-HUB-02", "target": "PORT-HUB-05", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 9, "quantity": 320000},
        {"source": "PORT-HUB-05", "target": "PORT-HUB-08", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 11, "quantity": 280000},
        {"source": "PORT-HUB-08", "target": "PORT-HUB-03", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 4, "quantity": 310000},
        {"source": "PORT-HUB-02", "target": "PORT-HUB-03", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 22, "quantity": 500000},
        {"source": "PORT-HUB-07", "target": "PORT-HUB-03", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 16, "quantity": 180000},
        {"source": "PORT-HUB-07", "target": "PORT-HUB-04", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 19, "quantity": 140000},
        {"source": "PORT-HUB-03", "target": "DC-HUB-01", "relationship": "DELIVERS_TO", "transport_mode": "rail", "transit_days": 1, "quantity": 420000},
        {"source": "PORT-HUB-04", "target": "DC-HUB-02", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 1, "quantity": 550000},
        {"source": "PORT-HUB-01", "target": "DC-HUB-03", "relationship": "DELIVERS_TO", "transport_mode": "rail", "transit_days": 2, "quantity": 380000},
        {"source": "DC-HUB-01", "target": "RET-HUB-01", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 1, "quantity": 390000},
        {"source": "DC-HUB-02", "target": "RET-HUB-02", "relationship": "DELIVERS_TO", "transport_mode": "rail", "transit_days": 3, "quantity": 480000},
    ],
}

ALL_BUILTIN_TEMPLATES: dict[str, dict[str, Any]] = {
    "semiconductor": SEMICONDUCTOR_TEMPLATE,
    "ev_automotive": EV_AUTOMOTIVE_TEMPLATE,
    "pharma_vaccine": PHARMA_VACCINE_TEMPLATE,
    "renewable_energy": RENEWABLE_ENERGY_TEMPLATE,
    "maritime_shipping": MARITIME_SHIPPING_TEMPLATE,
}


# ==========================================
# 5 Standalone Importable JSON Datasets
# ==========================================

FILE_TEMPLATES = [
    {
        "filename": "01_aerospace_defense_network.json",
        "title": "Aerospace & Precision Defense Network",
        "industry": "Aerospace & Aviation",
        "description": "Titanium forgings, jet turbines, avionics suites, wing structures, final assembly, and airline deliveries.",
        "nodes": [
            {"node_id": "SUP-AERO-01", "node_type": "Supplier", "name": "VSMPO-AVISMA Titanium Forgings", "country": "Global", "city": "Verkhnyaya", "capacity_utilization": 0.94, "historical_delay_avg": 5.0, "risk_score": 0.35},
            {"node_id": "SUP-AERO-02", "node_type": "Supplier", "name": "Safran Aircraft Engines & Nacelles", "country": "France", "city": "Courcouronnes", "capacity_utilization": 0.90, "historical_delay_avg": 2.8, "risk_score": 0.20},
            {"node_id": "SUP-AERO-03", "node_type": "Supplier", "name": "Collins Aerospace Flight Avionics", "country": "United States", "city": "Charlotte", "capacity_utilization": 0.87, "historical_delay_avg": 2.1, "risk_score": 0.16},
            {"node_id": "SUP-AERO-04", "node_type": "Supplier", "name": "Toray Carbon Fiber Prepregs", "country": "Japan", "city": "Tokyo", "capacity_utilization": 0.89, "historical_delay_avg": 2.4, "risk_score": 0.18},
            {"node_id": "MAN-AERO-01", "node_type": "Manufacturer", "name": "Airbus Toulouse Final Assembly Line", "country": "France", "city": "Toulouse", "capacity_utilization": 0.96, "historical_delay_avg": 3.4, "risk_score": 0.25},
            {"node_id": "MAN-AERO-02", "node_type": "Manufacturer", "name": "Boeing Everett Widebody Plant", "country": "United States", "city": "Everett", "capacity_utilization": 0.92, "historical_delay_avg": 4.1, "risk_score": 0.30},
            {"node_id": "PORT-AERO-01", "node_type": "Port", "name": "Port of Le Havre Maritime Entry", "country": "France", "city": "Le Havre", "capacity_utilization": 0.86, "throughput_teu": 3100000, "risk_score": 0.18},
            {"node_id": "PORT-AERO-02", "node_type": "Port", "name": "Port of Seattle Aero Cargo Terminal", "country": "United States", "city": "Seattle", "capacity_utilization": 0.88, "throughput_teu": 3700000, "risk_score": 0.22},
            {"node_id": "DC-AERO-01", "node_type": "DistributionCenter", "name": "Satair European Spares Hub Hamburg", "country": "Germany", "city": "Hamburg", "capacity_utilization": 0.89, "historical_delay_avg": 1.2, "risk_score": 0.12},
            {"node_id": "DC-AERO-02", "node_type": "DistributionCenter", "name": "Boeing Global Distribution Dallas", "country": "United States", "city": "Dallas", "capacity_utilization": 0.86, "historical_delay_avg": 1.5, "risk_score": 0.14},
            {"node_id": "RET-AERO-01", "node_type": "Retailer", "name": "Commercial Airlines Delivery Center", "country": "United States", "city": "Chicago", "capacity_utilization": 0.80, "historical_delay_avg": 0.9, "risk_score": 0.10},
        ],
        "edges": [
            {"source": "SUP-AERO-01", "target": "MAN-AERO-01", "relationship": "SUPPLIES", "transport_mode": "sea", "transit_days": 18, "quantity": 4000},
            {"source": "SUP-AERO-01", "target": "MAN-AERO-02", "relationship": "SUPPLIES", "transport_mode": "sea", "transit_days": 22, "quantity": 4500},
            {"source": "SUP-AERO-02", "target": "MAN-AERO-01", "relationship": "SUPPLIES", "transport_mode": "air", "transit_days": 1, "quantity": 120},
            {"source": "SUP-AERO-03", "target": "MAN-AERO-02", "relationship": "SUPPLIES", "transport_mode": "road", "transit_days": 2, "quantity": 300},
            {"source": "SUP-AERO-04", "target": "MAN-AERO-01", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 26, "quantity": 15000},
            {"source": "MAN-AERO-01", "target": "DC-AERO-01", "relationship": "DELIVERS_TO", "transport_mode": "air", "transit_days": 1, "quantity": 5000},
            {"source": "MAN-AERO-02", "target": "DC-AERO-02", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 2, "quantity": 6000},
            {"source": "DC-AERO-01", "target": "RET-AERO-01", "relationship": "DELIVERS_TO", "transport_mode": "air", "transit_days": 2, "quantity": 8000},
            {"source": "DC-AERO-02", "target": "RET-AERO-01", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 1, "quantity": 10000},
        ],
    },
    {
        "filename": "02_fmcg_food_logistics_network.json",
        "title": "FMCG & Temperature-Controlled Food Logistics",
        "industry": "Food, Beverage & Agriculture",
        "description": "Grain silos, dairy co-ops, processing facilities, deep freeze logistics, and supermarket distribution.",
        "nodes": [
            {"node_id": "SUP-FOOD-01", "node_type": "Supplier", "name": "Cargill Bulk Grain Terminals", "country": "United States", "city": "Minneapolis", "capacity_utilization": 0.92, "historical_delay_avg": 2.0, "risk_score": 0.18},
            {"node_id": "SUP-FOOD-02", "node_type": "Supplier", "name": "JBS Sustainable Beef Supply", "country": "Brazil", "city": "São Paulo", "capacity_utilization": 0.95, "historical_delay_avg": 4.2, "risk_score": 0.28},
            {"node_id": "SUP-FOOD-03", "node_type": "Supplier", "name": "Tetra Pak Aseptic Packaging", "country": "Sweden", "city": "Lund", "capacity_utilization": 0.88, "historical_delay_avg": 1.6, "risk_score": 0.12},
            {"node_id": "MAN-FOOD-01", "node_type": "Manufacturer", "name": "Nestlé Vevey Food Processing", "country": "Switzerland", "city": "Vevey", "capacity_utilization": 0.94, "historical_delay_avg": 1.5, "risk_score": 0.15},
            {"node_id": "MAN-FOOD-02", "node_type": "Manufacturer", "name": "Unilever Hellmanns Mega Factory", "country": "United States", "city": "Englewood", "capacity_utilization": 0.90, "historical_delay_avg": 1.8, "risk_score": 0.16},
            {"node_id": "PORT-FOOD-01", "node_type": "Port", "name": "Port of Santos Agro Terminal", "country": "Brazil", "city": "Santos", "capacity_utilization": 0.93, "throughput_teu": 4800000, "risk_score": 0.30},
            {"node_id": "PORT-FOOD-02", "node_type": "Port", "name": "Port of New Orleans Grain Silos", "country": "United States", "city": "New Orleans", "capacity_utilization": 0.89, "throughput_teu": 2500000, "risk_score": 0.22},
            {"node_id": "DC-FOOD-01", "node_type": "DistributionCenter", "name": "Lineage Cold Storage Mega Vault", "country": "United States", "city": "Dallas", "capacity_utilization": 0.96, "historical_delay_avg": 0.8, "risk_score": 0.14},
            {"node_id": "RET-FOOD-01", "node_type": "Retailer", "name": "Walmart Regional Supercenters", "country": "United States", "city": "Bentonville", "capacity_utilization": 0.89, "historical_delay_avg": 0.5, "risk_score": 0.08},
            {"node_id": "RET-FOOD-02", "node_type": "Retailer", "name": "Carrefour European Hypermarket Chain", "country": "France", "city": "Massy", "capacity_utilization": 0.86, "historical_delay_avg": 0.6, "risk_score": 0.10},
        ],
        "edges": [
            {"source": "SUP-FOOD-01", "target": "PORT-FOOD-02", "relationship": "SHIPS_THROUGH", "transport_mode": "rail", "transit_days": 3, "quantity": 100000},
            {"source": "SUP-FOOD-02", "target": "PORT-FOOD-01", "relationship": "SHIPS_THROUGH", "transport_mode": "road", "transit_days": 2, "quantity": 80000},
            {"source": "PORT-FOOD-01", "target": "MAN-FOOD-01", "relationship": "DELIVERS_TO", "transport_mode": "sea", "transit_days": 16, "quantity": 65000},
            {"source": "PORT-FOOD-02", "target": "MAN-FOOD-02", "relationship": "DELIVERS_TO", "transport_mode": "rail", "transit_days": 2, "quantity": 70000},
            {"source": "SUP-FOOD-03", "target": "MAN-FOOD-01", "relationship": "SUPPLIES", "transport_mode": "road", "transit_days": 2, "quantity": 40000},
            {"source": "MAN-FOOD-01", "target": "RET-FOOD-02", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 1, "quantity": 85000},
            {"source": "MAN-FOOD-02", "target": "DC-FOOD-01", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 2, "quantity": 90000},
            {"source": "DC-FOOD-01", "target": "RET-FOOD-01", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 1, "quantity": 95000},
        ],
    },
    {
        "filename": "03_textile_apparel_network.json",
        "title": "Textile & Fast-Fashion Global Apparel Network",
        "industry": "Textiles & Fast Fashion",
        "description": "Raw cotton gins, yarn spinning, dye works, garment assembly in Southeast Asia, and flagship fast-fashion stores.",
        "nodes": [
            {"node_id": "SUP-TEX-01", "node_type": "Supplier", "name": "Gujarat Raw Cotton Ginning Co-Op", "country": "India", "city": "Ahmedabad", "capacity_utilization": 0.91, "historical_delay_avg": 3.0, "risk_score": 0.22},
            {"node_id": "SUP-TEX-02", "node_type": "Supplier", "name": "Toray Synthetic Microfibers", "country": "Japan", "city": "Osaka", "capacity_utilization": 0.88, "historical_delay_avg": 2.0, "risk_score": 0.15},
            {"node_id": "MAN-TEX-01", "node_type": "Manufacturer", "name": "Beximco Apparel Industrial Park", "country": "Bangladesh", "city": "Dhaka", "capacity_utilization": 0.96, "historical_delay_avg": 4.5, "risk_score": 0.35},
            {"node_id": "MAN-TEX-02", "node_type": "Manufacturer", "name": "Viet Tien Garment Export Corporation", "country": "Vietnam", "city": "Ho Chi Minh City", "capacity_utilization": 0.93, "historical_delay_avg": 2.8, "risk_score": 0.25},
            {"node_id": "PORT-TEX-01", "node_type": "Port", "name": "Port of Chittagong", "country": "Bangladesh", "city": "Chittagong", "capacity_utilization": 0.95, "throughput_teu": 3200000, "risk_score": 0.38},
            {"node_id": "PORT-TEX-02", "node_type": "Port", "name": "Port of Cat Lai", "country": "Vietnam", "city": "Ho Chi Minh City", "capacity_utilization": 0.90, "throughput_teu": 5500000, "risk_score": 0.22},
            {"node_id": "DC-TEX-01", "node_type": "DistributionCenter", "name": "Inditex Zara Central Logistics Hub", "country": "Spain", "city": "Zaragoza", "capacity_utilization": 0.94, "historical_delay_avg": 0.9, "risk_score": 0.12},
            {"node_id": "RET-TEX-01", "node_type": "Retailer", "name": "Global Fast-Fashion Flagship Outlets", "country": "United Kingdom", "city": "London", "capacity_utilization": 0.82, "historical_delay_avg": 0.7, "risk_score": 0.10},
        ],
        "edges": [
            {"source": "SUP-TEX-01", "target": "MAN-TEX-01", "relationship": "SUPPLIES", "transport_mode": "sea", "transit_days": 6, "quantity": 80000},
            {"source": "SUP-TEX-02", "target": "MAN-TEX-02", "relationship": "SUPPLIES", "transport_mode": "sea", "transit_days": 5, "quantity": 50000},
            {"source": "MAN-TEX-01", "target": "PORT-TEX-01", "relationship": "SHIPS_THROUGH", "transport_mode": "road", "transit_days": 1, "quantity": 120000},
            {"source": "MAN-TEX-02", "target": "PORT-TEX-02", "relationship": "SHIPS_THROUGH", "transport_mode": "road", "transit_days": 1, "quantity": 90000},
            {"source": "PORT-TEX-01", "target": "DC-TEX-01", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 18, "quantity": 150000},
            {"source": "PORT-TEX-02", "target": "DC-TEX-01", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 16, "quantity": 110000},
            {"source": "DC-TEX-01", "target": "RET-TEX-01", "relationship": "DELIVERS_TO", "transport_mode": "air", "transit_days": 1, "quantity": 200000},
        ],
    },
    {
        "filename": "04_heavy_industrial_robotics.json",
        "title": "Industrial Machinery & Automation Robotics",
        "industry": "Robotics & Heavy Industry",
        "description": "High-precision servo motors, planetary gearboxes, harmonic reducers, industrial robotic arms, and smart factory lines.",
        "nodes": [
            {"node_id": "SUP-ROB-01", "node_type": "Supplier", "name": "Harmonic Drive Systems Precision Reducers", "country": "Japan", "city": "Nagano", "capacity_utilization": 0.93, "historical_delay_avg": 2.2, "risk_score": 0.16},
            {"node_id": "SUP-ROB-02", "node_type": "Supplier", "name": "Yaskawa Electric Servo Motors", "country": "Japan", "city": "Kitakyushu", "capacity_utilization": 0.90, "historical_delay_avg": 1.9, "risk_score": 0.18},
            {"node_id": "SUP-ROB-03", "node_type": "Supplier", "name": "Siemens Industrial PLC Controllers", "country": "Germany", "city": "Nuremberg", "capacity_utilization": 0.88, "historical_delay_avg": 1.7, "risk_score": 0.14},
            {"node_id": "MAN-ROB-01", "node_type": "Manufacturer", "name": "FANUC Robotics Mega Fab Oshino", "country": "Japan", "city": "Oshino", "capacity_utilization": 0.97, "historical_delay_avg": 1.5, "risk_score": 0.20},
            {"node_id": "MAN-ROB-02", "node_type": "Manufacturer", "name": "KUKA Robotics Automated Assembly", "country": "Germany", "city": "Augsburg", "capacity_utilization": 0.91, "historical_delay_avg": 2.0, "risk_score": 0.18},
            {"node_id": "MAN-ROB-03", "node_type": "Manufacturer", "name": "ABB Robotics Mega Factory", "country": "China", "city": "Shanghai", "capacity_utilization": 0.94, "historical_delay_avg": 2.2, "risk_score": 0.25},
            {"node_id": "DC-ROB-01", "node_type": "DistributionCenter", "name": "North America Automation Distribution", "country": "United States", "city": "Rochester Hills", "capacity_utilization": 0.85, "historical_delay_avg": 1.4, "risk_score": 0.12},
            {"node_id": "RET-ROB-01", "node_type": "Retailer", "name": "Automotive Tier-1 Smart Gigafactories", "country": "United States", "city": "Detroit", "capacity_utilization": 0.89, "historical_delay_avg": 1.0, "risk_score": 0.10},
        ],
        "edges": [
            {"source": "SUP-ROB-01", "target": "MAN-ROB-01", "relationship": "SUPPLIES", "transport_mode": "road", "transit_days": 1, "quantity": 15000},
            {"source": "SUP-ROB-01", "target": "MAN-ROB-02", "relationship": "SUPPLIES", "transport_mode": "air", "transit_days": 2, "quantity": 8000},
            {"source": "SUP-ROB-02", "target": "MAN-ROB-01", "relationship": "SUPPLIES", "transport_mode": "road", "transit_days": 1, "quantity": 20000},
            {"source": "SUP-ROB-03", "target": "MAN-ROB-02", "relationship": "SUPPLIES", "transport_mode": "road", "transit_days": 1, "quantity": 12000},
            {"source": "SUP-ROB-03", "target": "MAN-ROB-03", "relationship": "SUPPLIES", "transport_mode": "air", "transit_days": 2, "quantity": 9000},
            {"source": "MAN-ROB-01", "target": "DC-ROB-01", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 14, "quantity": 35000},
            {"source": "MAN-ROB-02", "target": "DC-ROB-01", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 10, "quantity": 22000},
            {"source": "DC-ROB-01", "target": "RET-ROB-01", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 1, "quantity": 45000},
        ],
    },
    {
        "filename": "05_critical_minerals_rare_earths.json",
        "title": "Critical Minerals & Rare Earth Elements",
        "industry": "Mining & Strategic Materials",
        "description": "Neodymium, dysprosium, cobalt, battery-grade nickel, chemical refining, and magnet manufacturing.",
        "nodes": [
            {"node_id": "SUP-MIN-01", "node_type": "Supplier", "name": "Bayan Obo Rare Earth Mega Mine", "country": "China", "city": "Baotou", "capacity_utilization": 0.98, "historical_delay_avg": 3.5, "risk_score": 0.40},
            {"node_id": "SUP-MIN-02", "node_type": "Supplier", "name": "Mt Weld Rare Earths Complex", "country": "Australia", "city": "Laverton", "capacity_utilization": 0.89, "historical_delay_avg": 2.8, "risk_score": 0.20},
            {"node_id": "SUP-MIN-03", "node_type": "Supplier", "name": "Mutanda Cobalt & Copper Mine", "country": "Global", "city": "Kolwezi", "capacity_utilization": 0.93, "historical_delay_avg": 6.2, "risk_score": 0.48},
            {"node_id": "MAN-MIN-01", "node_type": "Manufacturer", "name": "Lynas Advanced Materials Refining Plant", "country": "Malaysia", "city": "Kuantan", "capacity_utilization": 0.91, "historical_delay_avg": 2.4, "risk_score": 0.22},
            {"node_id": "MAN-MIN-02", "node_type": "Manufacturer", "name": "JL MAG Permanent Magnet Smelting", "country": "China", "city": "Ganzhou", "capacity_utilization": 0.95, "historical_delay_avg": 2.0, "risk_score": 0.30},
            {"node_id": "PORT-MIN-01", "node_type": "Port", "name": "Port of Fremantle Bulk Gateway", "country": "Australia", "city": "Fremantle", "capacity_utilization": 0.88, "throughput_teu": 850000, "risk_score": 0.16},
            {"node_id": "PORT-MIN-02", "node_type": "Port", "name": "Port of Durban Mineral Terminal", "country": "Global", "city": "Durban", "capacity_utilization": 0.92, "throughput_teu": 2900000, "risk_score": 0.36},
            {"node_id": "DC-MIN-01", "node_type": "DistributionCenter", "name": "European Strategic Minerals Reserve", "country": "Germany", "city": "Bremen", "capacity_utilization": 0.87, "historical_delay_avg": 1.2, "risk_score": 0.12},
            {"node_id": "RET-MIN-01", "node_type": "Retailer", "name": "EV Motors & Wind Turbine Manufacturers", "country": "Germany", "city": "Stuttgart", "capacity_utilization": 0.90, "historical_delay_avg": 1.0, "risk_score": 0.10},
        ],
        "edges": [
            {"source": "SUP-MIN-01", "target": "MAN-MIN-02", "relationship": "SUPPLIES", "transport_mode": "rail", "transit_days": 4, "quantity": 90000},
            {"source": "SUP-MIN-02", "target": "PORT-MIN-01", "relationship": "SHIPS_THROUGH", "transport_mode": "rail", "transit_days": 2, "quantity": 40000},
            {"source": "PORT-MIN-01", "target": "MAN-MIN-01", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 9, "quantity": 45000},
            {"source": "SUP-MIN-03", "target": "PORT-MIN-02", "relationship": "SHIPS_THROUGH", "transport_mode": "rail", "transit_days": 8, "quantity": 30000},
            {"source": "PORT-MIN-02", "target": "MAN-MIN-01", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 18, "quantity": 35000},
            {"source": "MAN-MIN-01", "target": "DC-MIN-01", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 20, "quantity": 50000},
            {"source": "MAN-MIN-02", "target": "DC-MIN-01", "relationship": "SHIPS_THROUGH", "transport_mode": "sea", "transit_days": 24, "quantity": 70000},
            {"source": "DC-MIN-01", "target": "RET-MIN-01", "relationship": "DELIVERS_TO", "transport_mode": "road", "transit_days": 1, "quantity": 85000},
        ],
    },
]


def write_sample_files_to_disk() -> None:
    """Generate the 5 standalone importable JSON files in data/sample_graphs/."""
    sample_dir = Path(__file__).resolve().parents[2] / "data" / "sample_graphs"
    sample_dir.mkdir(parents=True, exist_ok=True)

    for item in FILE_TEMPLATES:
        file_path = sample_dir / item["filename"]
        data = {
            "title": item["title"],
            "industry": item["industry"],
            "description": item["description"],
            "nodes": item["nodes"],
            "edges": item["edges"],
        }
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)


# Write files immediately when module is loaded
write_sample_files_to_disk()
