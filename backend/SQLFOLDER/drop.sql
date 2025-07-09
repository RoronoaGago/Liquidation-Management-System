INSERT INTO `api_school` (`schoolId`, `schoolName`, `municipality`, `district`, `legislativeDistrict`, `is_active`) VALUES
('100801', 'Agoo East CES', 'AGOO', 'Agoo East', '2nd District', 1)

INSERT INTO `api_user` (`id`, `first_name`, `last_name`, `username`, `password`, `role`, `date_of_birth`, `email`, `phone_number`, `school_id`, `is_active`, `is_staff`, `is_superuser`, `date_joined`)
VALUES
('2406250001', 'Your', 'Name', 'admin', 'ad234', 'admin', '2003-09-19', 'jho.marifonta@example.com', '+9876543534', NULL, 1, 1, 1, NOW()),
('2406250002', 'Sally', 'Head', 'schoolhead', 'test123', 'school_head', '1990-01-01', 'school.head@example.com', '+1111111111', '100801', 1, 0, 0, NOW()),
('2406250003', 'Sam', 'Admin', 'schooladmin', 'test123', 'school_admin', '1991-02-02', 'school.admin@example.com', '+2222222222', '100801', 1, 0, 0, NOW()),
('2406250004', 'Daisy', 'District', 'districtadmin', 'test123', 'district_admin', '1992-03-03', 'district.admin@example.com', '+3333333333', NULL, 1, 0, 0, NOW()),
('2406250005', 'Sue', 'Superintendent', 'superintendent', 'test123', 'superintendent', '1993-04-04', 'superintendent@example.com', '+4444444444', NULL, 1, 0, 0, NOW()),
('2406250006', 'Liam', 'Liquidator', 'liquidator', 'test123', 'liquidator', '1994-05-05', 'liquidator@example.com', '+5555555555', NULL, 1, 0, 0, NOW()),
('2406250007', 'Anna', 'Accountant', 'accountant', 'test123', 'accountant', '1995-06-06', 'accountant@example.com', '+6666666666', NULL, 1, 0, 0, NOW());