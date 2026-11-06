import React, { useEffect, useRef } from "react";

/**
 * Reusable dropdown menu component with click-outside functionality
 * @param {boolean} isOpen - Whether the dropdown is open
 * @param {function} onClose - Callback to close the dropdown
 * @param {string} position - Position classes (e.g., "absolute right-5 mt-48")
 * @param {Array} items - Array of menu items with { label, icon: IconComponent, onClick, className, disabled }
 * @param {string} className - Additional classes for the dropdown container
 */
const UserMenuDropdown = ({
  isOpen,
  onClose,
  position = "absolute right-5 mt-48",
  items = [],
  className = "",
}) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        isOpen
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-transparent z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Dropdown menu */}
      <div
        ref={dropdownRef}
        className={`${position} w-48 z-50 bg-gray-100 rounded-lg shadow-lg border border-gray-200 py-1 ${className}`}
      >
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              className={`w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-brand-light transition-all cursor-pointer ${
                item.className || ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!item.disabled && item.onClick) {
                  item.onClick(e);
                  if (item.closeOnClick !== false) {
                    onClose();
                  }
                }
              }}
              disabled={item.disabled}
            >
              <span className="flex-1 text-left text-sm">{item.label}</span>
              {Icon && <Icon size={16} />}
            </button>
          );
        })}
      </div>
    </>
  );
};

export default UserMenuDropdown;
