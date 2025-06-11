export function Loading() {
  return (
    /* From Uiverse.io by yohohopizza */
    <div className="min-w-full flex justify-center items-center">

    <div className="flex flex-row gap-2">
      <div className="w-3 h-3 rounded-full bg-gray-400 animate-bounce"></div>
      <div className="w-3 h-3 rounded-full bg-gray-400 animate-bounce [animation-delay:-.3s]"></div>
      <div className="w-3 h-3 rounded-full bg-gray-400 animate-bounce [animation-delay:-.5s]"></div>
    </div>
    </div>
  );
}
