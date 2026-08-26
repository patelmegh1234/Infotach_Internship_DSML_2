// AtmoGraph — Neo4j Constraints and Indexes

// Each node must have a unique node_id
CREATE CONSTRAINT supplier_node_id IF NOT EXISTS
FOR (s:Supplier) REQUIRE s.node_id IS UNIQUE;

CREATE CONSTRAINT manufacturer_node_id IF NOT EXISTS
FOR (m:Manufacturer) REQUIRE m.node_id IS UNIQUE;

CREATE CONSTRAINT port_node_id IF NOT EXISTS
FOR (p:Port) REQUIRE p.node_id IS UNIQUE;

CREATE CONSTRAINT distribution_center_node_id IF NOT EXISTS
FOR (d:DistributionCenter) REQUIRE d.node_id IS UNIQUE;

CREATE CONSTRAINT retailer_node_id IF NOT EXISTS
FOR (r:Retailer) REQUIRE r.node_id IS UNIQUE;

CREATE CONSTRAINT product_node_id IF NOT EXISTS
FOR (p:Product) REQUIRE p.node_id IS UNIQUE;

// Indexes make common searches faster
CREATE INDEX supplier_country IF NOT EXISTS
FOR (s:Supplier) ON (s.country);

CREATE INDEX manufacturer_country IF NOT EXISTS
FOR (m:Manufacturer) ON (m.country);

CREATE INDEX port_country IF NOT EXISTS
FOR (p:Port) ON (p.country);

CREATE INDEX product_category IF NOT EXISTS
FOR (p:Product) ON (p.category);

CREATE INDEX retailer_market IF NOT EXISTS
FOR (r:Retailer) ON (r.market);