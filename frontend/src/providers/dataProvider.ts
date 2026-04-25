import dataProviderSimpleRest from "@refinedev/simple-rest";
import { API_URL } from "../config";
import { axiosInstance } from "../lib/axios";

export const dataProvider = dataProviderSimpleRest(API_URL, axiosInstance);
