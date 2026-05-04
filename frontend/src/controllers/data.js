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

    if (data.status === 1 && data.result) {
      const currentAccount = store.getState().main.account || {};
      const {
        account_name,
        account_number,
        balance,
        currency_code,
        currency_country,
        currency_name,
        currency_symbol,
        ifsc_code,
        first_name,
        last_name,
        dob,
        number,
      } = data.result;

      const newAccount = {
        ...currentAccount,
        name: account_name,
        account_name,
        accountNumber: account_number,
        balance,
        currencyCode: currency_code,
        currencyName: currency_name,
        currencyCountry: currency_country,
        currencySymbol: currency_symbol,
        sortCode: ifsc_code,
        firstName: first_name,
        lastName: last_name,
        dob,
        phoneNumber: number,
      };

      store.dispatch(setAccount(newAccount));
    }
  } catch (error) {
    console.log("refreshData error:", error);
  }
};