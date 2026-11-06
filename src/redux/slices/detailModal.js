import { createSlice } from "@reduxjs/toolkit";

const modalInitialState = {
  isOpen: false,
  customer: null,
  showReject: false,
  showApprove: false,
  role: "",
  handleReject: null,
  handleApprove: null,
};

export const modalSlice = createSlice({
  name: "detail-modal",
  initialState: modalInitialState,
  reducers: {
    openDetailModal: (state, action) => {
      const {
        row,
        role = "",
        showReject = false,
        onReject = null,
        showApprove = false,
        onApprove = null,
      } = action.payload || {};
      state.isOpen = true;
      state.customer = row;
      state.role = role;
      state.showReject = showReject;
      state.handleReject = onReject;
      state.showApprove = showApprove;
      state.handleApprove = onApprove;
    },
    closeDetailModal: (state) => {
      return { ...state, isOpen: false, showReject: false, showApprove: false, handleReject: null, handleApprove: null };
    },
  },
});

export const { openDetailModal, closeDetailModal } = modalSlice.actions;

export default modalSlice.reducer;
