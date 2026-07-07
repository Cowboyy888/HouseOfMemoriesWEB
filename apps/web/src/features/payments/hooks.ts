"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatePaymentRequest } from "@drivehub/contracts";
import { createPayment, fetchPaymentById, verifyPayment } from "./api";

export function useCreatePaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreatePaymentRequest) => createPayment(request),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["payment", result.id] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });
}

export function usePaymentQuery(id: string | null) {
  return useQuery({
    queryKey: ["payment", id],
    queryFn: () => fetchPaymentById(id!),
    enabled: id !== null,
  });
}

export function useVerifyPaymentMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => verifyPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment", id] });
      queryClient.invalidateQueries({ queryKey: ["booking"] });
    },
  });
}
