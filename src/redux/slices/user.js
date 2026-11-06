import { createSlice } from "@reduxjs/toolkit";

const userInitialState = {
  f_name: "",
  l_name: "",
  email: "",
  allRoles: [],
  selectedRole: "",
  isAuthenticated: false,
};

export const userSlice = createSlice({
  name: "user",
  initialState: userInitialState,
  reducers: {
    setUser: (state, action) => {
      return action.payload;
    },
    setRole: (state, action) => {
      state.selectedRole = action.payload;
    },
    loginAction: (state, action) => {
      const { roles, f_name, l_name, email } = action.payload;
      state.isAuthenticated = true;
      state.allRoles = roles;
      state.f_name = f_name;
      state.l_name = l_name;
      state.email = email || "";
      state.selectedRole = action.payload.roles[0].toLowerCase();
    },
    logoutAction: (state) => {
      return userInitialState;
    }
  },
});

export const { setUser, setRole, loginAction, logoutAction } =
  userSlice.actions;

export default userSlice.reducer;
