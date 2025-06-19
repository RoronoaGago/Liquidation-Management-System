-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 17, 2025 at 04:56 PM
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
-- Table structure for table `api_listofpriority`
--

-- CREATE TABLE `api_listofpriority` (
--   `LOPID` int(11) NOT NULL,
--   `expenseTitle` varchar(255) NOT NULL
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `api_listofpriority`
--

INSERT INTO `api_listofpriority` (`LOPID`, `expenseTitle`) VALUES
(1, 'Travelling Expense'),
(2, 'Internet Expense (Pocket Wifi)'),
(3, 'Training Expense'),
(4, 'Office/Other Supplies Expense (DBM)'),
(5, 'Training Expenses (GAD/INSET)'),
(6, 'Office/Other Supplies Expense (Outside DBM)'),
(7, 'Training Expenses (LAC Session)'),
(8, 'Fidelity Bond Premium'),
(9, 'Drugs and Medicines / Medical / Dental / Lab Supplies'),
(10, 'Electricity Expense'),
(11, 'Water Expense'),
(12, 'Mobile Expense'),
(13, 'Internet Expense (DSL/Globe)'),
(14, 'Security Services (Tanod/Non-Agency)'),
(15, 'Food Supplies Expense (Feeding)'),
(16, 'Security Services (Agency)'),
(17, 'Labor and Wages'),
(18, 'Janitorial Services (Non-Agency)'),
(19, 'Representation Expense'),
(20, 'Fuel, Oil, and Lubricants Expense'),
(21, 'Repair and Maintenance - B/SB/OE/FF/MV/OPPE'),
(22, 'Transportation and Delivery Expense (Hauling)');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `api_listofpriority`
--
ALTER TABLE `api_listofpriority`
  ADD PRIMARY KEY (`LOPID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `api_listofpriority`
--
ALTER TABLE `api_listofpriority`
  MODIFY `LOPID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
