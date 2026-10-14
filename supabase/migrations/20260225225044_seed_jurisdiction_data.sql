/*
  # Seed Jurisdiction and Financial Data for Existing Infringements

  ## Updates Made
  
  Populates jurisdiction and financial metadata for the two existing Fleetcar infringements:
  
  1. ABC123 (Northern Territory)
    - Issuing State: NT
    - Issuing Authority: Northern Territory Police
    - Corporate Fine: $1,458.00 (3x multiplier applied)
    - BPAY Details included for payment processing
  
  2. XYZ789 (New South Wales)
    - Issuing State: NSW
    - Issuing Authority: Revenue NSW
    - Corporate Fine: $896.00 (2.8x multiplier applied)
    - BPAY Details included for payment processing
  
  ## Important Notes
  - Corporate fines in Australia are typically 3-5x higher than individual fines
  - NT typically has higher multipliers than NSW
  - BPAY codes and references are essential for payment reconciliation
*/

-- Update ABC123 (NT) with jurisdiction and financial data
UPDATE infringements
SET 
  issuing_state = 'NT',
  issuing_authority = 'Northern Territory Police',
  corporate_fine_amount = 1458.00,
  bpay_biller_code = '258741',
  bpay_reference = '6547 8932 4516 8932'
WHERE vrn = 'ABC123' AND customer_base = 'Fleetcar';

-- Update XYZ789 (NSW) with jurisdiction and financial data
UPDATE infringements
SET 
  issuing_state = 'NSW',
  issuing_authority = 'Revenue NSW',
  corporate_fine_amount = 896.00,
  bpay_biller_code = '192684',
  bpay_reference = '3214 5678 9012 3456'
WHERE vrn = 'XYZ789' AND customer_base = 'Fleetcar';