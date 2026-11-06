const BrandWordmark = ({ className = "" }) => (
  <span
    aria-label="The Loan Junction"
    className={`inline-flex flex-wrap items-baseline gap-[0.28em] font-semibold tracking-tight ${className}`}
  >
    <span>The Loan</span>
    <span className="text-accent">Junction</span>
  </span>
);

export default BrandWordmark;
