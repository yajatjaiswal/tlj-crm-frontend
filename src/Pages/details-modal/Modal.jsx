import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const Modal = ({
  isOpen,
  onClose,
  children,
  title,
  showTitle,
  size = "large",
  zIndex = 50,
  compactHeader = false,
  headerActions = null,
  hideBackdrop = false,
  titleAddon = null,
  titleClassName = "",
}) => {
  const isBrowser = typeof document !== "undefined";
  const [show, setShow] = useState(false);
  const portalNode = useMemo(() => {
    if (!isBrowser) return null;
    const node = document.createElement("div");
    node.setAttribute("data-portal-modal", "true");
    return node;
  }, [isBrowser]);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!portalNode || !isBrowser) return undefined;
    document.body.appendChild(portalNode);
    return () => {
      document.body.removeChild(portalNode);
    };
  }, [portalNode, isBrowser]);

  if (!portalNode) return null;
  if (!isOpen && !show) return null;

  // Size configurations
  const sizeClasses = {
    small: "sm:w-[90%] md:w-[500px] lg:w-[550px] h-auto max-h-[85vh]",
    medium: "sm:w-[90%] md:w-[700px] lg:w-[750px] h-auto max-h-[85vh]",
    large: "sm:w-[95%] md:w-[90%] lg:w-[85%] xl:w-[80rem] h-[90vh] sm:h-[85vh] md:h-[80vh]",
    xlarge: "sm:w-[96%] md:w-[94%] lg:w-[92%] xl:w-[92rem] 2xl:w-[98rem] h-[92vh] sm:h-[90vh] md:h-[88vh]",
    full: "w-screen h-screen max-h-screen",
  };

  const sizeClass = sizeClasses[size] || sizeClasses.large;
  const isFullSize = size === "full";

  return createPortal(
    <div className={`fixed inset-0 overflow-y-auto`} style={{ zIndex }}>
      {!hideBackdrop && (
        <div
          className={`fixed inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
        />
      )}

      <div
        className={`flex ${
          isFullSize ? "min-h-screen items-stretch justify-stretch p-0" : "min-h-[95vh] items-center justify-center p-4"
        }`}
      >
        <div
          className={`relative flex w-full flex-col bg-white
          transition-all duration-300 ease-out
          ${sizeClass}
          ${isFullSize ? "rounded-none shadow-none" : "rounded-lg shadow-xl"}
          ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <div
            className={`flex items-center justify-between border-b border-gray-200 px-3 sm:px-4 md:px-5 ${
              compactHeader ? "py-2 sm:py-2.5" : "py-3 sm:py-4"
            }`}
          >
            {title.length > 0 && (
              <div className="flex min-w-0 items-center gap-2 pr-2">
                <h2
                  className={`font-semibold text-gray-900 truncate ${
                    compactHeader ? "text-base sm:text-lg" : "text-lg sm:text-xl"
                  } ${titleClassName}`}
                >
                  {title}
                </h2>
                {titleAddon}
              </div>
            )}
            <div className="ml-auto flex items-center gap-1">
              {headerActions}
              <button
                onClick={onClose}
                className={`rounded-full transition-colors cursor-pointer ${
                  compactHeader ? "p-1 hover:bg-gray-100" : "p-1 hover:bg-gray-100"
                }`}
                aria-label="Close modal"
              >
                <X
                  className={`text-gray-500 ${
                    compactHeader ? "h-4 w-4 sm:h-5 sm:w-5" : "h-5 w-5 sm:h-6 sm:w-6"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2">{children}</div>
        </div>
      </div>
    </div>,
    portalNode
  );
}

export default Modal;
