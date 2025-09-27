-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 27, 2025 at 10:22 AM
-- Server version: 11.7.2-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_liquidation_management_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `api_liquidationmanagement`
--

CREATE TABLE `api_liquidationmanagement` (
  `LiquidationID` varchar(10) NOT NULL,
  `refund` decimal(12,2) DEFAULT NULL,
  `rejection_comment` longtext DEFAULT NULL,
  `status` varchar(30) NOT NULL,
  `reviewed_at_district` datetime(6) DEFAULT NULL,
  `reviewed_at_liquidator` datetime(6) DEFAULT NULL,
  `reviewed_at_division` datetime(6) DEFAULT NULL,
  `reviewed_at_accountant` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `date_submitted` datetime(6) DEFAULT NULL,
  `date_districtApproved` date DEFAULT NULL,
  `date_liquidatorApproved` date DEFAULT NULL,
  `date_liquidated` datetime(6) DEFAULT NULL,
  `remaining_days` int(11) DEFAULT NULL,
  `reviewed_by_accountant_id` varchar(10) DEFAULT NULL,
  `reviewed_by_district_id` varchar(10) DEFAULT NULL,
  `reviewed_by_division_id` varchar(10) DEFAULT NULL,
  `reviewed_by_liquidator_id` varchar(10) DEFAULT NULL,
  `request_id` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `api_liquidationmanagement`
--

INSERT INTO `api_liquidationmanagement` (`LiquidationID`, `refund`, `rejection_comment`, `status`, `reviewed_at_district`, `reviewed_at_liquidator`, `reviewed_at_division`, `reviewed_at_accountant`, `created_at`, `date_submitted`, `date_districtApproved`, `date_liquidatorApproved`, `date_liquidated`, `remaining_days`, `reviewed_by_accountant_id`, `reviewed_by_district_id`, `reviewed_by_division_id`, `reviewed_by_liquidator_id`, `request_id`) VALUES
('LQN-I227JG', NULL, NULL, 'approved_district', '2025-09-27 07:55:04.698275', NULL, NULL, NULL, '2025-09-27 07:37:03.442214', '2025-09-27 07:38:35.012255', '2025-09-27', NULL, NULL, 29, NULL, '2509170005', NULL, NULL, 'REQ-3ZHRIX'),
('LQN-VF227H', NULL, NULL, 'under_review_district', NULL, NULL, NULL, NULL, '2025-09-27 08:17:40.872141', '2025-09-27 08:20:00.363868', NULL, NULL, NULL, 29, NULL, NULL, NULL, NULL, 'REQ-H1FI5M');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `api_liquidationmanagement`
--
ALTER TABLE `api_liquidationmanagement`
  ADD PRIMARY KEY (`LiquidationID`),
  ADD UNIQUE KEY `request_id` (`request_id`),
  ADD KEY `api_liquidationmanag_reviewed_by_accounta_844f3ace_fk_api_user_` (`reviewed_by_accountant_id`),
  ADD KEY `api_liquidationmanag_reviewed_by_district_cfb7aeb7_fk_api_user_` (`reviewed_by_district_id`),
  ADD KEY `api_liquidationmanag_reviewed_by_division_44a6e086_fk_api_user_` (`reviewed_by_division_id`),
  ADD KEY `api_liquidationmanag_reviewed_by_liquidat_b684e775_fk_api_user_` (`reviewed_by_liquidator_id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `api_liquidationmanagement`
--
ALTER TABLE `api_liquidationmanagement`
  ADD CONSTRAINT `api_liquidationmanag_request_id_373e6dcb_fk_api_reque` FOREIGN KEY (`request_id`) REFERENCES `api_requestmanagement` (`request_id`),
  ADD CONSTRAINT `api_liquidationmanag_reviewed_by_accounta_844f3ace_fk_api_user_` FOREIGN KEY (`reviewed_by_accountant_id`) REFERENCES `api_user` (`id`),
  ADD CONSTRAINT `api_liquidationmanag_reviewed_by_district_cfb7aeb7_fk_api_user_` FOREIGN KEY (`reviewed_by_district_id`) REFERENCES `api_user` (`id`),
  ADD CONSTRAINT `api_liquidationmanag_reviewed_by_division_44a6e086_fk_api_user_` FOREIGN KEY (`reviewed_by_division_id`) REFERENCES `api_user` (`id`),
  ADD CONSTRAINT `api_liquidationmanag_reviewed_by_liquidat_b684e775_fk_api_user_` FOREIGN KEY (`reviewed_by_liquidator_id`) REFERENCES `api_user` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
