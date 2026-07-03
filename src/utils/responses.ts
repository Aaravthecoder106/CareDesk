import { AuthRequest, ApiResponse, PaginatedResponse } from "../types";

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, message };
}

export function errorResponse(error: string): ApiResponse {
  return { success: false, error };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): ApiResponse<PaginatedResponse<T>> {
  return {
    success: true,
    data: {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function parsePagination(query: { page?: string; limit?: string }) {
  const rawPage = parseInt(query.page || "1", 10);
  const rawLimit = parseInt(query.limit || "20", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(100, Math.floor(rawLimit)) : 20;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
