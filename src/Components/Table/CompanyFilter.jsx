import React from 'react';

const CompanyFilter = ({ selectedCompany, onCompanyChange, companies }) => {
  return (
    <div className="flex items-center space-x-2 px-4">
      {/* <label htmlFor="company-filter" className="text-gray-700 font-medium">
        Company:
      </label> */}
      <select
        id="company-filter"
        value={selectedCompany}
        onChange={(e) => onCompanyChange(e.target.value)}
        className="p-2 form-select rounded-md border-gray-300 shadow-sm focus:border-brand focus:ring-brand text-gray-900"
      >
        <option value="">All Companies</option>
        {companies.map((company) => (
          <option key={company} value={company}>
            {company}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CompanyFilter; 