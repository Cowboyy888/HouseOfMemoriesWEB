"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BookingListQuery, CancelBookingRequest, CheckAvailabilityQuery, CreateBookingRequest } from "@drivehub/contracts";
import { cancelBooking, checkAvailability, createBooking, fetchBookingById, fetchMyBookings } from "./api";

export function useAvailabilityQuery(query: CheckAvailabilityQuery | null) {
  return useQuery({
    queryKey: ["booking-availability", query],
    queryFn: () => checkAvailability(query!),
    enabled: query !== null,
    retry: false,
  });
}

export function useCreateBookingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateBookingRequest) => createBooking(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });
}

export function useMyBookingsQuery(query: Partial<BookingListQuery> = {}) {
  return useQuery({
    queryKey: ["my-bookings", query],
    queryFn: () => fetchMyBookings(query),
  });
}

export function useBookingQuery(id: string) {
  return useQuery({
    queryKey: ["booking", id],
    queryFn: () => fetchBookingById(id),
  });
}

export function useCancelBookingMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CancelBookingRequest) => cancelBooking(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });
}
