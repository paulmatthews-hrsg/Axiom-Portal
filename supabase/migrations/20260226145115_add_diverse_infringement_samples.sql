/*
  # Add Diverse Infringement Sample Data with AI-Ready Attributes

  ## New Records Added

  Adds 10 new diverse infringement records across all three fleets:
  - Mix of different issuing authorities (Revenue NSW, Fines Victoria, Wilson Parking, etc.)
  - Various due date scenarios (overdue, due soon, safe)
  - Mix of assigned and unassigned drivers
  - Different offence types for realistic AI confidence simulation

  1. GigCar Records (4 records)
    - Speeding (Revenue NSW) - Overdue
    - Red Light (Fines Victoria) - Due Soon
    - Parking (Wilson Parking) - Safe
    - Phone Use (Revenue NSW) - New/Unassigned

  2. Fleetcar Records (3 records)
    - Speeding (Fines Victoria) - Due Soon
    - Parking (Brisbane City Council) - Safe
    - Toll (Linkt) - Overdue

  3. Yonder Records (3 records)
    - Red Light (Revenue NSW) - Safe
    - Speeding (Fines Victoria) - Due Soon
    - Parking (Melbourne City Council) - Overdue

  ## Important Notes
  - Date received values are strategically set to create urgency scenarios
  - All records include proper jurisdiction and financial metadata
  - Mix of New and Pending Driver Nomination statuses for demo purposes
*/

-- GigCar: Overdue speeding fine
INSERT INTO infringements (
  customer_base,
  vrn,
  offence_type,
  offence_date,
  offence_location,
  date_received,
  assigned_driver,
  status,
  fine_amount,
  reference_number,
  issuing_state,
  issuing_authority,
  corporate_fine_amount,
  bpay_biller_code,
  bpay_reference
) VALUES (
  'GigCar',
  'GIG001',
  'Speeding',
  '2026-01-15',
  'Pacific Highway, NSW',
  '2026-01-20',
  'Sarah Mitchell',
  'Pending Driver Nomination',
  320.00,
  'NSW-2026-045821',
  'NSW',
  'Revenue NSW',
  896.00,
  '192684',
  '4521 8796 3214 5678'
);

-- GigCar: Due soon red light camera
INSERT INTO infringements (
  customer_base,
  vrn,
  offence_type,
  offence_date,
  offence_location,
  date_received,
  assigned_driver,
  status,
  fine_amount,
  reference_number,
  issuing_state,
  issuing_authority,
  corporate_fine_amount,
  bpay_biller_code,
  bpay_reference
) VALUES (
  'GigCar',
  'GIG002',
  'Red Light Camera',
  '2026-02-18',
  'Bourke Street, Melbourne',
  '2026-02-22',
  'James Chen',
  'Pending Driver Nomination',
  496.00,
  'VIC-2026-098745',
  'VIC',
  'Fines Victoria',
  1488.00,
  '356789',
  '7845 2136 9874 5632'
);

-- GigCar: Safe parking fine
INSERT INTO infringements (
  customer_base,
  vrn,
  offence_type,
  offence_date,
  offence_location,
  date_received,
  assigned_driver,
  status,
  fine_amount,
  reference_number,
  issuing_state,
  issuing_authority,
  corporate_fine_amount,
  bpay_biller_code,
  bpay_reference
) VALUES (
  'GigCar',
  'GIG003',
  'Parking',
  '2026-02-24',
  'Westfield Parking, Sydney',
  '2026-02-24',
  'Emma Davis',
  'Pending Driver Nomination',
  88.00,
  'WP-2026-123456',
  'NSW',
  'Wilson Parking',
  88.00,
  '754123',
  '1234 5678 9012 3456'
);

-- GigCar: New unassigned
INSERT INTO infringements (
  customer_base,
  vrn,
  offence_type,
  offence_date,
  offence_location,
  date_received,
  status,
  fine_amount,
  reference_number,
  issuing_state,
  issuing_authority,
  corporate_fine_amount,
  bpay_biller_code,
  bpay_reference
) VALUES (
  'GigCar',
  'GIG004',
  'Mobile Phone Use',
  '2026-02-25',
  'Parramatta Road, NSW',
  '2026-02-25',
  'New',
  362.00,
  'NSW-2026-087456',
  'NSW',
  'Revenue NSW',
  1014.00,
  '192684',
  '8523 7419 6325 8741'
);

