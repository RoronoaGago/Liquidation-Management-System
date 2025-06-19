-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 17, 2025 at 04:57 PM
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
-- Table structure for table `api_listofpriority_requirement`
--

CREATE TABLE `api_listofpriority_requirement` (
  `id` bigint(20) NOT NULL,
  `listofpriority_id` int(11) NOT NULL,
  `requirement_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `api_listofpriority_requirement`
--

INSERT INTO `api_listofpriority_requirement` (`id`, `listofpriority_id`, `requirement_id`) VALUES
(1, 1, 1),
(2, 1, 2),
(3, 1, 3),
(4, 1, 4),
(5, 1, 5),
(6, 1, 6),
(7, 1, 7),
(9, 2, 1),
(8, 2, 8),
(10, 2, 26),
(11, 2, 27),
(12, 3, 1),
(13, 3, 3),
(14, 3, 4),
(15, 3, 5),
(16, 3, 6),
(17, 3, 7),
(18, 3, 11),
(19, 4, 1),
(20, 4, 11),
(21, 4, 13),
(22, 4, 14),
(23, 4, 15),
(24, 4, 16),
(25, 4, 17),
(26, 4, 18),
(27, 4, 19),
(28, 5, 1),
(34, 5, 9),
(35, 5, 10),
(36, 5, 16),
(37, 5, 19),
(38, 5, 20),
(39, 5, 21),
(40, 5, 22),
(41, 5, 23),
(42, 5, 24),
(43, 5, 29),
(29, 5, 33),
(30, 5, 34),
(33, 5, 35),
(31, 5, 36),
(32, 5, 37),
(44, 6, 1),
(45, 6, 9),
(46, 6, 10),
(47, 6, 13),
(48, 6, 15),
(49, 6, 16),
(50, 6, 17),
(51, 6, 18),
(52, 6, 19),
(53, 6, 20),
(54, 6, 21),
(55, 6, 22),
(56, 6, 23),
(57, 6, 24),
(58, 6, 25),
(59, 6, 28),
(61, 7, 1),
(65, 7, 7),
(66, 7, 9),
(67, 7, 16),
(68, 7, 29),
(60, 7, 32),
(62, 7, 36),
(63, 7, 37),
(64, 7, 38),
(69, 8, 41),
(70, 8, 42),
(71, 8, 43),
(72, 8, 44),
(73, 9, 1),
(74, 9, 9),
(75, 9, 10),
(77, 9, 15),
(78, 9, 16),
(79, 9, 19),
(80, 9, 20),
(81, 9, 21),
(82, 9, 22),
(83, 9, 23),
(84, 9, 24),
(85, 9, 25),
(76, 9, 45),
(86, 10, 1),
(87, 10, 8),
(88, 10, 10),
(89, 10, 11),
(90, 10, 12),
(91, 11, 1),
(92, 11, 8),
(93, 11, 10),
(94, 11, 11),
(95, 11, 12),
(96, 12, 1),
(97, 12, 8),
(98, 12, 11),
(102, 12, 24),
(103, 12, 26),
(99, 12, 49),
(100, 12, 50),
(101, 12, 51),
(104, 13, 1),
(105, 13, 9),
(106, 13, 10),
(107, 13, 11),
(108, 13, 12),
(110, 14, 1),
(113, 14, 29),
(114, 14, 30),
(115, 14, 31),
(109, 14, 32),
(111, 14, 47),
(112, 14, 48),
(116, 15, 1),
(119, 15, 9),
(120, 15, 10),
(123, 15, 16),
(124, 15, 19),
(125, 15, 20),
(126, 15, 21),
(127, 15, 22),
(128, 15, 23),
(129, 15, 24),
(130, 15, 25),
(117, 15, 35),
(118, 15, 37),
(121, 15, 43),
(122, 15, 44),
(131, 15, 52),
(132, 15, 53),
(134, 16, 1),
(135, 16, 8),
(136, 16, 10),
(137, 16, 11),
(138, 16, 12),
(139, 16, 21),
(140, 16, 22),
(141, 16, 23),
(142, 16, 30),
(143, 16, 31),
(133, 16, 32),
(144, 17, 1),
(147, 17, 9),
(149, 17, 16),
(150, 17, 19),
(154, 17, 22),
(151, 17, 23),
(155, 17, 29),
(145, 17, 39),
(146, 17, 40),
(148, 17, 47),
(153, 17, 54),
(152, 17, 55),
(157, 18, 1),
(158, 18, 29),
(159, 18, 30),
(160, 18, 31),
(156, 18, 32),
(161, 19, 1),
(166, 19, 7),
(167, 19, 9),
(168, 19, 16),
(169, 19, 22),
(170, 19, 23),
(171, 19, 29),
(162, 19, 33),
(163, 19, 36),
(164, 19, 37),
(165, 19, 38),
(172, 20, 1),
(173, 20, 9),
(174, 20, 10),
(175, 20, 16),
(176, 20, 19),
(177, 20, 20),
(178, 20, 21),
(179, 20, 22),
(180, 20, 23),
(181, 20, 24),
(182, 20, 25),
(183, 20, 52),
(184, 21, 1),
(187, 21, 9),
(188, 21, 10),
(189, 21, 15),
(190, 21, 16),
(191, 21, 19),
(192, 21, 20),
(193, 21, 21),
(194, 21, 22),
(195, 21, 23),
(196, 21, 24),
(197, 21, 25),
(185, 21, 39),
(186, 21, 40),
(199, 22, 1),
(202, 22, 16),
(203, 22, 29),
(198, 22, 32),
(200, 22, 41),
(201, 22, 42);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `api_listofpriority_requirement`
--
ALTER TABLE `api_listofpriority_requirement`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `api_listofpriority_requi_listofpriority_id_requir_c84a4c8f_uniq` (`listofpriority_id`,`requirement_id`),
  ADD KEY `api_listofpriority_r_requirement_id_76f428d0_fk_api_requi` (`requirement_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `api_listofpriority_requirement`
--
ALTER TABLE `api_listofpriority_requirement`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=204;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `api_listofpriority_requirement`
--
ALTER TABLE `api_listofpriority_requirement`
  ADD CONSTRAINT `api_listofpriority_r_listofpriority_id_ad06c227_fk_api_listo` FOREIGN KEY (`listofpriority_id`) REFERENCES `api_listofpriority` (`LOPID`),
  ADD CONSTRAINT `api_listofpriority_r_requirement_id_76f428d0_fk_api_requi` FOREIGN KEY (`requirement_id`) REFERENCES `api_requirement` (`requirementID`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
