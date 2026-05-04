import axios from "axios";
import { store } from "../store/store";
import { setAccount } from "../store/mainSlice";

export const refreshData = async () => {
  try {
    const token = localStorage.getItem("token");

    const { data } = await axios.get(
      `${import.meta.env.VITE_API_LINK}account/`,
      {
        headers: { token },
        withCredentials: true,
      }
    );

    if (data.status === 1) {
      store.dispatch(setAccount(data.results));
    }
  } catch (error) {
    console.log("refreshData error:", error);
  }
};