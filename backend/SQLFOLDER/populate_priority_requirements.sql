-- SQL script to populate PriorityRequirement relationships
-- This script creates relationships between requirements and priorities based on categories

-- Clear existing relationships (optional - uncomment if needed)
-- DELETE FROM api_priorityrequirement;

-- Insert relationships for TRAVEL EXPENSE
INSERT INTO api_priorityrequirement (priority_id, requirement_id)
SELECT lop.LOPID, req.requirementID
FROM api_listofpriority lop, api_requirement req
WHERE lop.expenseTitle = 'TRAVELLING EXPENSE'
AND req.requirementTitle IN (
    'Approved Authority to Travel / Locator Slip',
    'Approved Certificate of Travel Completed',
    'Approved Itinerary of Travel',
    'Trip Ticket (for people transported)',
    'Tickets (if any)',
    'Certification of Official Business (OB) calls',
    'Original Copy of Certificate of Appearance (CA)',
    'Attendance',
    'Daily Time Record (DTR)',
    'Official Receipt (OR)',
    'Acknowledgement Receipt (AR)',
    'Authority to Claim (copy)',
    'Photocopy of valid ID / CTC',
    'Pictures',
    'Narrative Report',
    'Accomplishment Report',
    'Memorandum',
    'Certification: not recipient of sim card / other allowances for communication',
    'Request for Payment',
    'Disbursement Voucher (DV) / optional',
    'Disbursement Voucher (for tax withheld) / optional'
)
AND NOT EXISTS (
    SELECT 1 FROM api_priorityrequirement pr 
    WHERE pr.priority_id = lop.LOPID AND pr.requirement_id = req.requirementID
);

-- Insert relationships for TRAINING EXPENSE
INSERT INTO api_priorityrequirement (priority_id, requirement_id)
SELECT lop.LOPID, req.requirementID
FROM api_listofpriority lop, api_requirement req
WHERE lop.expenseTitle IN ('TRAINING EXPENSE', 'TRAINING EXPENSES (GAD / INSET)', 'TRAINING EXPENSES (LAC SESSION)')
AND req.requirementTitle IN (
    'Approved Activity Request Form',
    'Program',
    'Program / Training Matrix',
    'Attendance',
    'Daily Time Record (DTR)',
    'Official Receipt (OR)',
    'Acknowledgement Receipt (AR)',
    'Authority to Claim (copy)',
    'Photocopy of valid ID / CTC',
    'Pictures',
    'Pictures (Before - During - After)',
    'Narrative Report',
    'Accomplishment Report',
    'Memorandum',
    'Request for Payment',
    'Disbursement Voucher (DV) / optional',
    'Disbursement Voucher (for tax withheld) / optional',
    'GAD Plan and Budget',
    'Certification: not recipient of sim card / other allowances for communication'
)
AND NOT EXISTS (
    SELECT 1 FROM api_priorityrequirement pr 
    WHERE pr.priority_id = lop.LOPID AND pr.requirement_id = req.requirementID
);

-- Insert relationships for OFFICE / OTHER SUPPLIES EXPENSE
INSERT INTO api_priorityrequirement (priority_id, requirement_id)
SELECT lop.LOPID, req.requirementID
FROM api_listofpriority lop, api_requirement req
WHERE lop.expenseTitle IN ('OFFICE / OTHER SUPPLIES EXPENSE (DBM)', 'OFFICE / OTHER SUPPLIES EXPENSE (OUTSIDE DBM)')
AND req.requirementTitle IN (
    'Purchase Request (PR)',
    'Purchase Order (PO)',
    'Delivery Receipt (DR) / Charge Invoice (CI)',
    'Sales Invoice (SI)',
    'Inspection and Acceptance Report (IAR)',
    'Official Receipt (OR)',
    'Acknowledgement Receipt (AR)',
    'Authority to Claim (copy)',
    'Photocopy of valid ID / CTC',
    'Pictures',
    'Proof of receipt of items (signed by authorized recipients)',
    'Request for Payment',
    'Disbursement Voucher (DV) / optional',
    'Disbursement Voucher (for tax withheld) / optional',
    'Agency Procurement Request (APR)',
    'Abstract of Quotation (AOQ)',
    'Request for Quotation (RFQ)',
    'BAC Resolution',
    'PhilGEPS Certification / Registration',
    'Certification of Stock Availability and Price Quotation',
    'Certification of Non-Availability of Stocks',
    'Inventory Custodian Slip (if applicable)'
)
AND NOT EXISTS (
    SELECT 1 FROM api_priorityrequirement pr 
    WHERE pr.priority_id = lop.LOPID AND pr.requirement_id = req.requirementID
);

