import { useCallback, useEffect, useRef, useState } from "react";

const ExpandableTruncatedText = ({
  value,
  className = "",
  centered = false,
  fallback = "N/A",
  title: titleProp,
}) => {
  const displayValue = value ?? fallback;
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef(null);

  const checkOverflow = useCallback(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    setIsOverflowing(el.scrollWidth > el.clientWidth);
  }, [expanded]);

  useEffect(() => {
    setExpanded(false);
  }, [displayValue]);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(el);
    window.addEventListener("resize", checkOverflow);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", checkOverflow);
    };
  }, [displayValue, expanded, checkOverflow]);

  const layoutClass = centered ? "text-center" : "text-left";
  const overflowClass = expanded ? "whitespace-normal break-words" : "truncate";
  const isInteractive = isOverflowing || expanded;
  const title = titleProp ?? String(displayValue);

  if (isInteractive) {
    return (
      <button
        ref={textRef}
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={`min-w-0 w-full max-w-full ${layoutClass} ${overflowClass} ${className} cursor-pointer hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-brand`}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse value" : `Show full value: ${title}`}
        title={title}
      >
        {displayValue}
      </button>
    );
  }

  return (
    <p ref={textRef} className={`min-w-0 w-full max-w-full ${layoutClass} truncate ${className}`} title={title}>
      {displayValue}
    </p>
  );
};

export default ExpandableTruncatedText;
