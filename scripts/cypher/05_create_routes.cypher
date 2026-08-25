// AtmoGraph — Distribution Centers, Retailers, and Supply-Chain Routes

// Create 35 distribution centers
UNWIND range(1, 35) AS i
MERGE (d:DistributionCenter {node_id: "DC-" + toString(i)})
SET d.name = "Distribution Center " + toString(i),
    d.region =
      CASE
        WHEN i <= 7 THEN "Asia Pacific"
        WHEN i <= 14 THEN "Europe"
        WHEN i <= 21 THEN "North America"
        WHEN i <= 28 THEN "South America"
        ELSE "Middle East and Africa"
      END,
    d.storage_capacity = 50000 + (i * 2500);

// Create 35 retailers
UNWIND range(1, 35) AS i
MERGE (r:Retailer {node_id: "RET-" + toString(i)})
SET r.name = "Global Retailer " + toString(i),
    r.market =
      CASE
        WHEN i <= 7 THEN "India"
        WHEN i <= 14 THEN "Europe"
        WHEN i <= 21 THEN "United States"
        WHEN i <= 28 THEN "Latin America"
        ELSE "Middle East and Africa"
      END,
    r.annual_revenue = 10000000 + (i * 2500000);

// 100 SUPPLIES relationships: Supplier → Manufacturer
MATCH (s:Supplier)
WITH collect(s) AS suppliers
MATCH (m:Manufacturer)
WITH suppliers, collect(m) AS manufacturers
UNWIND range(0, 99) AS i
WITH suppliers[i % size(suppliers)] AS supplier,
     manufacturers[i % size(manufacturers)] AS manufacturer,
     i
MERGE (supplier)-[r:SUPPLIES]->(manufacturer)
SET r.quantity = 500 + (i * 10),
    r.lead_time_days = 7 + (i % 21);

// 50 MANUFACTURES relationships: Manufacturer → Product
MATCH (m:Manufacturer)
WITH collect(m) AS manufacturers
MATCH (p:Product)
WITH manufacturers, collect(p) AS products
UNWIND range(0, 49) AS i
WITH manufacturers[i % size(manufacturers)] AS manufacturer,
     products[i % size(products)] AS product,
     i
MERGE (manufacturer)-[r:MANUFACTURES]->(product)
SET r.batch_size = 100 + (i * 5),
    r.production_days = 5 + (i % 15);

// 200 SHIPS_THROUGH relationships: Manufacturer → Port
MATCH (m:Manufacturer)
WITH collect(m) AS manufacturers
MATCH (p:Port)
WITH manufacturers, collect(p) AS ports
UNWIND range(0, 199) AS i
WITH manufacturers[i % size(manufacturers)] AS manufacturer,
     ports[toInteger(i / 40) % size(ports)] AS port,
     i
MERGE (manufacturer)-[r:SHIPS_THROUGH]->(port)
SET r.distance_km = 500 + (i * 35),
    r.transit_days = 2 + (i % 25),
    r.transport_mode = "Sea";

// 100 ROUTES_TO relationships: Port → Distribution Center
MATCH (p:Port)
WITH collect(p) AS ports
MATCH (d:DistributionCenter)
WITH ports, collect(d) AS distribution_centers
UNWIND range(0, 99) AS i
WITH ports[i % size(ports)] AS port,
     distribution_centers[toInteger(i / 30) % size(distribution_centers)] AS distribution_center,
     i
MERGE (port)-[r:ROUTES_TO]->(distribution_center)
SET r.distance_km = 300 + (i * 20),
    r.transit_days = 1 + (i % 12),
    r.transport_mode = "Road";

// 50 DISTRIBUTES relationships: Distribution Center → Retailer
MATCH (d:DistributionCenter)
WITH collect(d) AS distribution_centers
MATCH (r:Retailer)
WITH distribution_centers, collect(r) AS retailers
UNWIND range(0, 49) AS i
WITH distribution_centers[i % size(distribution_centers)] AS distribution_center,
     retailers[toInteger(i / 35) % size(retailers)] AS retailer,
     i
MERGE (distribution_center)-[r:DISTRIBUTES]->(retailer)
SET r.delivery_days = 1 + (i % 7),
    r.volume_units = 200 + (i * 15);

// 50 SELLS relationships: Retailer → Product
MATCH (r:Retailer)
WITH collect(r) AS retailers
MATCH (p:Product)
WITH retailers, collect(p) AS products
UNWIND range(0, 49) AS i
WITH retailers[i % size(retailers)] AS retailer,
     products[toInteger(i / 35) % size(products)] AS product,
     i
MERGE (retailer)-[r:SELLS]->(product)
SET r.monthly_sales = 1000 + (i * 100),
    r.price_usd = 25 + (i * 5);