-- Insert relationships for UTILITIES EXPENSES
INSERT INTO api_priorityrequirement (priority_id, requirement_id)
SELECT lop.LOPID, req.requirementID
FROM api_listofpriority lop, api_requirement req
WHERE lop.expenseTitle IN ('ELECTRICITY EXPENSE', 'WATER EXPENSE')
AND req.requirementTitle IN (
    'Official Receipt (OR)',
    'Acknowledgement Receipt (AR)',
    'Authority to Claim (copy)',
    'Photocopy of valid ID / CTC',
    'Request for Payment',
    'Disbursement Voucher (DV) / optional',
    'Disbursement Voucher (for tax withheld) / optional',
    'Statement of Account (SOA)',
    'Collection Receipt (CR)'
)
AND NOT EXISTS (
    SELECT 1 FROM api_priorityrequirement pr 
    WHERE pr.priority_id = lop.LOPID AND pr.requirement_id = req.requirementID
);

-- Insert relationships for COMMUNICATION EXPENSES
INSERT INTO api_priorityrequirement (priority_id, requirement_id)
SELECT lop.LOPID, req.requirementID
FROM api_listofpriority lop, api_requirement req
WHERE lop.expenseTitle IN ('INTERNET EXPENSE (DSL / GLOBE)', 'INTERNET EXPENSE (POCKET WIFI)', 'MOBILE EXPENSE')
AND req.requirementTitle IN (
    'Official Receipt (OR)',
    'Acknowledgement Receipt (AR)',
    'Authority to Claim (copy)',
    'Photocopy of valid ID / CTC',
    'Request for Payment',
    'Disbursement Voucher (DV) / optional',
    'Disbursement Voucher (for tax withheld) / optional',
    'Statement of Account (SOA)',
    'Collection Receipt (CR)',
    'Certification: not recipient of sim card / other allowances for communication'
)
AND NOT EXISTS (
    SELECT 1 FROM api_priorityrequirement pr 
    WHERE pr.priority_id = lop.LOPID AND pr.requirement_id = req.requirementID
);

-- Insert relationships for SECURITY SERVICES
INSERT INTO api_priorityrequirement (priority_id, requirement_id)
SELECT lop.LOPID, req.requirementID
FROM api_listofpriority lop, api_requirement req
WHERE lop.expenseTitle IN ('SECURITY SERVICES (TANOD / NON-AGENCY)', 'SECURITY SERVICES (AGENCY)')
AND req.requirementTitle IN (
    'Contract of Service / MOA',
    'Official Receipt (OR)',
    'Acknowledgement Receipt (AR)',
    'Authority to Claim (copy)',
    'Photocopy of valid ID / CTC',
    'Request for Payment',
    'Disbursement Voucher (DV) / optional',
    'Disbursement Voucher (for tax withheld) / optional',
    'Confirmation of Bond',
    'List of Bondable Official',
    'Permit to Conduct / Approved Request'
)
AND NOT EXISTS (
    SELECT 1 FROM api_priorityrequirement pr 
    WHERE pr.priority_id = lop.LOPID AND pr.requirement_id = req.requirementID
);

-- Insert relationships for JANITORIAL SERVICES
INSERT INTO api_priorityrequirement (priority_id, requirement_id)
SELECT lop.LOPID, req.requirementID
FROM api_listofpriority lop, api_requirement req
WHERE lop.expenseTitle = 'JANITORIAL SERVICES (NON-AGENCY)'
AND req.requirementTitle IN (
    'Contract of Service / MOA',
    'Official Receipt (OR)',
    'Acknowledgement Receipt (AR)',
    'Authority to Claim (copy)',
    'Photocopy of valid ID / CTC',
    'Request for Payment',
    'Disbursement Voucher (DV) / optional',
    'Disbursement Voucher (for tax withheld) / optional',
    'Confirmation of Bond',
    'List of Bondable Official',
    'Permit to Conduct / Approved Request'
)
AND NOT EXISTS (
    SELECT 1 FROM api_priorityrequirement pr 
    WHERE pr.priority_id = lop.LOPID AND pr.requirement_id = req.requirementID
);

