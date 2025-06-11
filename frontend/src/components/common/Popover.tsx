import * as React from "react";
import { usePopover, DismissButton, Overlay } from "@react-aria/overlays";

export function Popover(props: any) {
  let ref = React.useRef(null);
  let { state, children } = props;

  let { popoverProps, underlayProps } = usePopover(
    {
      ...props,
      popoverRef: ref,
    },
    state
  );

  return (
    <Overlay>
      <div {...underlayProps} className="fixed inset-0" />
      <div
        {...popoverProps}
        ref={ref}
        className="flex absolute bg-white border border-gray-300 rounded-md shadow-lg mt-2 p-8 z-10 dark:border-gray-700 dark:bg-gray-900"
      >
        <DismissButton onDismiss={state.close} />
        {children}
        <DismissButton onDismiss={state.close} />
      </div>
    </Overlay>
  );
}
