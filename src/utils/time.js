export const convertTo12Hour = (time24) => {
  if (!time24) return { hour: 12, minute: "00", period: "AM" };
  const [hours, minutes] = time24.split(":");
  const hour24 = parseInt(hours, 10);
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  return { hour: hour12, minute: minutes, period };
};

export const convertTo24Hour = (hour, minute, period) => {
  let hour24 = parseInt(hour, 10);
  if (period === "PM" && hour24 !== 12) {
    hour24 += 12;
  } else if (period === "AM" && hour24 === 12) {
    hour24 = 0;
  }
  return `${String(hour24).padStart(2, "0")}:${minute}`;
};

