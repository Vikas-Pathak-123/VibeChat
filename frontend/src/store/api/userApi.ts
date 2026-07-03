import apiClient from "./apiClient";
import { User } from "../../types";

/** Request / response shapes */
export interface LoginPayload     { email: string; password: string }
export interface RegisterPayload  { name: string; email: string; password: string; pic?: string }
export interface UpdateProfilePayload { name?: string; picture?: string }

/**
 * TanStack Query fetch functions for the User domain.
 *
 * These are plain async functions — no axios imports in components.
 * Pass them to useQuery / useMutation in the component layer.
 */

export const loginUser = async (payload: LoginPayload): Promise<User> => {
  const { data } = await apiClient.post<User>("/api/user/login", payload);
  return data;
};

export const registerUser = async (payload: RegisterPayload): Promise<User> => {
  const { data } = await apiClient.post<User>("/api/user", payload);
  return data;
};

export const searchUsers = async (query: string): Promise<User[]> => {
  const { data } = await apiClient.get<User[]>(`/api/user?search=${query}`);
  return data;
};

export const updateUserProfile = async (payload: UpdateProfilePayload): Promise<User> => {
  const { data } = await apiClient.put<User>("/api/user/profile", payload);
  return data;
};
