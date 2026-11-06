import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import CustomerModal from "./CustomerModal";
import { closeDetailModal } from "../../redux/slices/detailModal";

const LeadInformationFullPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const activeTabFromModal = location?.state?.activeTab || "customer";
  const isAssignedLeadsFlow = location?.state?.isAssignedLeadsPage === true;
  const isCreditHeadAssignedAuditFlow =
    location?.state?.isCreditHeadAssignedAuditPage === true;
  const isAllocatedAuditFlow = location?.state?.isAllocatedAuditPage === true;

  const handleMinimize = () => {
    navigate(-1);
  };

  const handleClose = () => {
    dispatch(closeDetailModal());
    navigate(-1);
  };

  return (
    <CustomerModal
      isOpen={true}
      onClose={handleClose}
      modalSize="full"
      hideBackdrop={true}
      showFullViewAction={false}
      isFullPageView={true}
      onMinimizeFullView={handleMinimize}
      initialTab={activeTabFromModal}
      isAssignedLeadsFlow={isAssignedLeadsFlow}
      isCreditHeadAssignedAuditFlow={isCreditHeadAssignedAuditFlow}
      isAllocatedAuditFlow={isAllocatedAuditFlow}
    />
  );
};

export default LeadInformationFullPage;
