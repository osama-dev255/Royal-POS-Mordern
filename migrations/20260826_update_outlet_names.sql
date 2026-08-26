-- Update outlet display names shown in the Delivery Note Preview "TO:" dropdown
-- (Business Templates > Delivery Note Preview > TO section)

UPDATE outlets
SET name = 'ABEID & HALIMA LTD (SHIMONI)',
    updated_at = NOW()
WHERE LOWER(TRIM(name)) = LOWER(TRIM('ABEID & HALIMA LTD'));

UPDATE outlets
SET name = 'KILANGO GROUP LTD (MSKITI MDOGO)',
    updated_at = NOW()
WHERE LOWER(TRIM(name)) = LOWER(TRIM('KILANGO GROUP LTD'));
