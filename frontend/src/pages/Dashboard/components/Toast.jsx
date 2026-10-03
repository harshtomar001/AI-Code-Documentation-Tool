import { useEffect, useState } from "react";

export default function Toast({ message, darkMode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }

    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, [message]);

  if (!message || !visible) {
    return null;
  }

  return (
    <div
      className={`
        fixed
        bottom-[25px]
        right-[25px]
        z-[9999]
        rounded-[7px]
        border
        px-[18px]
        py-[13px]
        text-white
        shadow-lg
        ${
          darkMode
            ? "border-[#292d30] bg-[#ed0d0d]"
            : "border-[#dfe2e5] bg-[#f50808]"
        }
      `}
    >
      ✓ {message}
    </div>
  );
}