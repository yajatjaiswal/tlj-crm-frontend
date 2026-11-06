import { SANCTION_CONFIG } from "../constants/constants.js";

function getInsurancePremium(loanAmount) {
  const slabs = [
    { insured: 25000, premium: 75 },
    { insured: 30000, premium: 90 },
    { insured: 35000, premium: 104 },
    { insured: 40000, premium: 120 },
    { insured: 45000, premium: 135 },
    { insured: 50000, premium: 150 },
  ];

  // Find nearest slab (equal or next higher)
  for (let i = 0; i < slabs.length; i++) {
    if (loanAmount <= slabs[i].insured) {
      return slabs[i].premium;
    }
  }

  // If higher than max slab, use the highest
  return slabs[slabs.length - 1].premium;
}

export const calculateLoanDetails = (
  loanAmount,
  tenureDays,
  pfPercent,
  is_opt_insurence = false,
  roi = SANCTION_CONFIG.ROI,
) => {
  let insurance;
  if (is_opt_insurence) {
    insurance = getInsurancePremium(loanAmount);
  } else {
    insurance = 0;
  }

  const dailyInterestRate = Number((Number(roi) / 100).toFixed(3));

  const pfAmount = Math.floor((Number(loanAmount) * Number(pfPercent)) / 100);
  const gst = Math.ceil(Number(pfAmount * 0.18));
  const totalAdminFees = Math.floor(
    Number(pfAmount) + Number(insurance) + Number(gst),
  );
  const netDisbursal = Math.floor(Number(loanAmount) - Number(totalAdminFees));
  const interestAmount = Math.ceil(
    Number(loanAmount) * Number(dailyInterestRate) * Number(tenureDays),
  );
  const repaymentAmount = Math.floor(
    Number(loanAmount) + Number(interestAmount),
  );
  const netAdminFee = Math.floor(Number(pfAmount));

  const apr = Math.floor(
    ((Number(netAdminFee) + Number(interestAmount)) / Number(loanAmount)) *
      (365 / Number(tenureDays)) *
      100,
  );

  return {
    loanAmount: Math.floor(loanAmount),
    tenureDays: Math.floor(tenureDays),
    pfPercent: Number(pfPercent),
    pfAmount,
    insurance,
    totalAdminFees,
    netDisbursal,
    interestAmount,
    repaymentAmount,
    netAdminFee,
    gst,
    apr,
    roi,
  };
};
