import { TABLE_COLUMNS } from '../../constants/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import LeadStageTips from '../LeadStageTips';

const TableHeader = ({ showStatus, showEmail, showLoanAmount, showAssignee, showPendingDisbursalAmount, sortOrder, onSort, hideSelectColumn, showSelectColumn = false, showSource, showCommentColumn = false, showPincode = false, showSalary = false, showSalaryDate = false, showCreatedAt = false, showRetryCount = false, showLoanNo = false, showDateReceived = false, showActions = true }) => {
  const columnsToShow = hideSelectColumn 
    ? TABLE_COLUMNS.filter(column => column.key !== 'select')
    : TABLE_COLUMNS;

  return (
    <tr className={`border-b border-slate-200 bg-brand-extra-light text-slate-700`}>
      {showSelectColumn && (
        <th
          className="w-11 min-w-11 border-r border-slate-200/70 bg-brand-extra-light p-2"
          aria-hidden="true"
        />
      )}
      {columnsToShow.map(column => (
        <th
          key={column.key}
          className={`px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200/70`}
          style={{ width: column.width }}
        >
          {column.label.toUpperCase()}
        </th>
      ))}
      {showLoanNo && <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200/70`}>Loan No</th>}
      {showDateReceived && <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200/70`}>Date Received</th>}
      {showEmail && <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200/70`}>Email</th>}
      {showLoanAmount && (
        <th 
          className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 cursor-pointer hover:bg-slate-100/70 border-r border-slate-200/70`}
          onClick={() => onSort && onSort()}
        >
          <div className="flex items-center gap-2">
            Loan Amount
            <div className="flex flex-col">
              {sortOrder === 'asc' ? (
                <ArrowUp size={16} className="text-brand-link" />
              ) : sortOrder === 'desc' ? (
                <ArrowDown size={16} className="text-brand-link" />
              ) : (
                <ArrowUpDown size={16} className="text-gray-400" />
              )}
            </div>
          </div>
        </th>
      )}
      {showPendingDisbursalAmount && <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200/70`}>Pending Disbursal Amount</th>}
      {showStatus && (
        <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200/70`}>
          <div className="flex items-center gap-1.5 normal-case tracking-normal">
            <span className="uppercase tracking-wide">Status</span>
            {/* <LeadStageTips align="left" /> */}
          </div>
        </th>
      )}
      {showAssignee && <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200/70`}>Assignee</th>}
      {showSource && <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200/70`}>Source</th>}
      {showRetryCount && <th className={`px-4 py-3 text-left text-sm font-medium text-gray-600`}>Retry Count</th>}
      {/* {showPincode && <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200/70`}>Pincode</th>}
      {showSalary && <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200/70`}>Monthly Salary</th>}
      {showSalaryDate && <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200/70`}>Salary Date</th>}
      {showCreatedAt && <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200/70`}>Applied Date & Time</th>} */}
      {showCommentColumn && <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200/70`}>Comment</th>}
      {showActions && <th className={`${!showStatus ? 'px-4' : 'px-4'} py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sticky right-0 bg-brand-extra-light border-l border-slate-200`}>Actions</th>}
    </tr>
  );
};

export default TableHeader;

