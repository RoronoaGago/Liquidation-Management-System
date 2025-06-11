import { useRef } from "react";
import { useDateRangePickerState } from "react-stately";
import { useDateRangePicker } from "react-aria";

import { CalendarIcon, ExclamationIcon } from "@heroicons/react/outline";
import { DateField } from "./DateField";
import { FieldButton } from "./DateButton";
import { Popover } from "./Popover";
import { RangeCalendar } from "./RangeCalendar";
import { Dialog } from "./Dialog";

export function DateRangePicker(props: any) {
  let state = useDateRangePickerState(props);
  let ref = useRef(null);
  let {
    groupProps,
    labelProps,
    startFieldProps,
    endFieldProps,
    buttonProps,
    dialogProps,
    calendarProps
  } = useDateRangePicker(props, state, ref);
console.log(startFieldProps)
  return (
    <div className="relative inline-flex flex-row text-left gap-3 items-center">
      <span {...labelProps} className="text-sm text-gray-800 dark:text-white/90">
        {props.label}
      </span>
      <div {...groupProps} ref={ref} className="flex group">
        <div className="flex border group-hover:border-gray-400 transition-colors rounded-l-md pr-4 group-focus-within:border-brand-600 group-focus-within:group-hover:border-brand-600 p-1 relative dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800">
          <DateField {...startFieldProps} />
          <span aria-hidden="true" className="px-1 text-gray-800 dark:text-white/90">
            –
          </span>
          <DateField {...endFieldProps}/>
          {state.isInvalid && (
            <ExclamationIcon className="w-6 h-6 text-red-500 absolute right-1" />
          )}
        </div>
        <FieldButton {...buttonProps} isPressed={state.isOpen}>
          <CalendarIcon className="w-5 h-5 text-gray-700 group-focus-within:text-brand-500" />
        </FieldButton>
      </div>
      {state.isOpen && (
        <Popover triggerRef={ref} state={state} placement="bottom start">
          <Dialog {...dialogProps}>
            <RangeCalendar {...calendarProps} />
          </Dialog>
        </Popover>
      )}
    </div>
  );
}