-- Fleetcar: Due soon speeding
INSERT INTO infringements (
  customer_base,
  vrn,
  offence_type,
  offence_date,
  offence_location,
  date_received,
  assigned_driver,
  status,
  fine_amount,
  reference_number,
  issuing_state,
  issuing_authority,
  corporate_fine_amount,
  bpay_biller_code,
  bpay_reference
) VALUES (
  'Fleetcar',
  'FLC001',
  'Speeding',
  '2026-02-16',
  'Eastern Freeway, Melbourne',
  '2026-02-21',
  'Michael Wong',
  'Pending Driver Nomination',
  289.00,
  'VIC-2026-156789',
  'VIC',
  'Fines Victoria',
  867.00,
  '356789',
  '9512 7536 8421 9637'
);

-- Fleetcar: Safe parking
INSERT INTO infringements (
  customer_base,
  vrn,
  offence_type,
  offence_date,
  offence_location,
  date_received,
  assigned_driver,
  status,
  fine_amount,
  reference_number,
  issuing_state,
  issuing_authority,
  corporate_fine_amount,
  bpay_biller_code,
  bpay_reference
) VALUES (
  'Fleetcar',
  'FLC002',
  'Parking',
  '2026-02-23',
  'Queen Street Mall, Brisbane',
  '2026-02-24',
  'Lisa Thompson',
  'Pending Driver Nomination',
  133.00,
  'QLD-2026-789456',
  'QLD',
  'Brisbane City Council',
  133.00,
  '951753',
  '3698 5274 1963 8527'
);

-- Fleetcar: Overdue toll
INSERT INTO infringements (
  customer_base,
  vrn,
  offence_type,
  offence_date,
  offence_location,
  date_received,
  assigned_driver,
  status,
  fine_amount,
  reference_number,
  issuing_state,
  issuing_authority,
  corporate_fine_amount,
  bpay_biller_code,
  bpay_reference
) VALUES (
  'Fleetcar',
  'FLC003',
  'Toll Violation',
  '2026-01-10',
  'M7 Motorway, Sydney',
  '2026-01-18',
  'Robert Kim',
  'Pending Driver Nomination',
  194.00,
  'LINKT-2026-741852',
  'NSW',
  'Linkt',
  194.00,
  '147258',
  '7418 5296 3741 8529'
);

-- Yonder: Safe red light
INSERT INTO infringements (
  customer_base,
  vrn,
  offence_type,
  offence_date,
  offence_location,
  date_received,
  assigned_driver,
  status,
  fine_amount,
  reference_number,
  issuing_state,
  issuing_authority,
  corporate_fine_amount,
  bpay_biller_code,
  bpay_reference
) VALUES (
  'Yonder',
  'YON001',
  'Red Light Camera',
  '2026-02-23',
  'George Street, Sydney',
  '2026-02-24',
  'Alex Rivera',
  'Pending Driver Nomination',
  469.00,
  'NSW-2026-963852',
  'NSW',
  'Revenue NSW',
  1313.00,
  '192684',
  '8529 6374 1852 9637'
);

-- Yonder: Due soon speeding
INSERT INTO infringements (
  customer_base,
  vrn,
  offence_type,
  offence_date,
  offence_location,
  date_received,
  assigned_driver,
  status,
  fine_amount,
  reference_number,
  issuing_state,
  issuing_authority,
  corporate_fine_amount,
  bpay_biller_code,
  bpay_reference
) VALUES (
  'Yonder',
  'YON002',
  'Speeding',
  '2026-02-17',
  'Nepean Highway, Melbourne',
  '2026-02-21',
  'Sophie Anderson',
  'Pending Driver Nomination',
  322.00,
  'VIC-2026-852963',
  'VIC',
  'Fines Victoria',
  966.00,
  '356789',
  '6374 1852 9637 4185'
);

-- Yonder: Overdue parking
INSERT INTO infringements (
  customer_base,
  vrn,
  offence_type,
  offence_date,
  offence_location,
  date_received,
  assigned_driver,
  status,
  fine_amount,
  reference_number,
  issuing_state,
  issuing_authority,
  corporate_fine_amount,
  bpay_biller_code,
  bpay_reference
) VALUES (
  'Yonder',
  'YON003',
  'Parking',
  '2026-01-12',
  'Flinders Street, Melbourne',
  '2026-01-19',
  'Daniel Park',
  'Pending Driver Nomination',
  105.00,
  'VIC-2026-741963',
  'VIC',
  'Melbourne City Council',
  105.00,
  '753951',
  '9637 4185 2963 7418'
);
