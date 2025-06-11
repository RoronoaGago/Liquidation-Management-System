import { useDialog } from "react-aria";
import React from "react";

export function Dialog({ title, children, ...props }: any) {
  let ref = React.useRef(null);
  let { dialogProps } = useDialog(props, ref);

  return (
    <div {...dialogProps} ref={ref} className="overflow-y-auto dark:border-gray-700">
      {children}
    </div>
  );
}
