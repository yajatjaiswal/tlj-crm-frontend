import { UserCircle } from 'lucide-react'
import React from 'react'

const TableHeading = ({heading}) => {
  return (
    <div className="mb-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand rounded-xl">
              <UserCircle className="text-white" size={20} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
              {heading}
          </h1>
        </div>
    </div>
  )
}

export default TableHeading
