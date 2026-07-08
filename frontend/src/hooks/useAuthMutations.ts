import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToast } from "@chakra-ui/react";
import { useAuthStore } from "../store/authStore";
import { useSocketStore } from "../store/socketStore";
import {
  loginUser,
  registerUser,
  updateUserProfile,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from "../store";

/**
 * useLoginMutation
 *
 * Wraps TanStack Query useMutation for login.
 * On success: sets user in Zustand authStore (which persists to localStorage),
 * connects the Socket.IO socket, then navigates to /chats.
 */
export const useLoginMutation = () => {
  const navigate     = useNavigate();
  const toast        = useToast();
  const { setUser }  = useAuthStore();
  const { connect }  = useSocketStore();

  return useMutation({
    mutationFn: (payload: LoginPayload) => loginUser(payload),
    onSuccess: (user) => {
      setUser(user);
      connect(user); // single socket connection for the session
      toast({
        title: `Welcome back, ${user.name}! 👋`,
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
      navigate("/chats");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    },
  });
};

/**
 * useRegisterMutation
 *
 * Wraps TanStack Query useMutation for registration.
 * Same pattern as login — sets user, connects socket, navigates.
 */
export const useRegisterMutation = () => {
  const navigate    = useNavigate();
  const toast       = useToast();
  const { setUser } = useAuthStore();
  const { connect } = useSocketStore();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => registerUser(payload),
    onSuccess: (user) => {
      setUser(user);
      connect(user);
      toast({
        title: `Welcome to VibeChat, ${user.name}! 🎉`,
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
      navigate("/chats");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    },
  });
};

/**
 * useUpdateProfileMutation
 *
 * Wraps TanStack Query useMutation for profile update.
 * On success: merges updated fields into authStore (also re-persists to localStorage).
 */
export const useUpdateProfileMutation = () => {
  const toast        = useToast();
  const { user, setUser } = useAuthStore();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateUserProfile(payload),
    onSuccess: (updated) => {
      // Merge — keep token and any fields not returned by the endpoint
      setUser({ ...user!, ...updated });
      toast({
        title: "Profile updated! 🎉",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update profile",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    },
  });
};
