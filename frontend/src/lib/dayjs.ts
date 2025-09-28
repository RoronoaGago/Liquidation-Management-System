import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

// Extend dayjs with plugins
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

// Set timezone to match backend (Asia/Manila)
dayjs.tz.setDefault('Asia/Manila');

export default dayjs;
