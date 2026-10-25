// frontend/src/store/api.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const bookleafApi = createApi({
  reducerPath: 'bookleafApi',
  baseQuery: fetchBaseQuery({
    baseUrl: BASE,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('bl_token');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Me', 'Book', 'Ticket', 'TicketList', 'AdminQueue', 'Stats'],
  endpoints: (builder) => ({
    // ---------- Auth ----------
    getMe: builder.query({
      query: () => '/api/auth/me',
      providesTags: ['Me'],
    }),

    // ---------- Author ----------
    getBooks: builder.query({
      query: () => '/api/books',
      providesTags: ['Book'],
      keepUnusedDataFor: 300,
    }),
    getMyTickets: builder.query({
      query: () => '/api/tickets',
      providesTags: ['TicketList'],
    }),
    getTicket: builder.query({
      query: (id) => `/api/tickets/${id}`,
      providesTags: (r, e, id) => [{ type: 'Ticket', id }, 'TicketList'],
    }),
    createTicket: builder.mutation({
      query: (body) => ({ url: '/api/tickets', method: 'POST', body }),
      invalidatesTags: ['TicketList'],
    }),

    // ---------- Admin ----------
    getAdminTickets: builder.query({
      query: (qs = '') => `/api/admin/tickets${qs ? `?${qs}` : ''}`,
      providesTags: ['AdminQueue'],
      keepUnusedDataFor: 60,
    }),
    getAdminTicket: builder.query({
      query: (id) => `/api/admin/tickets/${id}`,
      providesTags: (r, e, id) => [{ type: 'Ticket', id }, 'AdminQueue'],
    }),
    updateTicket: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/api/admin/tickets/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (r, e, { id }) => [{ type: 'Ticket', id }, 'AdminQueue'],
    }),
    replyTicket: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/api/admin/tickets/${id}/messages`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (r, e, { id }) => [{ type: 'Ticket', id }, 'AdminQueue'],
    }),
    draftTicket: builder.mutation({
      query: (id) => ({ url: `/api/admin/tickets/${id}/draft`, method: 'POST' }),
    }),
    retryAI: builder.mutation({
      query: (id) => ({ url: `/api/admin/tickets/${id}/retry-ai`, method: 'POST' }),
      invalidatesTags: (r, e, id) => [{ type: 'Ticket', id }, 'AdminQueue'],
    }),
    getAdminStats: builder.query({
      query: () => '/api/admin/stats',
      providesTags: ['Stats'],
      keepUnusedDataFor: 60,
    }),
  }),
});

export const {
  useGetMeQuery,
  useGetBooksQuery,
  useGetMyTicketsQuery,
  useGetTicketQuery,
  useCreateTicketMutation,
  useGetAdminTicketsQuery,
  useGetAdminTicketQuery,
  useUpdateTicketMutation,
  useReplyTicketMutation,
  useDraftTicketMutation,
  useRetryAIMutation,
  useGetAdminStatsQuery,
} = bookleafApi;