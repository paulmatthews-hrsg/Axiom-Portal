/*
  # Add Jurisdiction and Financial Data for Yonder Record

  ## Updates Made
  
  Populates jurisdiction and financial metadata for the Yonder DEF456 infringement:
  
  1. DEF456 (Northern Territory - Darwin)
    - Issuing State: NT
    - Issuing Authority: Darwin City Council
    - Corporate Fine: $150.00 (parking infringement)
    - BPAY Details included for payment processing
  
  ## Important Notes
  - Darwin City Council typically issues parking infringements
  - Lower fine amounts compared to police-issued speeding fines
  - BPAY codes and references are essential for payment reconciliation
*/

-- Update DEF456 (NT) with jurisdiction and financial data
UPDATE infringements
SET 
  issuing_state = 'NT',
  issuing_authority = 'Darwin City Council',
  corporate_fine_amount = 150.00,
  bpay_biller_code = '124587',
  bpay_reference = '9876 5432 1098 7654'
WHERE vrn = 'DEF456' AND customer_base = 'Yonder';
