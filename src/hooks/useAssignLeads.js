// src/hooks/useAssignLeads.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { selfAssignMultipleBreRejectedLead } from '../services/functions/credit-analyst';
import toast from 'react-hot-toast';

export const useAssignLeads = (onSuccess) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: selfAssignMultipleBreRejectedLead,
    onSuccess: () => {
      queryClient.invalidateQueries(["bre-rejected-leads"]);
      toast.success("Leads Assigned Successfully");
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Error assigning leads:", error);
      toast.error("Failed to assign leads");
    }
  });
};