-- Insert relationships for REPAIR AND MAINTENANCE
INSERT INTO api_priorityrequirement (priority_id, requirement_id)
SELECT lop.LOPID, req.requirementID
FROM api_listofpriority lop, api_requirement req
WHERE lop.expenseTitle = 'REPAIR AND MAINTENANCE - B/SB/OE/FF/MV/OPPE'
AND req.requirementTitle IN (
    'Program of Works / Job Order',
    'Pre-Repair Inspection Report',
    'Official Receipt (OR)',
    'Acknowledgement Receipt (AR)',
    'Authority to Claim (copy)',
    'Photocopy of valid ID / CTC',
    'Pictures',
    'Pictures (Before - During - After)',
    'Request for Payment',
    'Disbursement Voucher (DV) / optional',
    'Disbursement Voucher (for tax withheld) / optional',
    'Contract of Service / MOA'
)
AND NOT EXISTS (
    SELECT 1 FROM api_priorityrequirement pr 
    WHERE pr.priority_id = lop.LOPID AND pr.requirement_id = req.requirementID
);

-- Insert relationships for FIDELITY BOND PREMIUM
INSERT INTO api_priorityrequirement (priority_id, requirement_id)
SELECT lop.LOPID, req.requirementID
FROM api_listofpriority lop, api_requirement req
WHERE lop.expenseTitle = 'FIDELITY BOND PREMIUM'
AND req.requirementTitle IN (
    'Official Receipt (OR)',
    'Acknowledgement Receipt (AR)',
    'Authority to Claim (copy)',
    'Photocopy of valid ID / CTC',
    'Request for Payment',
    'Disbursement Voucher (DV) / optional',
    'Disbursement Voucher (for tax withheld) / optional',
    'BIR Forms 2306 / 2307',
    'Confirmation of Bond',
    'List of Bondable Official'
)
AND NOT EXISTS (
    SELECT 1 FROM api_priorityrequirement pr 
    WHERE pr.priority_id = lop.LOPID AND pr.requirement_id = req.requirementID
);

-- Insert relationships for LABOR AND WAGES
INSERT INTO api_priorityrequirement (priority_id, requirement_id)
SELECT lop.LOPID, req.requirementID
FROM api_listofpriority lop, api_requirement req
WHERE lop.expenseTitle = 'LABOR AND WAGES'
AND req.requirementTitle IN (
    'Payroll (multiple laborer)',
    'Payroll (multiple recipient)',
    'Payment Slip',
    'Official Receipt (OR)',
    'Acknowledgement Receipt (AR)',
    'Authority to Claim (copy)',
    'Photocopy of valid ID / CTC',
    'Signed list of recipients',
    'Request for Payment',
    'Disbursement Voucher (DV) / optional',
    'Disbursement Voucher (for tax withheld) / optional',
    'Daily Time Record (DTR)',
    'Attendance'
)
AND NOT EXISTS (
    SELECT 1 FROM api_priorityrequirement pr 
    WHERE pr.priority_id = lop.LOPID AND pr.requirement_id = req.requirementID
);

-- Insert relationships for OTHER MAINTENANCE EXPENSES
INSERT INTO api_priorityrequirement (priority_id, requirement_id)
SELECT lop.LOPID, req.requirementID
FROM api_listofpriority lop, api_requirement req
WHERE lop.expenseTitle IN ('REPRESENTATION EXPENSE', 'FUEL, OIL, AND LUBRICANTS EXPENSE', 'TRANSPORTATION AND DELIVERY EXPENSE (HAULING)', 'DRUGS AND MEDICINES / MEDICAL / DENTAL / LAB SUPPLIES', 'FOOD SUPPLIES EXPENSE (FEEDING)')
AND req.requirementTitle IN (
    'Official Receipt (OR)',
    'Acknowledgement Receipt (AR)',
    'Authority to Claim (copy)',
    'Photocopy of valid ID / CTC',
    'Request for Payment',
    'Disbursement Voucher (DV) / optional',
    'Disbursement Voucher (for tax withheld) / optional',
    'Pictures',
    'Narrative Report',
    'Accomplishment Report',
    'Memorandum',
    'Daily Menu of food to be served',
    'Menu of Food / Snacks',
    'Detailed Meal Plan',
    'Program',
    'Attendance',
    'Daily Time Record (DTR)',
    'Signed list of recipients',
    'Proof of receipt of items (signed by authorized recipients)',
    'SBFP Form 1',
    'SBFP Form 4',
    'Photocopy of check issued',
    'COA Circ1 - COENRR/ Memorandum',
    'GAD Plan and Budget'
)
AND NOT EXISTS (
    SELECT 1 FROM api_priorityrequirement pr 
    WHERE pr.priority_id = lop.LOPID AND pr.requirement_id = req.requirementID
);

-- Show summary
SELECT 
    'Summary' as info,
    COUNT(*) as total_relationships_created
FROM api_priorityrequirement;
