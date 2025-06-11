import { useRef } from "react";
import { useButton, useFocusRing, mergeProps } from "react-aria";

export function CalendarButton(props: any) {
  let ref = useRef(null);
  let { buttonProps } = useButton(props, ref);
  let { focusProps, isFocusVisible } = useFocusRing();
  return (
    <button
      {...mergeProps(buttonProps, focusProps)}
      ref={ref}
      className={`p-2 rounded-full ${props.isDisabled ? "text-gray-400" : ""} ${
        !props.isDisabled ? "hover:bg-violet-100 active:bg-violet-200" : ""
      } outline-none ${
        isFocusVisible ? "ring-2 ring-offset-2 ring-purple-600" : ""
      }`}
    >
      {props.children}
    </button>
  );
}

export function FieldButton(props: any) {
  let ref = useRef(null);
  let { buttonProps, isPressed } = useButton(props, ref);
  return (
    <button
      {...buttonProps}
      ref={ref}
      className={`px-2 -ml-px border transition-colors rounded-r-md group-focus-within:border-violet-600 group-focus-within:group-hover:border-violet-600 outline-none dark:bg-white/[0.03] dark:border-gray-700${
        isPressed || props.isPressed
          ? "bg-gray-200 border-gray-400 dark:border-gray-800"
          : "bg-gray-50 border-gray-300 group-hover:border-gray-400 dark:border-gray-700"
      }`}
    >
      {props.children}
    </button>
  );
}
