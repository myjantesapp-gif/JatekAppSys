import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AcceptDeliveryBody, Ad, AdBody, Address, AddressBody, AdminStats, AuthResponse, BackendDashboard, BackendDeliveryman, BackendMe, Category, CategoryBody, CategoryEntry, CategoryWithSubs, CompleteDriverProfileBody, CompleteRestaurantProfileBody, ConfirmDeliveryBody, CreateMenuItemBody, CreateOrderBody, CreateQuoteBody, CreateRestaurantBody, CreateReviewBody, CreateStaffBody, CreateSupportTicketBody, CreateTodoBody, DashboardTodo, Driver, DriverEarnings, DriverLocation, DriverLocationPublic, DriverLocationUpdateBody, ErrorResponse, Favorite, FavoriteBody, FavoriteWithRestaurant, ForgotPasswordBody, GetBackendDashboardParams, GetOrderInvoiceParams, GetOrderReceiptParams, GetQuotePdfParams, HealthStatus, ImageUploadResponse, ListAdsParams, ListBackendCustomersParams, ListBackendOrdersParams, ListBackendProductsParams, ListBackendReviewsParams, ListBackendShopsParams, ListDriversParams, ListMenuItemsParams, ListOrdersParams, ListQuotesParams, ListRestaurantsParams, ListReviewsParams, ListUsersParams, LoginBody, MenuItem, NotificationPrefs, Order, PasswordResetRequestResponse, PasswordResetResponse, PaymentMethod, PaymentMethodBody, Quote, RegisterBody, ResetPasswordBody, Restaurant, RestaurantStats, Review, RoleDef, SendOtpBody, SendOtpResponse, Short, ShortBody, SubscribeEventsParams, SuccessResponse, SupportTicket, ToggleBackendTodoBody, UpdateAddressBody, UpdateDriverBody, UpdateMenuItemBody, UpdateNameBody, UpdateNotificationPrefsBody, UpdateOrderStatusBody, UpdatePaymentMethodBody, UpdateQuoteBody, UpdateRestaurantBody, UpdateStaffBody, UpdateSupportTicketBody, UpdateUserBody, UpdateUserConsentsBody, User, UserConsents, UserConsentsWithVersions, UserDataExport, UserEnvelope, UserRewards, VerifyOtpBody } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getListAddressesUrl: () => string;
/**
 * @summary List current user's addresses
 */
export declare const listAddresses: (options?: Parameters<typeof customFetch>[1]) => Promise<Address[]>;
export declare const getListAddressesQueryKey: () => readonly ["/api/addresses"];
export declare const getListAddressesQueryOptions: <TData = Awaited<ReturnType<typeof listAddresses>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAddresses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAddresses>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAddressesQueryResult = NonNullable<Awaited<ReturnType<typeof listAddresses>>>;
export type ListAddressesQueryError = ErrorType<ErrorResponse>;
/**
 * @summary List current user's addresses
 */
export declare function useListAddresses<TData = Awaited<ReturnType<typeof listAddresses>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAddresses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateAddressUrl: () => string;
/**
 * @summary Create a address
 */
export declare const createAddress: (addressBody: AddressBody, options?: Parameters<typeof customFetch>[1]) => Promise<Address>;
export declare const getCreateAddressMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAddress>>, TError, {
        data: BodyType<AddressBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAddress>>, TError, {
    data: BodyType<AddressBody>;
}, TContext>;
export type CreateAddressMutationResult = NonNullable<Awaited<ReturnType<typeof createAddress>>>;
export type CreateAddressMutationBody = BodyType<AddressBody>;
export type CreateAddressMutationError = ErrorType<ErrorResponse>;
/**
* @summary Create a address
*/
export declare const useCreateAddress: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAddress>>, TError, {
        data: BodyType<AddressBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAddress>>, TError, {
    data: BodyType<AddressBody>;
}, TContext>;
export declare const getUpdateAddressUrl: (id: number) => string;
/**
 * @summary Update a address
 */
export declare const updateAddress: (id: number, updateAddressBody: UpdateAddressBody, options?: Parameters<typeof customFetch>[1]) => Promise<Address>;
export declare const getUpdateAddressMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAddress>>, TError, {
        id: number;
        data: BodyType<UpdateAddressBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateAddress>>, TError, {
    id: number;
    data: BodyType<UpdateAddressBody>;
}, TContext>;
export type UpdateAddressMutationResult = NonNullable<Awaited<ReturnType<typeof updateAddress>>>;
export type UpdateAddressMutationBody = BodyType<UpdateAddressBody>;
export type UpdateAddressMutationError = ErrorType<ErrorResponse>;
/**
* @summary Update a address
*/
export declare const useUpdateAddress: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAddress>>, TError, {
        id: number;
        data: BodyType<UpdateAddressBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateAddress>>, TError, {
    id: number;
    data: BodyType<UpdateAddressBody>;
}, TContext>;
export declare const getDeleteAddressUrl: (id: number) => string;
/**
 * @summary Delete a address
 */
export declare const deleteAddress: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteAddressMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAddress>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteAddress>>, TError, {
    id: number;
}, TContext>;
export type DeleteAddressMutationResult = NonNullable<Awaited<ReturnType<typeof deleteAddress>>>;
export type DeleteAddressMutationError = ErrorType<ErrorResponse>;
/**
* @summary Delete a address
*/
export declare const useDeleteAddress: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAddress>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteAddress>>, TError, {
    id: number;
}, TContext>;
export declare const getGetRecentOrdersUrl: () => string;
/**
 * @summary Get recent orders for admin dashboard
 */
export declare const getRecentOrders: (options?: Parameters<typeof customFetch>[1]) => Promise<Order[]>;
export declare const getGetRecentOrdersQueryKey: () => readonly ["/api/admin/recent-orders"];
export declare const getGetRecentOrdersQueryOptions: <TData = Awaited<ReturnType<typeof getRecentOrders>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRecentOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRecentOrders>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRecentOrdersQueryResult = NonNullable<Awaited<ReturnType<typeof getRecentOrders>>>;
export type GetRecentOrdersQueryError = ErrorType<unknown>;
/**
 * @summary Get recent orders for admin dashboard
 */
export declare function useGetRecentOrders<TData = Awaited<ReturnType<typeof getRecentOrders>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRecentOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetAdminStatsUrl: () => string;
/**
 * @summary Get admin dashboard statistics
 */
export declare const getAdminStats: (options?: Parameters<typeof customFetch>[1]) => Promise<AdminStats>;
export declare const getGetAdminStatsQueryKey: () => readonly ["/api/admin/stats"];
export declare const getGetAdminStatsQueryOptions: <TData = Awaited<ReturnType<typeof getAdminStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAdminStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAdminStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getAdminStats>>>;
export type GetAdminStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get admin dashboard statistics
 */
export declare function useGetAdminStats<TData = Awaited<ReturnType<typeof getAdminStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getForgotPasswordUrl: () => string;
/**
 * @summary Send a password reset OTP to the phone attached to an email
 */
export declare const forgotPassword: (forgotPasswordBody: ForgotPasswordBody, options?: Parameters<typeof customFetch>[1]) => Promise<PasswordResetRequestResponse>;
export declare const getForgotPasswordMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof forgotPassword>>, TError, {
        data: BodyType<ForgotPasswordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof forgotPassword>>, TError, {
    data: BodyType<ForgotPasswordBody>;
}, TContext>;
export type ForgotPasswordMutationResult = NonNullable<Awaited<ReturnType<typeof forgotPassword>>>;
export type ForgotPasswordMutationBody = BodyType<ForgotPasswordBody>;
export type ForgotPasswordMutationError = ErrorType<ErrorResponse>;
/**
* @summary Send a password reset OTP to the phone attached to an email
*/
export declare const useForgotPassword: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof forgotPassword>>, TError, {
        data: BodyType<ForgotPasswordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof forgotPassword>>, TError, {
    data: BodyType<ForgotPasswordBody>;
}, TContext>;
export declare const getLoginUrl: () => string;
/**
 * @summary Login
 */
export declare const login: (loginBody: LoginBody, options?: Parameters<typeof customFetch>[1]) => Promise<AuthResponse>;
export declare const getLoginMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<LoginBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<LoginBody>;
}, TContext>;
export type LoginMutationResult = NonNullable<Awaited<ReturnType<typeof login>>>;
export type LoginMutationBody = BodyType<LoginBody>;
export type LoginMutationError = ErrorType<ErrorResponse>;
/**
* @summary Login
*/
export declare const useLogin: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<LoginBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<LoginBody>;
}, TContext>;
export declare const getLogoutUrl: () => string;
/**
 * @summary Logout
 */
export declare const logout: (options?: Parameters<typeof customFetch>[1]) => Promise<SuccessResponse>;
export declare const getLogoutMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
export type LogoutMutationResult = NonNullable<Awaited<ReturnType<typeof logout>>>;
export type LogoutMutationError = ErrorType<unknown>;
/**
* @summary Logout
*/
export declare const useLogout: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
export declare const getGetMeUrl: () => string;
/**
 * @summary Get current user
 */
export declare const getMe: (options?: Parameters<typeof customFetch>[1]) => Promise<User>;
export declare const getGetMeQueryKey: () => readonly ["/api/auth/me"];
export declare const getGetMeQueryOptions: <TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMeQueryResult = NonNullable<Awaited<ReturnType<typeof getMe>>>;
export type GetMeQueryError = ErrorType<unknown>;
/**
 * @summary Get current user
 */
export declare function useGetMe<TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getDeleteAuthMeUrl: () => string;
/**
 * @summary Delete the current authenticated user account
 */
export declare const deleteAuthMe: (options?: Parameters<typeof customFetch>[1]) => Promise<SuccessResponse>;
export declare const getDeleteAuthMeMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAuthMe>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteAuthMe>>, TError, void, TContext>;
export type DeleteAuthMeMutationResult = NonNullable<Awaited<ReturnType<typeof deleteAuthMe>>>;
export type DeleteAuthMeMutationError = ErrorType<ErrorResponse>;
/**
* @summary Delete the current authenticated user account
*/
export declare const useDeleteAuthMe: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAuthMe>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteAuthMe>>, TError, void, TContext>;
export declare const getRegisterUrl: () => string;
/**
 * @summary Register a new user
 */
export declare const register: (registerBody: RegisterBody, options?: Parameters<typeof customFetch>[1]) => Promise<AuthResponse>;
export declare const getRegisterMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof register>>, TError, {
        data: BodyType<RegisterBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof register>>, TError, {
    data: BodyType<RegisterBody>;
}, TContext>;
export type RegisterMutationResult = NonNullable<Awaited<ReturnType<typeof register>>>;
export type RegisterMutationBody = BodyType<RegisterBody>;
export type RegisterMutationError = ErrorType<ErrorResponse>;
/**
* @summary Register a new user
*/
export declare const useRegister: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof register>>, TError, {
        data: BodyType<RegisterBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof register>>, TError, {
    data: BodyType<RegisterBody>;
}, TContext>;
export declare const getResetPasswordUrl: () => string;
/**
 * @summary Reset password with OTP and login
 */
export declare const resetPassword: (resetPasswordBody: ResetPasswordBody, options?: Parameters<typeof customFetch>[1]) => Promise<PasswordResetResponse>;
export declare const getResetPasswordMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof resetPassword>>, TError, {
        data: BodyType<ResetPasswordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof resetPassword>>, TError, {
    data: BodyType<ResetPasswordBody>;
}, TContext>;
export type ResetPasswordMutationResult = NonNullable<Awaited<ReturnType<typeof resetPassword>>>;
export type ResetPasswordMutationBody = BodyType<ResetPasswordBody>;
export type ResetPasswordMutationError = ErrorType<ErrorResponse>;
/**
* @summary Reset password with OTP and login
*/
export declare const useResetPassword: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof resetPassword>>, TError, {
        data: BodyType<ResetPasswordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof resetPassword>>, TError, {
    data: BodyType<ResetPasswordBody>;
}, TContext>;
export declare const getSendOtpUrl: () => string;
/**
 * @summary Send OTP to phone number
 */
export declare const sendOtp: (sendOtpBody: SendOtpBody, options?: Parameters<typeof customFetch>[1]) => Promise<SendOtpResponse>;
export declare const getSendOtpMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendOtp>>, TError, {
        data: BodyType<SendOtpBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendOtp>>, TError, {
    data: BodyType<SendOtpBody>;
}, TContext>;
export type SendOtpMutationResult = NonNullable<Awaited<ReturnType<typeof sendOtp>>>;
export type SendOtpMutationBody = BodyType<SendOtpBody>;
export type SendOtpMutationError = ErrorType<ErrorResponse>;
/**
* @summary Send OTP to phone number
*/
export declare const useSendOtp: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendOtp>>, TError, {
        data: BodyType<SendOtpBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendOtp>>, TError, {
    data: BodyType<SendOtpBody>;
}, TContext>;
export declare const getUpdateAuthNameUrl: () => string;
/**
 * @summary Update the current user name after OTP signup
 */
export declare const updateAuthName: (updateNameBody: UpdateNameBody, options?: Parameters<typeof customFetch>[1]) => Promise<UserEnvelope>;
export declare const getUpdateAuthNameMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAuthName>>, TError, {
        data: BodyType<UpdateNameBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateAuthName>>, TError, {
    data: BodyType<UpdateNameBody>;
}, TContext>;
export type UpdateAuthNameMutationResult = NonNullable<Awaited<ReturnType<typeof updateAuthName>>>;
export type UpdateAuthNameMutationBody = BodyType<UpdateNameBody>;
export type UpdateAuthNameMutationError = ErrorType<ErrorResponse>;
/**
* @summary Update the current user name after OTP signup
*/
export declare const useUpdateAuthName: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAuthName>>, TError, {
        data: BodyType<UpdateNameBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateAuthName>>, TError, {
    data: BodyType<UpdateNameBody>;
}, TContext>;
export declare const getVerifyOtpUrl: () => string;
/**
 * @summary Verify OTP and authenticate
 */
export declare const verifyOtp: (verifyOtpBody: VerifyOtpBody, options?: Parameters<typeof customFetch>[1]) => Promise<AuthResponse>;
export declare const getVerifyOtpMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyOtp>>, TError, {
        data: BodyType<VerifyOtpBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof verifyOtp>>, TError, {
    data: BodyType<VerifyOtpBody>;
}, TContext>;
export type VerifyOtpMutationResult = NonNullable<Awaited<ReturnType<typeof verifyOtp>>>;
export type VerifyOtpMutationBody = BodyType<VerifyOtpBody>;
export type VerifyOtpMutationError = ErrorType<ErrorResponse>;
/**
* @summary Verify OTP and authenticate
*/
export declare const useVerifyOtp: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyOtp>>, TError, {
        data: BodyType<VerifyOtpBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof verifyOtp>>, TError, {
    data: BodyType<VerifyOtpBody>;
}, TContext>;
export declare const getListBackendCategoriesUrl: () => string;
/**
 * JWT required. Backend dashboard RBAC applies by staff role and scoped shop access.
 * @summary List shop/restaurant categories (distinct values from shops)
 */
export declare const listBackendCategories: (options?: Parameters<typeof customFetch>[1]) => Promise<CategoryEntry[]>;
export declare const getListBackendCategoriesQueryKey: () => readonly ["/api/backend/categories"];
export declare const getListBackendCategoriesQueryOptions: <TData = Awaited<ReturnType<typeof listBackendCategories>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBackendCategories>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBackendCategoriesQueryResult = NonNullable<Awaited<ReturnType<typeof listBackendCategories>>>;
export type ListBackendCategoriesQueryError = ErrorType<ErrorResponse>;
/**
 * @summary List shop/restaurant categories (distinct values from shops)
 */
export declare function useListBackendCategories<TData = Awaited<ReturnType<typeof listBackendCategories>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateBackendCategoryUrl: () => string;
/**
 * @summary Create a category (admin)
 */
export declare const createBackendCategory: (categoryBody: CategoryBody, options?: Parameters<typeof customFetch>[1]) => Promise<Category>;
export declare const getCreateBackendCategoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBackendCategory>>, TError, {
        data: BodyType<CategoryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createBackendCategory>>, TError, {
    data: BodyType<CategoryBody>;
}, TContext>;
export type CreateBackendCategoryMutationResult = NonNullable<Awaited<ReturnType<typeof createBackendCategory>>>;
export type CreateBackendCategoryMutationBody = BodyType<CategoryBody>;
export type CreateBackendCategoryMutationError = ErrorType<unknown>;
/**
* @summary Create a category (admin)
*/
export declare const useCreateBackendCategory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBackendCategory>>, TError, {
        data: BodyType<CategoryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createBackendCategory>>, TError, {
    data: BodyType<CategoryBody>;
}, TContext>;
export declare const getListBackendCustomersUrl: (params?: ListBackendCustomersParams) => string;
/**
 * JWT required. Backend dashboard RBAC applies by staff role and scoped shop access.
 * @summary List customers
 */
export declare const listBackendCustomers: (params?: ListBackendCustomersParams, options?: Parameters<typeof customFetch>[1]) => Promise<User[]>;
export declare const getListBackendCustomersQueryKey: (params?: ListBackendCustomersParams) => readonly ["/api/backend/customers", ...ListBackendCustomersParams[]];
export declare const getListBackendCustomersQueryOptions: <TData = Awaited<ReturnType<typeof listBackendCustomers>>, TError = ErrorType<ErrorResponse>>(params?: ListBackendCustomersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendCustomers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBackendCustomers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBackendCustomersQueryResult = NonNullable<Awaited<ReturnType<typeof listBackendCustomers>>>;
export type ListBackendCustomersQueryError = ErrorType<ErrorResponse>;
/**
 * @summary List customers
 */
export declare function useListBackendCustomers<TData = Awaited<ReturnType<typeof listBackendCustomers>>, TError = ErrorType<ErrorResponse>>(params?: ListBackendCustomersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendCustomers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetBackendDashboardUrl: (params?: GetBackendDashboardParams) => string;
/**
 * JWT required. Backend dashboard RBAC applies by staff role and scoped shop access.
 * @summary Aggregate stats for the backend dashboard
 */
export declare const getBackendDashboard: (params?: GetBackendDashboardParams, options?: Parameters<typeof customFetch>[1]) => Promise<BackendDashboard>;
export declare const getGetBackendDashboardQueryKey: (params?: GetBackendDashboardParams) => readonly ["/api/backend/dashboard", ...GetBackendDashboardParams[]];
export declare const getGetBackendDashboardQueryOptions: <TData = Awaited<ReturnType<typeof getBackendDashboard>>, TError = ErrorType<ErrorResponse>>(params?: GetBackendDashboardParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBackendDashboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBackendDashboard>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBackendDashboardQueryResult = NonNullable<Awaited<ReturnType<typeof getBackendDashboard>>>;
export type GetBackendDashboardQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Aggregate stats for the backend dashboard
 */
export declare function useGetBackendDashboard<TData = Awaited<ReturnType<typeof getBackendDashboard>>, TError = ErrorType<ErrorResponse>>(params?: GetBackendDashboardParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBackendDashboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListBackendDeliverymenUrl: () => string;
/**
 * JWT required. Backend dashboard RBAC applies by staff role and scoped shop access.
 * @summary List delivery drivers
 */
export declare const listBackendDeliverymen: (options?: Parameters<typeof customFetch>[1]) => Promise<BackendDeliveryman[]>;
export declare const getListBackendDeliverymenQueryKey: () => readonly ["/api/backend/deliverymen"];
export declare const getListBackendDeliverymenQueryOptions: <TData = Awaited<ReturnType<typeof listBackendDeliverymen>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendDeliverymen>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBackendDeliverymen>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBackendDeliverymenQueryResult = NonNullable<Awaited<ReturnType<typeof listBackendDeliverymen>>>;
export type ListBackendDeliverymenQueryError = ErrorType<ErrorResponse>;
/**
 * @summary List delivery drivers
 */
export declare function useListBackendDeliverymen<TData = Awaited<ReturnType<typeof listBackendDeliverymen>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendDeliverymen>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getBackendLoginUrl: () => string;
/**
 * @summary Login to the backend dashboard (staff only)
 */
export declare const backendLogin: (loginBody: LoginBody, options?: Parameters<typeof customFetch>[1]) => Promise<AuthResponse>;
export declare const getBackendLoginMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof backendLogin>>, TError, {
        data: BodyType<LoginBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof backendLogin>>, TError, {
    data: BodyType<LoginBody>;
}, TContext>;
export type BackendLoginMutationResult = NonNullable<Awaited<ReturnType<typeof backendLogin>>>;
export type BackendLoginMutationBody = BodyType<LoginBody>;
export type BackendLoginMutationError = ErrorType<ErrorResponse>;
/**
* @summary Login to the backend dashboard (staff only)
*/
export declare const useBackendLogin: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof backendLogin>>, TError, {
        data: BodyType<LoginBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof backendLogin>>, TError, {
    data: BodyType<LoginBody>;
}, TContext>;
export declare const getBackendMeUrl: () => string;
/**
 * JWT required. Backend dashboard RBAC applies by staff role and scoped shop access.
 * @summary Get current backend user with permissions
 */
export declare const backendMe: (options?: Parameters<typeof customFetch>[1]) => Promise<BackendMe>;
export declare const getBackendMeQueryKey: () => readonly ["/api/backend/me"];
export declare const getBackendMeQueryOptions: <TData = Awaited<ReturnType<typeof backendMe>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof backendMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof backendMe>>, TError, TData> & {
    queryKey: QueryKey;
};
export type BackendMeQueryResult = NonNullable<Awaited<ReturnType<typeof backendMe>>>;
export type BackendMeQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get current backend user with permissions
 */
export declare function useBackendMe<TData = Awaited<ReturnType<typeof backendMe>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof backendMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListBackendOrdersUrl: (params?: ListBackendOrdersParams) => string;
/**
 * JWT required. Backend dashboard RBAC applies by staff role and scoped shop access.
 * @summary List orders (filtered by role scope)
 */
export declare const listBackendOrders: (params?: ListBackendOrdersParams, options?: Parameters<typeof customFetch>[1]) => Promise<Order[]>;
export declare const getListBackendOrdersQueryKey: (params?: ListBackendOrdersParams) => readonly ["/api/backend/orders", ...ListBackendOrdersParams[]];
export declare const getListBackendOrdersQueryOptions: <TData = Awaited<ReturnType<typeof listBackendOrders>>, TError = ErrorType<ErrorResponse>>(params?: ListBackendOrdersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBackendOrders>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBackendOrdersQueryResult = NonNullable<Awaited<ReturnType<typeof listBackendOrders>>>;
export type ListBackendOrdersQueryError = ErrorType<ErrorResponse>;
/**
 * @summary List orders (filtered by role scope)
 */
export declare function useListBackendOrders<TData = Awaited<ReturnType<typeof listBackendOrders>>, TError = ErrorType<ErrorResponse>>(params?: ListBackendOrdersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListBackendProductsUrl: (params?: ListBackendProductsParams) => string;
/**
 * JWT required. Backend dashboard RBAC applies by staff role and scoped shop access.
 * @summary List products (menu items, filtered by role scope)
 */
export declare const listBackendProducts: (params?: ListBackendProductsParams, options?: Parameters<typeof customFetch>[1]) => Promise<MenuItem[]>;
export declare const getListBackendProductsQueryKey: (params?: ListBackendProductsParams) => readonly ["/api/backend/products", ...ListBackendProductsParams[]];
export declare const getListBackendProductsQueryOptions: <TData = Awaited<ReturnType<typeof listBackendProducts>>, TError = ErrorType<ErrorResponse>>(params?: ListBackendProductsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendProducts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBackendProducts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBackendProductsQueryResult = NonNullable<Awaited<ReturnType<typeof listBackendProducts>>>;
export type ListBackendProductsQueryError = ErrorType<ErrorResponse>;
/**
 * @summary List products (menu items, filtered by role scope)
 */
export declare function useListBackendProducts<TData = Awaited<ReturnType<typeof listBackendProducts>>, TError = ErrorType<ErrorResponse>>(params?: ListBackendProductsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendProducts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListBackendReviewsUrl: (params?: ListBackendReviewsParams) => string;
/**
 * JWT required. Backend dashboard RBAC applies by staff role and scoped shop access.
 * @summary List shop reviews
 */
export declare const listBackendReviews: (params?: ListBackendReviewsParams, options?: Parameters<typeof customFetch>[1]) => Promise<Review[]>;
export declare const getListBackendReviewsQueryKey: (params?: ListBackendReviewsParams) => readonly ["/api/backend/reviews", ...ListBackendReviewsParams[]];
export declare const getListBackendReviewsQueryOptions: <TData = Awaited<ReturnType<typeof listBackendReviews>>, TError = ErrorType<ErrorResponse>>(params?: ListBackendReviewsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendReviews>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBackendReviews>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBackendReviewsQueryResult = NonNullable<Awaited<ReturnType<typeof listBackendReviews>>>;
export type ListBackendReviewsQueryError = ErrorType<ErrorResponse>;
/**
 * @summary List shop reviews
 */
export declare function useListBackendReviews<TData = Awaited<ReturnType<typeof listBackendReviews>>, TError = ErrorType<ErrorResponse>>(params?: ListBackendReviewsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendReviews>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListBackendRolesUrl: () => string;
/**
 * JWT required. Backend dashboard RBAC applies by staff role and scoped shop access.
 * @summary List roles + permission matrix
 */
export declare const listBackendRoles: (options?: Parameters<typeof customFetch>[1]) => Promise<RoleDef[]>;
export declare const getListBackendRolesQueryKey: () => readonly ["/api/backend/roles"];
export declare const getListBackendRolesQueryOptions: <TData = Awaited<ReturnType<typeof listBackendRoles>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendRoles>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBackendRoles>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBackendRolesQueryResult = NonNullable<Awaited<ReturnType<typeof listBackendRoles>>>;
export type ListBackendRolesQueryError = ErrorType<ErrorResponse>;
/**
 * @summary List roles + permission matrix
 */
export declare function useListBackendRoles<TData = Awaited<ReturnType<typeof listBackendRoles>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendRoles>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListBackendShopsUrl: (params?: ListBackendShopsParams) => string;
/**
 * JWT required. Backend dashboard RBAC applies by staff role and scoped shop access.
 * @summary List shops (filtered by role scope)
 */
export declare const listBackendShops: (params?: ListBackendShopsParams, options?: Parameters<typeof customFetch>[1]) => Promise<Restaurant[]>;
export declare const getListBackendShopsQueryKey: (params?: ListBackendShopsParams) => readonly ["/api/backend/shops", ...ListBackendShopsParams[]];
export declare const getListBackendShopsQueryOptions: <TData = Awaited<ReturnType<typeof listBackendShops>>, TError = ErrorType<ErrorResponse>>(params?: ListBackendShopsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendShops>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBackendShops>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBackendShopsQueryResult = NonNullable<Awaited<ReturnType<typeof listBackendShops>>>;
export type ListBackendShopsQueryError = ErrorType<ErrorResponse>;
/**
 * @summary List shops (filtered by role scope)
 */
export declare function useListBackendShops<TData = Awaited<ReturnType<typeof listBackendShops>>, TError = ErrorType<ErrorResponse>>(params?: ListBackendShopsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendShops>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListBackendStaffUrl: () => string;
/**
 * JWT required. Backend dashboard RBAC applies by staff role and scoped shop access.
 * @summary List staff & admin users (admin only)
 */
export declare const listBackendStaff: (options?: Parameters<typeof customFetch>[1]) => Promise<User[]>;
export declare const getListBackendStaffQueryKey: () => readonly ["/api/backend/staff"];
export declare const getListBackendStaffQueryOptions: <TData = Awaited<ReturnType<typeof listBackendStaff>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendStaff>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBackendStaff>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBackendStaffQueryResult = NonNullable<Awaited<ReturnType<typeof listBackendStaff>>>;
export type ListBackendStaffQueryError = ErrorType<ErrorResponse>;
/**
 * @summary List staff & admin users (admin only)
 */
export declare function useListBackendStaff<TData = Awaited<ReturnType<typeof listBackendStaff>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendStaff>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateBackendStaffUrl: () => string;
/**
 * JWT required. Backend dashboard RBAC applies by staff role and scoped shop access.
 * @summary Create a staff/admin user (admin only)
 */
export declare const createBackendStaff: (createStaffBody: CreateStaffBody, options?: Parameters<typeof customFetch>[1]) => Promise<User>;
export declare const getCreateBackendStaffMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBackendStaff>>, TError, {
        data: BodyType<CreateStaffBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createBackendStaff>>, TError, {
    data: BodyType<CreateStaffBody>;
}, TContext>;
export type CreateBackendStaffMutationResult = NonNullable<Awaited<ReturnType<typeof createBackendStaff>>>;
export type CreateBackendStaffMutationBody = BodyType<CreateStaffBody>;
export type CreateBackendStaffMutationError = ErrorType<ErrorResponse>;
/**
* @summary Create a staff/admin user (admin only)
*/
export declare const useCreateBackendStaff: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBackendStaff>>, TError, {
        data: BodyType<CreateStaffBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createBackendStaff>>, TError, {
    data: BodyType<CreateStaffBody>;
}, TContext>;
export declare const getUpdateBackendStaffUrl: (id: number) => string;
/**
 * JWT required. Backend dashboard RBAC applies by staff role and scoped shop access.
 * @summary Update staff user
 */
export declare const updateBackendStaff: (id: number, updateStaffBody: UpdateStaffBody, options?: Parameters<typeof customFetch>[1]) => Promise<User>;
export declare const getUpdateBackendStaffMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBackendStaff>>, TError, {
        id: number;
        data: BodyType<UpdateStaffBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateBackendStaff>>, TError, {
    id: number;
    data: BodyType<UpdateStaffBody>;
}, TContext>;
export type UpdateBackendStaffMutationResult = NonNullable<Awaited<ReturnType<typeof updateBackendStaff>>>;
export type UpdateBackendStaffMutationBody = BodyType<UpdateStaffBody>;
export type UpdateBackendStaffMutationError = ErrorType<ErrorResponse>;
/**
* @summary Update staff user
*/
export declare const useUpdateBackendStaff: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBackendStaff>>, TError, {
        id: number;
        data: BodyType<UpdateStaffBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateBackendStaff>>, TError, {
    id: number;
    data: BodyType<UpdateStaffBody>;
}, TContext>;
export declare const getDeleteBackendStaffUrl: (id: number) => string;
/**
 * JWT required. Backend dashboard RBAC applies by staff role and scoped shop access.
 * @summary Delete staff user
 */
export declare const deleteBackendStaff: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteBackendStaffMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBackendStaff>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteBackendStaff>>, TError, {
    id: number;
}, TContext>;
export type DeleteBackendStaffMutationResult = NonNullable<Awaited<ReturnType<typeof deleteBackendStaff>>>;
export type DeleteBackendStaffMutationError = ErrorType<ErrorResponse>;
/**
* @summary Delete staff user
*/
export declare const useDeleteBackendStaff: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBackendStaff>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteBackendStaff>>, TError, {
    id: number;
}, TContext>;
export declare const getListBackendTodosUrl: () => string;
/**
 * JWT required. Backend dashboard RBAC applies by staff role and scoped shop access.
 * @summary List dashboard todos for current user
 */
export declare const listBackendTodos: (options?: Parameters<typeof customFetch>[1]) => Promise<DashboardTodo[]>;
export declare const getListBackendTodosQueryKey: () => readonly ["/api/backend/todos"];
export declare const getListBackendTodosQueryOptions: <TData = Awaited<ReturnType<typeof listBackendTodos>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendTodos>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBackendTodos>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBackendTodosQueryResult = NonNullable<Awaited<ReturnType<typeof listBackendTodos>>>;
export type ListBackendTodosQueryError = ErrorType<ErrorResponse>;
/**
 * @summary List dashboard todos for current user
 */
export declare function useListBackendTodos<TData = Awaited<ReturnType<typeof listBackendTodos>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendTodos>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateBackendTodoUrl: () => string;
/**
 * JWT required. Backend dashboard RBAC applies by staff role and scoped shop access.
 * @summary Create a todo
 */
export declare const createBackendTodo: (createTodoBody: CreateTodoBody, options?: Parameters<typeof customFetch>[1]) => Promise<DashboardTodo>;
export declare const getCreateBackendTodoMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBackendTodo>>, TError, {
        data: BodyType<CreateTodoBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createBackendTodo>>, TError, {
    data: BodyType<CreateTodoBody>;
}, TContext>;
export type CreateBackendTodoMutationResult = NonNullable<Awaited<ReturnType<typeof createBackendTodo>>>;
export type CreateBackendTodoMutationBody = BodyType<CreateTodoBody>;
export type CreateBackendTodoMutationError = ErrorType<ErrorResponse>;
/**
* @summary Create a todo
*/
export declare const useCreateBackendTodo: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBackendTodo>>, TError, {
        data: BodyType<CreateTodoBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createBackendTodo>>, TError, {
    data: BodyType<CreateTodoBody>;
}, TContext>;
export declare const getToggleBackendTodoUrl: (id: number) => string;
/**
 * JWT required. Backend dashboard RBAC applies by staff role and scoped shop access.
 * @summary Toggle done status of a todo
 */
export declare const toggleBackendTodo: (id: number, toggleBackendTodoBody: ToggleBackendTodoBody, options?: Parameters<typeof customFetch>[1]) => Promise<DashboardTodo>;
export declare const getToggleBackendTodoMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof toggleBackendTodo>>, TError, {
        id: number;
        data: BodyType<ToggleBackendTodoBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof toggleBackendTodo>>, TError, {
    id: number;
    data: BodyType<ToggleBackendTodoBody>;
}, TContext>;
export type ToggleBackendTodoMutationResult = NonNullable<Awaited<ReturnType<typeof toggleBackendTodo>>>;
export type ToggleBackendTodoMutationBody = BodyType<ToggleBackendTodoBody>;
export type ToggleBackendTodoMutationError = ErrorType<ErrorResponse>;
/**
* @summary Toggle done status of a todo
*/
export declare const useToggleBackendTodo: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof toggleBackendTodo>>, TError, {
        id: number;
        data: BodyType<ToggleBackendTodoBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof toggleBackendTodo>>, TError, {
    id: number;
    data: BodyType<ToggleBackendTodoBody>;
}, TContext>;
export declare const getDeleteBackendTodoUrl: (id: number) => string;
/**
 * JWT required. Backend dashboard RBAC applies by staff role and scoped shop access.
 * @summary Delete a todo
 */
export declare const deleteBackendTodo: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteBackendTodoMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBackendTodo>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteBackendTodo>>, TError, {
    id: number;
}, TContext>;
export type DeleteBackendTodoMutationResult = NonNullable<Awaited<ReturnType<typeof deleteBackendTodo>>>;
export type DeleteBackendTodoMutationError = ErrorType<ErrorResponse>;
/**
* @summary Delete a todo
*/
export declare const useDeleteBackendTodo: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBackendTodo>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteBackendTodo>>, TError, {
    id: number;
}, TContext>;
export declare const getGetUserConsentsUrl: () => string;
/**
 * @summary Get privacy consents and current legal versions
 */
export declare const getUserConsents: (options?: Parameters<typeof customFetch>[1]) => Promise<UserConsentsWithVersions>;
export declare const getGetUserConsentsQueryKey: () => readonly ["/api/consents"];
export declare const getGetUserConsentsQueryOptions: <TData = Awaited<ReturnType<typeof getUserConsents>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUserConsents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getUserConsents>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetUserConsentsQueryResult = NonNullable<Awaited<ReturnType<typeof getUserConsents>>>;
export type GetUserConsentsQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get privacy consents and current legal versions
 */
export declare function useGetUserConsents<TData = Awaited<ReturnType<typeof getUserConsents>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUserConsents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateUserConsentsUrl: () => string;
/**
 * @summary Update privacy consents
 */
export declare const updateUserConsents: (updateUserConsentsBody: UpdateUserConsentsBody, options?: Parameters<typeof customFetch>[1]) => Promise<UserConsents>;
export declare const getUpdateUserConsentsMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUserConsents>>, TError, {
        data: BodyType<UpdateUserConsentsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateUserConsents>>, TError, {
    data: BodyType<UpdateUserConsentsBody>;
}, TContext>;
export type UpdateUserConsentsMutationResult = NonNullable<Awaited<ReturnType<typeof updateUserConsents>>>;
export type UpdateUserConsentsMutationBody = BodyType<UpdateUserConsentsBody>;
export type UpdateUserConsentsMutationError = ErrorType<ErrorResponse>;
/**
* @summary Update privacy consents
*/
export declare const useUpdateUserConsents: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUserConsents>>, TError, {
        data: BodyType<UpdateUserConsentsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateUserConsents>>, TError, {
    data: BodyType<UpdateUserConsentsBody>;
}, TContext>;
export declare const getAcceptAllConsentsUrl: () => string;
/**
 * @summary Accept all privacy consents
 */
export declare const acceptAllConsents: (options?: Parameters<typeof customFetch>[1]) => Promise<UserConsents>;
export declare const getAcceptAllConsentsMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof acceptAllConsents>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof acceptAllConsents>>, TError, void, TContext>;
export type AcceptAllConsentsMutationResult = NonNullable<Awaited<ReturnType<typeof acceptAllConsents>>>;
export type AcceptAllConsentsMutationError = ErrorType<ErrorResponse>;
/**
* @summary Accept all privacy consents
*/
export declare const useAcceptAllConsents: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof acceptAllConsents>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof acceptAllConsents>>, TError, void, TContext>;
export declare const getRejectAllConsentsUrl: () => string;
/**
 * @summary Reject optional privacy consents
 */
export declare const rejectAllConsents: (options?: Parameters<typeof customFetch>[1]) => Promise<UserConsents>;
export declare const getRejectAllConsentsMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof rejectAllConsents>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof rejectAllConsents>>, TError, void, TContext>;
export type RejectAllConsentsMutationResult = NonNullable<Awaited<ReturnType<typeof rejectAllConsents>>>;
export type RejectAllConsentsMutationError = ErrorType<ErrorResponse>;
/**
* @summary Reject optional privacy consents
*/
export declare const useRejectAllConsents: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof rejectAllConsents>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof rejectAllConsents>>, TError, void, TContext>;
export declare const getListDriversUrl: (params?: ListDriversParams) => string;
/**
 * @summary List drivers
 */
export declare const listDrivers: (params?: ListDriversParams, options?: Parameters<typeof customFetch>[1]) => Promise<Driver[]>;
export declare const getListDriversQueryKey: (params?: ListDriversParams) => readonly ["/api/drivers", ...ListDriversParams[]];
export declare const getListDriversQueryOptions: <TData = Awaited<ReturnType<typeof listDrivers>>, TError = ErrorType<unknown>>(params?: ListDriversParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listDrivers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listDrivers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListDriversQueryResult = NonNullable<Awaited<ReturnType<typeof listDrivers>>>;
export type ListDriversQueryError = ErrorType<unknown>;
/**
 * @summary List drivers
 */
export declare function useListDrivers<TData = Awaited<ReturnType<typeof listDrivers>>, TError = ErrorType<unknown>>(params?: ListDriversParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listDrivers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetDriverUrl: (id: number) => string;
/**
 * @summary Get a driver
 */
export declare const getDriver: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<Driver>;
export declare const getGetDriverQueryKey: (id: number) => readonly [`/api/drivers/${number}`];
export declare const getGetDriverQueryOptions: <TData = Awaited<ReturnType<typeof getDriver>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDriver>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDriver>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDriverQueryResult = NonNullable<Awaited<ReturnType<typeof getDriver>>>;
export type GetDriverQueryError = ErrorType<unknown>;
/**
 * @summary Get a driver
 */
export declare function useGetDriver<TData = Awaited<ReturnType<typeof getDriver>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDriver>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateDriverUrl: (id: number) => string;
/**
 * JWT required. Driver owner or admin only.
 * @summary Update driver info
 */
export declare const updateDriver: (id: number, updateDriverBody: UpdateDriverBody, options?: Parameters<typeof customFetch>[1]) => Promise<Driver>;
export declare const getUpdateDriverMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateDriver>>, TError, {
        id: number;
        data: BodyType<UpdateDriverBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateDriver>>, TError, {
    id: number;
    data: BodyType<UpdateDriverBody>;
}, TContext>;
export type UpdateDriverMutationResult = NonNullable<Awaited<ReturnType<typeof updateDriver>>>;
export type UpdateDriverMutationBody = BodyType<UpdateDriverBody>;
export type UpdateDriverMutationError = ErrorType<unknown>;
/**
* @summary Update driver info
*/
export declare const useUpdateDriver: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateDriver>>, TError, {
        id: number;
        data: BodyType<UpdateDriverBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateDriver>>, TError, {
    id: number;
    data: BodyType<UpdateDriverBody>;
}, TContext>;
export declare const getCompleteDriverProfileUrl: (id: number) => string;
/**
 * @summary Complete a driver profile
 */
export declare const completeDriverProfile: (id: number, completeDriverProfileBody: CompleteDriverProfileBody, options?: Parameters<typeof customFetch>[1]) => Promise<Driver>;
export declare const getCompleteDriverProfileMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof completeDriverProfile>>, TError, {
        id: number;
        data: BodyType<CompleteDriverProfileBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof completeDriverProfile>>, TError, {
    id: number;
    data: BodyType<CompleteDriverProfileBody>;
}, TContext>;
export type CompleteDriverProfileMutationResult = NonNullable<Awaited<ReturnType<typeof completeDriverProfile>>>;
export type CompleteDriverProfileMutationBody = BodyType<CompleteDriverProfileBody>;
export type CompleteDriverProfileMutationError = ErrorType<ErrorResponse>;
/**
* @summary Complete a driver profile
*/
export declare const useCompleteDriverProfile: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof completeDriverProfile>>, TError, {
        id: number;
        data: BodyType<CompleteDriverProfileBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof completeDriverProfile>>, TError, {
    id: number;
    data: BodyType<CompleteDriverProfileBody>;
}, TContext>;
export declare const getGetDriverEarningsUrl: (id: number) => string;
/**
 * JWT required. Driver owner or admin only.
 * @summary Get driver earnings summary
 */
export declare const getDriverEarnings: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<DriverEarnings>;
export declare const getGetDriverEarningsQueryKey: (id: number) => readonly [`/api/drivers/${number}/earnings`];
export declare const getGetDriverEarningsQueryOptions: <TData = Awaited<ReturnType<typeof getDriverEarnings>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDriverEarnings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDriverEarnings>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDriverEarningsQueryResult = NonNullable<Awaited<ReturnType<typeof getDriverEarnings>>>;
export type GetDriverEarningsQueryError = ErrorType<unknown>;
/**
 * @summary Get driver earnings summary
 */
export declare function useGetDriverEarnings<TData = Awaited<ReturnType<typeof getDriverEarnings>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDriverEarnings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateDriverLocationUrl: (id: number) => string;
/**
 * @summary Update driver live location
 */
export declare const updateDriverLocation: (id: number, driverLocationUpdateBody: DriverLocationUpdateBody, options?: Parameters<typeof customFetch>[1]) => Promise<DriverLocation>;
export declare const getUpdateDriverLocationMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateDriverLocation>>, TError, {
        id: number;
        data: BodyType<DriverLocationUpdateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateDriverLocation>>, TError, {
    id: number;
    data: BodyType<DriverLocationUpdateBody>;
}, TContext>;
export type UpdateDriverLocationMutationResult = NonNullable<Awaited<ReturnType<typeof updateDriverLocation>>>;
export type UpdateDriverLocationMutationBody = BodyType<DriverLocationUpdateBody>;
export type UpdateDriverLocationMutationError = ErrorType<ErrorResponse>;
/**
* @summary Update driver live location
*/
export declare const useUpdateDriverLocation: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateDriverLocation>>, TError, {
        id: number;
        data: BodyType<DriverLocationUpdateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateDriverLocation>>, TError, {
    id: number;
    data: BodyType<DriverLocationUpdateBody>;
}, TContext>;
export declare const getGetDriverLocationUrl: (id: number) => string;
/**
 * @summary Get driver live location
 */
export declare const getDriverLocation: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<DriverLocationPublic>;
export declare const getGetDriverLocationQueryKey: (id: number) => readonly [`/api/drivers/${number}/location`];
export declare const getGetDriverLocationQueryOptions: <TData = Awaited<ReturnType<typeof getDriverLocation>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDriverLocation>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDriverLocation>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDriverLocationQueryResult = NonNullable<Awaited<ReturnType<typeof getDriverLocation>>>;
export type GetDriverLocationQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get driver live location
 */
export declare function useGetDriverLocation<TData = Awaited<ReturnType<typeof getDriverLocation>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDriverLocation>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSubscribeEventsUrl: (params: SubscribeEventsParams) => string;
/**
 * @summary Subscribe to server-sent events
 */
export declare const subscribeEvents: (params: SubscribeEventsParams, options?: Parameters<typeof customFetch>[1]) => Promise<string>;
export declare const getSubscribeEventsQueryKey: (params?: SubscribeEventsParams) => readonly ["/api/events", ...SubscribeEventsParams[]];
export declare const getSubscribeEventsQueryOptions: <TData = Awaited<ReturnType<typeof subscribeEvents>>, TError = ErrorType<ErrorResponse>>(params: SubscribeEventsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof subscribeEvents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof subscribeEvents>>, TError, TData> & {
    queryKey: QueryKey;
};
export type SubscribeEventsQueryResult = NonNullable<Awaited<ReturnType<typeof subscribeEvents>>>;
export type SubscribeEventsQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Subscribe to server-sent events
 */
export declare function useSubscribeEvents<TData = Awaited<ReturnType<typeof subscribeEvents>>, TError = ErrorType<ErrorResponse>>(params: SubscribeEventsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof subscribeEvents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListFavoritesUrl: () => string;
/**
 * @summary List favorite restaurants for current user
 */
export declare const listFavorites: (options?: Parameters<typeof customFetch>[1]) => Promise<FavoriteWithRestaurant[]>;
export declare const getListFavoritesQueryKey: () => readonly ["/api/favorites"];
export declare const getListFavoritesQueryOptions: <TData = Awaited<ReturnType<typeof listFavorites>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listFavorites>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listFavorites>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListFavoritesQueryResult = NonNullable<Awaited<ReturnType<typeof listFavorites>>>;
export type ListFavoritesQueryError = ErrorType<ErrorResponse>;
/**
 * @summary List favorite restaurants for current user
 */
export declare function useListFavorites<TData = Awaited<ReturnType<typeof listFavorites>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listFavorites>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAddFavoriteUrl: () => string;
/**
 * @summary Add a restaurant to favorites
 */
export declare const addFavorite: (favoriteBody: FavoriteBody, options?: Parameters<typeof customFetch>[1]) => Promise<Favorite>;
export declare const getAddFavoriteMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addFavorite>>, TError, {
        data: BodyType<FavoriteBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof addFavorite>>, TError, {
    data: BodyType<FavoriteBody>;
}, TContext>;
export type AddFavoriteMutationResult = NonNullable<Awaited<ReturnType<typeof addFavorite>>>;
export type AddFavoriteMutationBody = BodyType<FavoriteBody>;
export type AddFavoriteMutationError = ErrorType<ErrorResponse>;
/**
* @summary Add a restaurant to favorites
*/
export declare const useAddFavorite: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addFavorite>>, TError, {
        data: BodyType<FavoriteBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof addFavorite>>, TError, {
    data: BodyType<FavoriteBody>;
}, TContext>;
export declare const getDeleteFavoriteUrl: (restaurantId: number) => string;
/**
 * @summary Remove a restaurant from favorites
 */
export declare const deleteFavorite: (restaurantId: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteFavoriteMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteFavorite>>, TError, {
        restaurantId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteFavorite>>, TError, {
    restaurantId: number;
}, TContext>;
export type DeleteFavoriteMutationResult = NonNullable<Awaited<ReturnType<typeof deleteFavorite>>>;
export type DeleteFavoriteMutationError = ErrorType<ErrorResponse>;
/**
* @summary Remove a restaurant from favorites
*/
export declare const useDeleteFavorite: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteFavorite>>, TError, {
        restaurantId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteFavorite>>, TError, {
    restaurantId: number;
}, TContext>;
export declare const getHealthCheckUrl: () => string;
/**
 * @summary Health check
 */
export declare const healthCheck: (options?: Parameters<typeof customFetch>[1]) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getDeleteMyDataUrl: () => string;
/**
 * @summary Delete current user account and related data
 */
export declare const deleteMyData: (options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteMyDataMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteMyData>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteMyData>>, TError, void, TContext>;
export type DeleteMyDataMutationResult = NonNullable<Awaited<ReturnType<typeof deleteMyData>>>;
export type DeleteMyDataMutationError = ErrorType<ErrorResponse>;
/**
* @summary Delete current user account and related data
*/
export declare const useDeleteMyData: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteMyData>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteMyData>>, TError, void, TContext>;
export declare const getExportMyDataUrl: () => string;
/**
 * @summary Export current user personal data
 */
export declare const exportMyData: (options?: Parameters<typeof customFetch>[1]) => Promise<UserDataExport>;
export declare const getExportMyDataQueryKey: () => readonly ["/api/me/export"];
export declare const getExportMyDataQueryOptions: <TData = Awaited<ReturnType<typeof exportMyData>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof exportMyData>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof exportMyData>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ExportMyDataQueryResult = NonNullable<Awaited<ReturnType<typeof exportMyData>>>;
export type ExportMyDataQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Export current user personal data
 */
export declare function useExportMyData<TData = Awaited<ReturnType<typeof exportMyData>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof exportMyData>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetMenuItemUrl: (id: number) => string;
/**
 * @summary Get a menu item
 */
export declare const getMenuItem: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<MenuItem>;
export declare const getGetMenuItemQueryKey: (id: number) => readonly [`/api/menu/${number}`];
export declare const getGetMenuItemQueryOptions: <TData = Awaited<ReturnType<typeof getMenuItem>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMenuItem>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMenuItem>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMenuItemQueryResult = NonNullable<Awaited<ReturnType<typeof getMenuItem>>>;
export type GetMenuItemQueryError = ErrorType<unknown>;
/**
 * @summary Get a menu item
 */
export declare function useGetMenuItem<TData = Awaited<ReturnType<typeof getMenuItem>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMenuItem>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateMenuItemUrl: (id: number) => string;
/**
 * RBAC: admin or owning restaurant_owner.
 * @summary Update a menu item
 */
export declare const updateMenuItem: (id: number, updateMenuItemBody: UpdateMenuItemBody, options?: Parameters<typeof customFetch>[1]) => Promise<MenuItem>;
export declare const getUpdateMenuItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMenuItem>>, TError, {
        id: number;
        data: BodyType<UpdateMenuItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateMenuItem>>, TError, {
    id: number;
    data: BodyType<UpdateMenuItemBody>;
}, TContext>;
export type UpdateMenuItemMutationResult = NonNullable<Awaited<ReturnType<typeof updateMenuItem>>>;
export type UpdateMenuItemMutationBody = BodyType<UpdateMenuItemBody>;
export type UpdateMenuItemMutationError = ErrorType<unknown>;
/**
* @summary Update a menu item
*/
export declare const useUpdateMenuItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMenuItem>>, TError, {
        id: number;
        data: BodyType<UpdateMenuItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateMenuItem>>, TError, {
    id: number;
    data: BodyType<UpdateMenuItemBody>;
}, TContext>;
export declare const getDeleteMenuItemUrl: (id: number) => string;
/**
 * RBAC: admin or owning restaurant_owner.
 * @summary Delete a menu item
 */
export declare const deleteMenuItem: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteMenuItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteMenuItem>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteMenuItem>>, TError, {
    id: number;
}, TContext>;
export type DeleteMenuItemMutationResult = NonNullable<Awaited<ReturnType<typeof deleteMenuItem>>>;
export type DeleteMenuItemMutationError = ErrorType<unknown>;
/**
* @summary Delete a menu item
*/
export declare const useDeleteMenuItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteMenuItem>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteMenuItem>>, TError, {
    id: number;
}, TContext>;
export declare const getGetNotificationPrefsUrl: () => string;
/**
 * @summary Get notification preferences
 */
export declare const getNotificationPrefs: (options?: Parameters<typeof customFetch>[1]) => Promise<NotificationPrefs>;
export declare const getGetNotificationPrefsQueryKey: () => readonly ["/api/notification-prefs"];
export declare const getGetNotificationPrefsQueryOptions: <TData = Awaited<ReturnType<typeof getNotificationPrefs>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNotificationPrefs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getNotificationPrefs>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetNotificationPrefsQueryResult = NonNullable<Awaited<ReturnType<typeof getNotificationPrefs>>>;
export type GetNotificationPrefsQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get notification preferences
 */
export declare function useGetNotificationPrefs<TData = Awaited<ReturnType<typeof getNotificationPrefs>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNotificationPrefs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateNotificationPrefsUrl: () => string;
/**
 * @summary Update notification preferences
 */
export declare const updateNotificationPrefs: (updateNotificationPrefsBody: UpdateNotificationPrefsBody, options?: Parameters<typeof customFetch>[1]) => Promise<NotificationPrefs>;
export declare const getUpdateNotificationPrefsMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateNotificationPrefs>>, TError, {
        data: BodyType<UpdateNotificationPrefsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateNotificationPrefs>>, TError, {
    data: BodyType<UpdateNotificationPrefsBody>;
}, TContext>;
export type UpdateNotificationPrefsMutationResult = NonNullable<Awaited<ReturnType<typeof updateNotificationPrefs>>>;
export type UpdateNotificationPrefsMutationBody = BodyType<UpdateNotificationPrefsBody>;
export type UpdateNotificationPrefsMutationError = ErrorType<ErrorResponse>;
/**
* @summary Update notification preferences
*/
export declare const useUpdateNotificationPrefs: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateNotificationPrefs>>, TError, {
        data: BodyType<UpdateNotificationPrefsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateNotificationPrefs>>, TError, {
    data: BodyType<UpdateNotificationPrefsBody>;
}, TContext>;
export declare const getListOrdersUrl: (params?: ListOrdersParams) => string;
/**
 * JWT required. Customers are scoped to their own orders unless using restaurant/driver filters as allowed by role.
 * @summary List orders
 */
export declare const listOrders: (params?: ListOrdersParams, options?: Parameters<typeof customFetch>[1]) => Promise<Order[]>;
export declare const getListOrdersQueryKey: (params?: ListOrdersParams) => readonly ["/api/orders", ...ListOrdersParams[]];
export declare const getListOrdersQueryOptions: <TData = Awaited<ReturnType<typeof listOrders>>, TError = ErrorType<unknown>>(params?: ListOrdersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listOrders>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListOrdersQueryResult = NonNullable<Awaited<ReturnType<typeof listOrders>>>;
export type ListOrdersQueryError = ErrorType<unknown>;
/**
 * @summary List orders
 */
export declare function useListOrders<TData = Awaited<ReturnType<typeof listOrders>>, TError = ErrorType<unknown>>(params?: ListOrdersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateOrderUrl: () => string;
/**
 * JWT required. Creates an order for the current user.
 * @summary Place a new order
 */
export declare const createOrder: (createOrderBody: CreateOrderBody, options?: Parameters<typeof customFetch>[1]) => Promise<Order>;
export declare const getCreateOrderMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOrder>>, TError, {
        data: BodyType<CreateOrderBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createOrder>>, TError, {
    data: BodyType<CreateOrderBody>;
}, TContext>;
export type CreateOrderMutationResult = NonNullable<Awaited<ReturnType<typeof createOrder>>>;
export type CreateOrderMutationBody = BodyType<CreateOrderBody>;
export type CreateOrderMutationError = ErrorType<unknown>;
/**
* @summary Place a new order
*/
export declare const useCreateOrder: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOrder>>, TError, {
        data: BodyType<CreateOrderBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createOrder>>, TError, {
    data: BodyType<CreateOrderBody>;
}, TContext>;
export declare const getGetOrderUrl: (id: number) => string;
/**
 * @summary Get an order
 */
export declare const getOrder: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<Order>;
export declare const getGetOrderQueryKey: (id: number) => readonly [`/api/orders/${number}`];
export declare const getGetOrderQueryOptions: <TData = Awaited<ReturnType<typeof getOrder>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOrder>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getOrder>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetOrderQueryResult = NonNullable<Awaited<ReturnType<typeof getOrder>>>;
export type GetOrderQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get an order
 */
export declare function useGetOrder<TData = Awaited<ReturnType<typeof getOrder>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOrder>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAcceptOrderDeliveryUrl: (id: number) => string;
/**
 * @summary Driver accepts a ready order for delivery
 */
export declare const acceptOrderDelivery: (id: number, acceptDeliveryBody: AcceptDeliveryBody, options?: Parameters<typeof customFetch>[1]) => Promise<Order>;
export declare const getAcceptOrderDeliveryMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof acceptOrderDelivery>>, TError, {
        id: number;
        data: BodyType<AcceptDeliveryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof acceptOrderDelivery>>, TError, {
    id: number;
    data: BodyType<AcceptDeliveryBody>;
}, TContext>;
export type AcceptOrderDeliveryMutationResult = NonNullable<Awaited<ReturnType<typeof acceptOrderDelivery>>>;
export type AcceptOrderDeliveryMutationBody = BodyType<AcceptDeliveryBody>;
export type AcceptOrderDeliveryMutationError = ErrorType<ErrorResponse>;
/**
* @summary Driver accepts a ready order for delivery
*/
export declare const useAcceptOrderDelivery: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof acceptOrderDelivery>>, TError, {
        id: number;
        data: BodyType<AcceptDeliveryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof acceptOrderDelivery>>, TError, {
    id: number;
    data: BodyType<AcceptDeliveryBody>;
}, TContext>;
export declare const getConfirmOrderDeliveryUrl: (id: number) => string;
/**
 * @summary Driver confirms delivery using the customer pickup code
 */
export declare const confirmOrderDelivery: (id: number, confirmDeliveryBody: ConfirmDeliveryBody, options?: Parameters<typeof customFetch>[1]) => Promise<Order>;
export declare const getConfirmOrderDeliveryMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof confirmOrderDelivery>>, TError, {
        id: number;
        data: BodyType<ConfirmDeliveryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof confirmOrderDelivery>>, TError, {
    id: number;
    data: BodyType<ConfirmDeliveryBody>;
}, TContext>;
export type ConfirmOrderDeliveryMutationResult = NonNullable<Awaited<ReturnType<typeof confirmOrderDelivery>>>;
export type ConfirmOrderDeliveryMutationBody = BodyType<ConfirmDeliveryBody>;
export type ConfirmOrderDeliveryMutationError = ErrorType<ErrorResponse>;
/**
* @summary Driver confirms delivery using the customer pickup code
*/
export declare const useConfirmOrderDelivery: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof confirmOrderDelivery>>, TError, {
        id: number;
        data: BodyType<ConfirmDeliveryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof confirmOrderDelivery>>, TError, {
    id: number;
    data: BodyType<ConfirmDeliveryBody>;
}, TContext>;
export declare const getGetOrderInvoiceUrl: (id: number, params?: GetOrderInvoiceParams) => string;
/**
 * @summary Get printable order invoice HTML
 */
export declare const getOrderInvoice: (id: number, params?: GetOrderInvoiceParams, options?: Parameters<typeof customFetch>[1]) => Promise<string>;
export declare const getGetOrderInvoiceQueryKey: (id: number, params?: GetOrderInvoiceParams) => readonly [`/api/orders/${number}/invoice`, ...GetOrderInvoiceParams[]];
export declare const getGetOrderInvoiceQueryOptions: <TData = Awaited<ReturnType<typeof getOrderInvoice>>, TError = ErrorType<void>>(id: number, params?: GetOrderInvoiceParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOrderInvoice>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getOrderInvoice>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetOrderInvoiceQueryResult = NonNullable<Awaited<ReturnType<typeof getOrderInvoice>>>;
export type GetOrderInvoiceQueryError = ErrorType<void>;
/**
 * @summary Get printable order invoice HTML
 */
export declare function useGetOrderInvoice<TData = Awaited<ReturnType<typeof getOrderInvoice>>, TError = ErrorType<void>>(id: number, params?: GetOrderInvoiceParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOrderInvoice>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetOrderReceiptUrl: (id: number, params?: GetOrderReceiptParams) => string;
/**
 * Restricted to admin or the owning restaurant owner. Supports bearer auth and token query auth.
 * @summary Get printable kitchen receipt HTML
 */
export declare const getOrderReceipt: (id: number, params?: GetOrderReceiptParams, options?: Parameters<typeof customFetch>[1]) => Promise<string>;
export declare const getGetOrderReceiptQueryKey: (id: number, params?: GetOrderReceiptParams) => readonly [`/api/orders/${number}/receipt`, ...GetOrderReceiptParams[]];
export declare const getGetOrderReceiptQueryOptions: <TData = Awaited<ReturnType<typeof getOrderReceipt>>, TError = ErrorType<void>>(id: number, params?: GetOrderReceiptParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOrderReceipt>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getOrderReceipt>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetOrderReceiptQueryResult = NonNullable<Awaited<ReturnType<typeof getOrderReceipt>>>;
export type GetOrderReceiptQueryError = ErrorType<void>;
/**
 * @summary Get printable kitchen receipt HTML
 */
export declare function useGetOrderReceipt<TData = Awaited<ReturnType<typeof getOrderReceipt>>, TError = ErrorType<void>>(id: number, params?: GetOrderReceiptParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOrderReceipt>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateOrderStatusUrl: (id: number) => string;
/**
 * JWT required. Additional role/ownership checks apply when accepting restaurant orders or assigning drivers.
 * @summary Update order status
 */
export declare const updateOrderStatus: (id: number, updateOrderStatusBody: UpdateOrderStatusBody, options?: Parameters<typeof customFetch>[1]) => Promise<Order>;
export declare const getUpdateOrderStatusMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateOrderStatus>>, TError, {
        id: number;
        data: BodyType<UpdateOrderStatusBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateOrderStatus>>, TError, {
    id: number;
    data: BodyType<UpdateOrderStatusBody>;
}, TContext>;
export type UpdateOrderStatusMutationResult = NonNullable<Awaited<ReturnType<typeof updateOrderStatus>>>;
export type UpdateOrderStatusMutationBody = BodyType<UpdateOrderStatusBody>;
export type UpdateOrderStatusMutationError = ErrorType<unknown>;
/**
* @summary Update order status
*/
export declare const useUpdateOrderStatus: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateOrderStatus>>, TError, {
        id: number;
        data: BodyType<UpdateOrderStatusBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateOrderStatus>>, TError, {
    id: number;
    data: BodyType<UpdateOrderStatusBody>;
}, TContext>;
export declare const getGetActiveOrdersUrl: () => string;
/**
 * @summary Get active orders for current driver
 */
export declare const getActiveOrders: (options?: Parameters<typeof customFetch>[1]) => Promise<Order[]>;
export declare const getGetActiveOrdersQueryKey: () => readonly ["/api/orders/active"];
export declare const getGetActiveOrdersQueryOptions: <TData = Awaited<ReturnType<typeof getActiveOrders>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getActiveOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getActiveOrders>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetActiveOrdersQueryResult = NonNullable<Awaited<ReturnType<typeof getActiveOrders>>>;
export type GetActiveOrdersQueryError = ErrorType<unknown>;
/**
 * @summary Get active orders for current driver
 */
export declare function useGetActiveOrders<TData = Awaited<ReturnType<typeof getActiveOrders>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getActiveOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetAvailableOrdersUrl: () => string;
/**
 * @summary List ready orders available for driver pickup
 */
export declare const getAvailableOrders: (options?: Parameters<typeof customFetch>[1]) => Promise<Order[]>;
export declare const getGetAvailableOrdersQueryKey: () => readonly ["/api/orders/available"];
export declare const getGetAvailableOrdersQueryOptions: <TData = Awaited<ReturnType<typeof getAvailableOrders>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAvailableOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAvailableOrders>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAvailableOrdersQueryResult = NonNullable<Awaited<ReturnType<typeof getAvailableOrders>>>;
export type GetAvailableOrdersQueryError = ErrorType<unknown>;
/**
 * @summary List ready orders available for driver pickup
 */
export declare function useGetAvailableOrders<TData = Awaited<ReturnType<typeof getAvailableOrders>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAvailableOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListPaymentMethodsUrl: () => string;
/**
 * @summary List current user's payment methods
 */
export declare const listPaymentMethods: (options?: Parameters<typeof customFetch>[1]) => Promise<PaymentMethod[]>;
export declare const getListPaymentMethodsQueryKey: () => readonly ["/api/payment-methods"];
export declare const getListPaymentMethodsQueryOptions: <TData = Awaited<ReturnType<typeof listPaymentMethods>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPaymentMethods>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listPaymentMethods>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListPaymentMethodsQueryResult = NonNullable<Awaited<ReturnType<typeof listPaymentMethods>>>;
export type ListPaymentMethodsQueryError = ErrorType<ErrorResponse>;
/**
 * @summary List current user's payment methods
 */
export declare function useListPaymentMethods<TData = Awaited<ReturnType<typeof listPaymentMethods>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPaymentMethods>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreatePaymentMethodUrl: () => string;
/**
 * @summary Create a payment method
 */
export declare const createPaymentMethod: (paymentMethodBody: PaymentMethodBody, options?: Parameters<typeof customFetch>[1]) => Promise<PaymentMethod>;
export declare const getCreatePaymentMethodMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPaymentMethod>>, TError, {
        data: BodyType<PaymentMethodBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createPaymentMethod>>, TError, {
    data: BodyType<PaymentMethodBody>;
}, TContext>;
export type CreatePaymentMethodMutationResult = NonNullable<Awaited<ReturnType<typeof createPaymentMethod>>>;
export type CreatePaymentMethodMutationBody = BodyType<PaymentMethodBody>;
export type CreatePaymentMethodMutationError = ErrorType<ErrorResponse>;
/**
* @summary Create a payment method
*/
export declare const useCreatePaymentMethod: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPaymentMethod>>, TError, {
        data: BodyType<PaymentMethodBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createPaymentMethod>>, TError, {
    data: BodyType<PaymentMethodBody>;
}, TContext>;
export declare const getUpdatePaymentMethodUrl: (id: number) => string;
/**
 * @summary Update a payment method
 */
export declare const updatePaymentMethod: (id: number, updatePaymentMethodBody: UpdatePaymentMethodBody, options?: Parameters<typeof customFetch>[1]) => Promise<PaymentMethod>;
export declare const getUpdatePaymentMethodMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updatePaymentMethod>>, TError, {
        id: number;
        data: BodyType<UpdatePaymentMethodBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updatePaymentMethod>>, TError, {
    id: number;
    data: BodyType<UpdatePaymentMethodBody>;
}, TContext>;
export type UpdatePaymentMethodMutationResult = NonNullable<Awaited<ReturnType<typeof updatePaymentMethod>>>;
export type UpdatePaymentMethodMutationBody = BodyType<UpdatePaymentMethodBody>;
export type UpdatePaymentMethodMutationError = ErrorType<ErrorResponse>;
/**
* @summary Update a payment method
*/
export declare const useUpdatePaymentMethod: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updatePaymentMethod>>, TError, {
        id: number;
        data: BodyType<UpdatePaymentMethodBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updatePaymentMethod>>, TError, {
    id: number;
    data: BodyType<UpdatePaymentMethodBody>;
}, TContext>;
export declare const getDeletePaymentMethodUrl: (id: number) => string;
/**
 * @summary Delete a payment method
 */
export declare const deletePaymentMethod: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeletePaymentMethodMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deletePaymentMethod>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deletePaymentMethod>>, TError, {
    id: number;
}, TContext>;
export type DeletePaymentMethodMutationResult = NonNullable<Awaited<ReturnType<typeof deletePaymentMethod>>>;
export type DeletePaymentMethodMutationError = ErrorType<ErrorResponse>;
/**
* @summary Delete a payment method
*/
export declare const useDeletePaymentMethod: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deletePaymentMethod>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deletePaymentMethod>>, TError, {
    id: number;
}, TContext>;
export declare const getCreateQuoteUrl: () => string;
/**
 * @summary Request a quote from a merchant
 */
export declare const createQuote: (createQuoteBody: CreateQuoteBody, options?: Parameters<typeof customFetch>[1]) => Promise<Quote>;
export declare const getCreateQuoteMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createQuote>>, TError, {
        data: BodyType<CreateQuoteBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createQuote>>, TError, {
    data: BodyType<CreateQuoteBody>;
}, TContext>;
export type CreateQuoteMutationResult = NonNullable<Awaited<ReturnType<typeof createQuote>>>;
export type CreateQuoteMutationBody = BodyType<CreateQuoteBody>;
export type CreateQuoteMutationError = ErrorType<ErrorResponse>;
/**
* @summary Request a quote from a merchant
*/
export declare const useCreateQuote: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createQuote>>, TError, {
        data: BodyType<CreateQuoteBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createQuote>>, TError, {
    data: BodyType<CreateQuoteBody>;
}, TContext>;
export declare const getListQuotesUrl: (params?: ListQuotesParams) => string;
/**
 * @summary List quotes visible to the current user
 */
export declare const listQuotes: (params?: ListQuotesParams, options?: Parameters<typeof customFetch>[1]) => Promise<Quote[]>;
export declare const getListQuotesQueryKey: (params?: ListQuotesParams) => readonly ["/api/quotes", ...ListQuotesParams[]];
export declare const getListQuotesQueryOptions: <TData = Awaited<ReturnType<typeof listQuotes>>, TError = ErrorType<ErrorResponse>>(params?: ListQuotesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listQuotes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listQuotes>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListQuotesQueryResult = NonNullable<Awaited<ReturnType<typeof listQuotes>>>;
export type ListQuotesQueryError = ErrorType<ErrorResponse>;
/**
 * @summary List quotes visible to the current user
 */
export declare function useListQuotes<TData = Awaited<ReturnType<typeof listQuotes>>, TError = ErrorType<ErrorResponse>>(params?: ListQuotesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listQuotes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetQuoteUrl: (id: number) => string;
/**
 * @summary Get a quote
 */
export declare const getQuote: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<Quote>;
export declare const getGetQuoteQueryKey: (id: number) => readonly [`/api/quotes/${number}`];
export declare const getGetQuoteQueryOptions: <TData = Awaited<ReturnType<typeof getQuote>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getQuote>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getQuote>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetQuoteQueryResult = NonNullable<Awaited<ReturnType<typeof getQuote>>>;
export type GetQuoteQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get a quote
 */
export declare function useGetQuote<TData = Awaited<ReturnType<typeof getQuote>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getQuote>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateQuoteUrl: (id: number) => string;
/**
 * @summary Update a quote status or merchant offer
 */
export declare const updateQuote: (id: number, updateQuoteBody: UpdateQuoteBody, options?: Parameters<typeof customFetch>[1]) => Promise<Quote>;
export declare const getUpdateQuoteMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateQuote>>, TError, {
        id: number;
        data: BodyType<UpdateQuoteBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateQuote>>, TError, {
    id: number;
    data: BodyType<UpdateQuoteBody>;
}, TContext>;
export type UpdateQuoteMutationResult = NonNullable<Awaited<ReturnType<typeof updateQuote>>>;
export type UpdateQuoteMutationBody = BodyType<UpdateQuoteBody>;
export type UpdateQuoteMutationError = ErrorType<ErrorResponse>;
/**
* @summary Update a quote status or merchant offer
*/
export declare const useUpdateQuote: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateQuote>>, TError, {
        id: number;
        data: BodyType<UpdateQuoteBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateQuote>>, TError, {
    id: number;
    data: BodyType<UpdateQuoteBody>;
}, TContext>;
export declare const getGetQuotePdfUrl: (id: number, params?: GetQuotePdfParams) => string;
/**
 * @summary Get printable quote document HTML
 */
export declare const getQuotePdf: (id: number, params?: GetQuotePdfParams, options?: Parameters<typeof customFetch>[1]) => Promise<string>;
export declare const getGetQuotePdfQueryKey: (id: number, params?: GetQuotePdfParams) => readonly [`/api/quotes/${number}/pdf`, ...GetQuotePdfParams[]];
export declare const getGetQuotePdfQueryOptions: <TData = Awaited<ReturnType<typeof getQuotePdf>>, TError = ErrorType<void>>(id: number, params?: GetQuotePdfParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getQuotePdf>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getQuotePdf>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetQuotePdfQueryResult = NonNullable<Awaited<ReturnType<typeof getQuotePdf>>>;
export type GetQuotePdfQueryError = ErrorType<void>;
/**
 * @summary Get printable quote document HTML
 */
export declare function useGetQuotePdf<TData = Awaited<ReturnType<typeof getQuotePdf>>, TError = ErrorType<void>>(id: number, params?: GetQuotePdfParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getQuotePdf>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListRestaurantsUrl: (params?: ListRestaurantsParams) => string;
/**
 * @summary List restaurants
 */
export declare const listRestaurants: (params?: ListRestaurantsParams, options?: Parameters<typeof customFetch>[1]) => Promise<Restaurant[]>;
export declare const getListRestaurantsQueryKey: (params?: ListRestaurantsParams) => readonly ["/api/restaurants", ...ListRestaurantsParams[]];
export declare const getListRestaurantsQueryOptions: <TData = Awaited<ReturnType<typeof listRestaurants>>, TError = ErrorType<unknown>>(params?: ListRestaurantsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRestaurants>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listRestaurants>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListRestaurantsQueryResult = NonNullable<Awaited<ReturnType<typeof listRestaurants>>>;
export type ListRestaurantsQueryError = ErrorType<unknown>;
/**
 * @summary List restaurants
 */
export declare function useListRestaurants<TData = Awaited<ReturnType<typeof listRestaurants>>, TError = ErrorType<unknown>>(params?: ListRestaurantsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRestaurants>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateRestaurantUrl: () => string;
/**
 * RBAC: admin only.
 * @summary Create a restaurant
 */
export declare const createRestaurant: (createRestaurantBody: CreateRestaurantBody, options?: Parameters<typeof customFetch>[1]) => Promise<Restaurant>;
export declare const getCreateRestaurantMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRestaurant>>, TError, {
        data: BodyType<CreateRestaurantBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createRestaurant>>, TError, {
    data: BodyType<CreateRestaurantBody>;
}, TContext>;
export type CreateRestaurantMutationResult = NonNullable<Awaited<ReturnType<typeof createRestaurant>>>;
export type CreateRestaurantMutationBody = BodyType<CreateRestaurantBody>;
export type CreateRestaurantMutationError = ErrorType<unknown>;
/**
* @summary Create a restaurant
*/
export declare const useCreateRestaurant: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRestaurant>>, TError, {
        data: BodyType<CreateRestaurantBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createRestaurant>>, TError, {
    data: BodyType<CreateRestaurantBody>;
}, TContext>;
export declare const getGetRestaurantUrl: (id: number) => string;
/**
 * @summary Get a restaurant
 */
export declare const getRestaurant: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<Restaurant>;
export declare const getGetRestaurantQueryKey: (id: number) => readonly [`/api/restaurants/${number}`];
export declare const getGetRestaurantQueryOptions: <TData = Awaited<ReturnType<typeof getRestaurant>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRestaurant>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRestaurant>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRestaurantQueryResult = NonNullable<Awaited<ReturnType<typeof getRestaurant>>>;
export type GetRestaurantQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get a restaurant
 */
export declare function useGetRestaurant<TData = Awaited<ReturnType<typeof getRestaurant>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRestaurant>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateRestaurantUrl: (id: number) => string;
/**
 * RBAC: admin or owning restaurant_owner.
 * @summary Update a restaurant
 */
export declare const updateRestaurant: (id: number, updateRestaurantBody: UpdateRestaurantBody, options?: Parameters<typeof customFetch>[1]) => Promise<Restaurant>;
export declare const getUpdateRestaurantMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateRestaurant>>, TError, {
        id: number;
        data: BodyType<UpdateRestaurantBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateRestaurant>>, TError, {
    id: number;
    data: BodyType<UpdateRestaurantBody>;
}, TContext>;
export type UpdateRestaurantMutationResult = NonNullable<Awaited<ReturnType<typeof updateRestaurant>>>;
export type UpdateRestaurantMutationBody = BodyType<UpdateRestaurantBody>;
export type UpdateRestaurantMutationError = ErrorType<unknown>;
/**
* @summary Update a restaurant
*/
export declare const useUpdateRestaurant: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateRestaurant>>, TError, {
        id: number;
        data: BodyType<UpdateRestaurantBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateRestaurant>>, TError, {
    id: number;
    data: BodyType<UpdateRestaurantBody>;
}, TContext>;
export declare const getDeleteRestaurantUrl: (id: number) => string;
/**
 * RBAC: admin only.
 * @summary Delete a restaurant
 */
export declare const deleteRestaurant: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteRestaurantMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteRestaurant>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteRestaurant>>, TError, {
    id: number;
}, TContext>;
export type DeleteRestaurantMutationResult = NonNullable<Awaited<ReturnType<typeof deleteRestaurant>>>;
export type DeleteRestaurantMutationError = ErrorType<unknown>;
/**
* @summary Delete a restaurant
*/
export declare const useDeleteRestaurant: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteRestaurant>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteRestaurant>>, TError, {
    id: number;
}, TContext>;
export declare const getCompleteRestaurantProfileUrl: (id: number) => string;
/**
 * RBAC: admin or the owning restaurant_owner. Required before accepting orders.
 * @summary Complete a restaurant business profile
 */
export declare const completeRestaurantProfile: (id: number, completeRestaurantProfileBody: CompleteRestaurantProfileBody, options?: Parameters<typeof customFetch>[1]) => Promise<Restaurant>;
export declare const getCompleteRestaurantProfileMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof completeRestaurantProfile>>, TError, {
        id: number;
        data: BodyType<CompleteRestaurantProfileBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof completeRestaurantProfile>>, TError, {
    id: number;
    data: BodyType<CompleteRestaurantProfileBody>;
}, TContext>;
export type CompleteRestaurantProfileMutationResult = NonNullable<Awaited<ReturnType<typeof completeRestaurantProfile>>>;
export type CompleteRestaurantProfileMutationBody = BodyType<CompleteRestaurantProfileBody>;
export type CompleteRestaurantProfileMutationError = ErrorType<ErrorResponse>;
/**
* @summary Complete a restaurant business profile
*/
export declare const useCompleteRestaurantProfile: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof completeRestaurantProfile>>, TError, {
        id: number;
        data: BodyType<CompleteRestaurantProfileBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof completeRestaurantProfile>>, TError, {
    id: number;
    data: BodyType<CompleteRestaurantProfileBody>;
}, TContext>;
export declare const getGetRestaurantStatsUrl: (id: number) => string;
/**
 * @summary Get restaurant statistics
 */
export declare const getRestaurantStats: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<RestaurantStats>;
export declare const getGetRestaurantStatsQueryKey: (id: number) => readonly [`/api/restaurants/${number}/stats`];
export declare const getGetRestaurantStatsQueryOptions: <TData = Awaited<ReturnType<typeof getRestaurantStats>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRestaurantStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRestaurantStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRestaurantStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getRestaurantStats>>>;
export type GetRestaurantStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get restaurant statistics
 */
export declare function useGetRestaurantStats<TData = Awaited<ReturnType<typeof getRestaurantStats>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRestaurantStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListMenuItemsUrl: (restaurantId: number, params?: ListMenuItemsParams) => string;
/**
 * @summary List menu items for a restaurant
 */
export declare const listMenuItems: (restaurantId: number, params?: ListMenuItemsParams, options?: Parameters<typeof customFetch>[1]) => Promise<MenuItem[]>;
export declare const getListMenuItemsQueryKey: (restaurantId: number, params?: ListMenuItemsParams) => readonly [`/api/restaurants/${number}/menu`, ...ListMenuItemsParams[]];
export declare const getListMenuItemsQueryOptions: <TData = Awaited<ReturnType<typeof listMenuItems>>, TError = ErrorType<unknown>>(restaurantId: number, params?: ListMenuItemsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMenuItems>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMenuItems>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMenuItemsQueryResult = NonNullable<Awaited<ReturnType<typeof listMenuItems>>>;
export type ListMenuItemsQueryError = ErrorType<unknown>;
/**
 * @summary List menu items for a restaurant
 */
export declare function useListMenuItems<TData = Awaited<ReturnType<typeof listMenuItems>>, TError = ErrorType<unknown>>(restaurantId: number, params?: ListMenuItemsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMenuItems>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateMenuItemUrl: (restaurantId: number) => string;
/**
 * RBAC: admin or owning restaurant_owner.
 * @summary Create a menu item
 */
export declare const createMenuItem: (restaurantId: number, createMenuItemBody: CreateMenuItemBody, options?: Parameters<typeof customFetch>[1]) => Promise<MenuItem>;
export declare const getCreateMenuItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createMenuItem>>, TError, {
        restaurantId: number;
        data: BodyType<CreateMenuItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createMenuItem>>, TError, {
    restaurantId: number;
    data: BodyType<CreateMenuItemBody>;
}, TContext>;
export type CreateMenuItemMutationResult = NonNullable<Awaited<ReturnType<typeof createMenuItem>>>;
export type CreateMenuItemMutationBody = BodyType<CreateMenuItemBody>;
export type CreateMenuItemMutationError = ErrorType<unknown>;
/**
* @summary Create a menu item
*/
export declare const useCreateMenuItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createMenuItem>>, TError, {
        restaurantId: number;
        data: BodyType<CreateMenuItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createMenuItem>>, TError, {
    restaurantId: number;
    data: BodyType<CreateMenuItemBody>;
}, TContext>;
export declare const getGetFeaturedRestaurantsUrl: () => string;
/**
 * @summary Get featured/top restaurants
 */
export declare const getFeaturedRestaurants: (options?: Parameters<typeof customFetch>[1]) => Promise<Restaurant[]>;
export declare const getGetFeaturedRestaurantsQueryKey: () => readonly ["/api/restaurants/featured"];
export declare const getGetFeaturedRestaurantsQueryOptions: <TData = Awaited<ReturnType<typeof getFeaturedRestaurants>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFeaturedRestaurants>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFeaturedRestaurants>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFeaturedRestaurantsQueryResult = NonNullable<Awaited<ReturnType<typeof getFeaturedRestaurants>>>;
export type GetFeaturedRestaurantsQueryError = ErrorType<unknown>;
/**
 * @summary Get featured/top restaurants
 */
export declare function useGetFeaturedRestaurants<TData = Awaited<ReturnType<typeof getFeaturedRestaurants>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFeaturedRestaurants>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListReviewsUrl: (params?: ListReviewsParams) => string;
/**
 * @summary List reviews
 */
export declare const listReviews: (params?: ListReviewsParams, options?: Parameters<typeof customFetch>[1]) => Promise<Review[]>;
export declare const getListReviewsQueryKey: (params?: ListReviewsParams) => readonly ["/api/reviews", ...ListReviewsParams[]];
export declare const getListReviewsQueryOptions: <TData = Awaited<ReturnType<typeof listReviews>>, TError = ErrorType<unknown>>(params?: ListReviewsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listReviews>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listReviews>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListReviewsQueryResult = NonNullable<Awaited<ReturnType<typeof listReviews>>>;
export type ListReviewsQueryError = ErrorType<unknown>;
/**
 * @summary List reviews
 */
export declare function useListReviews<TData = Awaited<ReturnType<typeof listReviews>>, TError = ErrorType<unknown>>(params?: ListReviewsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listReviews>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateReviewUrl: () => string;
/**
 * JWT required.
 * @summary Create a review
 */
export declare const createReview: (createReviewBody: CreateReviewBody, options?: Parameters<typeof customFetch>[1]) => Promise<Review>;
export declare const getCreateReviewMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createReview>>, TError, {
        data: BodyType<CreateReviewBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createReview>>, TError, {
    data: BodyType<CreateReviewBody>;
}, TContext>;
export type CreateReviewMutationResult = NonNullable<Awaited<ReturnType<typeof createReview>>>;
export type CreateReviewMutationBody = BodyType<CreateReviewBody>;
export type CreateReviewMutationError = ErrorType<unknown>;
/**
* @summary Create a review
*/
export declare const useCreateReview: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createReview>>, TError, {
        data: BodyType<CreateReviewBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createReview>>, TError, {
    data: BodyType<CreateReviewBody>;
}, TContext>;
export declare const getDeleteReviewUrl: (id: number) => string;
/**
 * JWT required. Review author or admin only.
 * @summary Delete a review
 */
export declare const deleteReview: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteReviewMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteReview>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteReview>>, TError, {
    id: number;
}, TContext>;
export type DeleteReviewMutationResult = NonNullable<Awaited<ReturnType<typeof deleteReview>>>;
export type DeleteReviewMutationError = ErrorType<unknown>;
/**
* @summary Delete a review
*/
export declare const useDeleteReview: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteReview>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteReview>>, TError, {
    id: number;
}, TContext>;
export declare const getGetMyRewardsUrl: () => string;
/**
 * @summary Get current user rewards/points
 */
export declare const getMyRewards: (options?: Parameters<typeof customFetch>[1]) => Promise<UserRewards>;
export declare const getGetMyRewardsQueryKey: () => readonly ["/api/rewards/my"];
export declare const getGetMyRewardsQueryOptions: <TData = Awaited<ReturnType<typeof getMyRewards>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMyRewards>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMyRewards>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMyRewardsQueryResult = NonNullable<Awaited<ReturnType<typeof getMyRewards>>>;
export type GetMyRewardsQueryError = ErrorType<unknown>;
/**
 * @summary Get current user rewards/points
 */
export declare function useGetMyRewards<TData = Awaited<ReturnType<typeof getMyRewards>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMyRewards>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetObjectUrl: (path: string) => string;
/**
 * @summary Serve an uploaded object
 */
export declare const getObject: (path: string, options?: Parameters<typeof customFetch>[1]) => Promise<Blob>;
export declare const getGetObjectQueryKey: (path: string) => readonly [`/api/storage/objects/${string}`];
export declare const getGetObjectQueryOptions: <TData = Awaited<ReturnType<typeof getObject>>, TError = ErrorType<ErrorResponse>>(path: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getObject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getObject>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetObjectQueryResult = NonNullable<Awaited<ReturnType<typeof getObject>>>;
export type GetObjectQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Serve an uploaded object
 */
export declare function useGetObject<TData = Awaited<ReturnType<typeof getObject>>, TError = ErrorType<ErrorResponse>>(path: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getObject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetPublicObjectUrl: (filePath: string) => string;
/**
 * @summary Serve a public object
 */
export declare const getPublicObject: (filePath: string, options?: Parameters<typeof customFetch>[1]) => Promise<Blob>;
export declare const getGetPublicObjectQueryKey: (filePath: string) => readonly [`/api/storage/public-objects/${string}`];
export declare const getGetPublicObjectQueryOptions: <TData = Awaited<ReturnType<typeof getPublicObject>>, TError = ErrorType<ErrorResponse>>(filePath: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPublicObject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPublicObject>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPublicObjectQueryResult = NonNullable<Awaited<ReturnType<typeof getPublicObject>>>;
export type GetPublicObjectQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Serve a public object
 */
export declare function useGetPublicObject<TData = Awaited<ReturnType<typeof getPublicObject>>, TError = ErrorType<ErrorResponse>>(filePath: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPublicObject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUploadImageUrl: () => string;
/**
 * RBAC: admin, super_admin, manager, or restaurant_owner. The server validates image bytes before storage.
 * @summary Upload and validate an image
 */
export declare const uploadImage: (uploadImageBody: Blob, options?: Parameters<typeof customFetch>[1]) => Promise<ImageUploadResponse>;
export declare const getUploadImageMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof uploadImage>>, TError, {
        data: BodyType<Blob>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof uploadImage>>, TError, {
    data: BodyType<Blob>;
}, TContext>;
export type UploadImageMutationResult = NonNullable<Awaited<ReturnType<typeof uploadImage>>>;
export type UploadImageMutationBody = BodyType<Blob>;
export type UploadImageMutationError = ErrorType<ErrorResponse>;
/**
* @summary Upload and validate an image
*/
export declare const useUploadImage: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof uploadImage>>, TError, {
        data: BodyType<Blob>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof uploadImage>>, TError, {
    data: BodyType<Blob>;
}, TContext>;
export declare const getListSupportTicketsUrl: () => string;
/**
 * Admins receive all tickets with user details; other users receive only their own tickets.
 * @summary List support tickets
 */
export declare const listSupportTickets: (options?: Parameters<typeof customFetch>[1]) => Promise<SupportTicket[]>;
export declare const getListSupportTicketsQueryKey: () => readonly ["/api/support-tickets"];
export declare const getListSupportTicketsQueryOptions: <TData = Awaited<ReturnType<typeof listSupportTickets>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSupportTickets>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSupportTickets>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSupportTicketsQueryResult = NonNullable<Awaited<ReturnType<typeof listSupportTickets>>>;
export type ListSupportTicketsQueryError = ErrorType<ErrorResponse>;
/**
 * @summary List support tickets
 */
export declare function useListSupportTickets<TData = Awaited<ReturnType<typeof listSupportTickets>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSupportTickets>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateSupportTicketUrl: () => string;
/**
 * @summary Create a support ticket
 */
export declare const createSupportTicket: (createSupportTicketBody: CreateSupportTicketBody, options?: Parameters<typeof customFetch>[1]) => Promise<SupportTicket>;
export declare const getCreateSupportTicketMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSupportTicket>>, TError, {
        data: BodyType<CreateSupportTicketBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSupportTicket>>, TError, {
    data: BodyType<CreateSupportTicketBody>;
}, TContext>;
export type CreateSupportTicketMutationResult = NonNullable<Awaited<ReturnType<typeof createSupportTicket>>>;
export type CreateSupportTicketMutationBody = BodyType<CreateSupportTicketBody>;
export type CreateSupportTicketMutationError = ErrorType<ErrorResponse>;
/**
* @summary Create a support ticket
*/
export declare const useCreateSupportTicket: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSupportTicket>>, TError, {
        data: BodyType<CreateSupportTicketBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSupportTicket>>, TError, {
    data: BodyType<CreateSupportTicketBody>;
}, TContext>;
export declare const getUpdateSupportTicketUrl: (id: number) => string;
/**
 * Admin only.
 * @summary Update support ticket status
 */
export declare const updateSupportTicket: (id: number, updateSupportTicketBody: UpdateSupportTicketBody, options?: Parameters<typeof customFetch>[1]) => Promise<SupportTicket>;
export declare const getUpdateSupportTicketMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSupportTicket>>, TError, {
        id: number;
        data: BodyType<UpdateSupportTicketBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateSupportTicket>>, TError, {
    id: number;
    data: BodyType<UpdateSupportTicketBody>;
}, TContext>;
export type UpdateSupportTicketMutationResult = NonNullable<Awaited<ReturnType<typeof updateSupportTicket>>>;
export type UpdateSupportTicketMutationBody = BodyType<UpdateSupportTicketBody>;
export type UpdateSupportTicketMutationError = ErrorType<ErrorResponse>;
/**
* @summary Update support ticket status
*/
export declare const useUpdateSupportTicket: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSupportTicket>>, TError, {
        id: number;
        data: BodyType<UpdateSupportTicketBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateSupportTicket>>, TError, {
    id: number;
    data: BodyType<UpdateSupportTicketBody>;
}, TContext>;
export declare const getDeleteSupportTicketUrl: (id: number) => string;
/**
 * Admin only.
 * @summary Delete a support ticket
 */
export declare const deleteSupportTicket: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteSupportTicketMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSupportTicket>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteSupportTicket>>, TError, {
    id: number;
}, TContext>;
export type DeleteSupportTicketMutationResult = NonNullable<Awaited<ReturnType<typeof deleteSupportTicket>>>;
export type DeleteSupportTicketMutationError = ErrorType<ErrorResponse>;
/**
* @summary Delete a support ticket
*/
export declare const useDeleteSupportTicket: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSupportTicket>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteSupportTicket>>, TError, {
    id: number;
}, TContext>;
export declare const getListUsersUrl: (params?: ListUsersParams) => string;
/**
 * @summary List users (admin)
 */
export declare const listUsers: (params?: ListUsersParams, options?: Parameters<typeof customFetch>[1]) => Promise<User[]>;
export declare const getListUsersQueryKey: (params?: ListUsersParams) => readonly ["/api/users", ...ListUsersParams[]];
export declare const getListUsersQueryOptions: <TData = Awaited<ReturnType<typeof listUsers>>, TError = ErrorType<unknown>>(params?: ListUsersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListUsersQueryResult = NonNullable<Awaited<ReturnType<typeof listUsers>>>;
export type ListUsersQueryError = ErrorType<unknown>;
/**
 * @summary List users (admin)
 */
export declare function useListUsers<TData = Awaited<ReturnType<typeof listUsers>>, TError = ErrorType<unknown>>(params?: ListUsersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetUserUrl: (id: number) => string;
/**
 * @summary Get a user
 */
export declare const getUser: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<User>;
export declare const getGetUserQueryKey: (id: number) => readonly [`/api/users/${number}`];
export declare const getGetUserQueryOptions: <TData = Awaited<ReturnType<typeof getUser>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getUser>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetUserQueryResult = NonNullable<Awaited<ReturnType<typeof getUser>>>;
export type GetUserQueryError = ErrorType<unknown>;
/**
 * @summary Get a user
 */
export declare function useGetUser<TData = Awaited<ReturnType<typeof getUser>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateUserUrl: (id: number) => string;
/**
 * JWT required. Users can update themselves; admins can update any user.
 * @summary Update a user
 */
export declare const updateUser: (id: number, updateUserBody: UpdateUserBody, options?: Parameters<typeof customFetch>[1]) => Promise<User>;
export declare const getUpdateUserMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUser>>, TError, {
        id: number;
        data: BodyType<UpdateUserBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateUser>>, TError, {
    id: number;
    data: BodyType<UpdateUserBody>;
}, TContext>;
export type UpdateUserMutationResult = NonNullable<Awaited<ReturnType<typeof updateUser>>>;
export type UpdateUserMutationBody = BodyType<UpdateUserBody>;
export type UpdateUserMutationError = ErrorType<unknown>;
/**
* @summary Update a user
*/
export declare const useUpdateUser: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUser>>, TError, {
        id: number;
        data: BodyType<UpdateUserBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateUser>>, TError, {
    id: number;
    data: BodyType<UpdateUserBody>;
}, TContext>;
export declare const getDeleteUserUrl: (id: number) => string;
/**
 * JWT required. Users can delete themselves; admins can delete any user.
 * @summary Delete a user (admin)
 */
export declare const deleteUser: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteUserMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteUser>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteUser>>, TError, {
    id: number;
}, TContext>;
export type DeleteUserMutationResult = NonNullable<Awaited<ReturnType<typeof deleteUser>>>;
export type DeleteUserMutationError = ErrorType<unknown>;
/**
* @summary Delete a user (admin)
*/
export declare const useDeleteUser: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteUser>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteUser>>, TError, {
    id: number;
}, TContext>;
export declare const getListCategoriesUrl: () => string;
/**
 * @summary List active categories with sub-categories
 */
export declare const listCategories: (options?: Parameters<typeof customFetch>[1]) => Promise<CategoryWithSubs[]>;
export declare const getListCategoriesQueryKey: () => readonly ["/api/categories"];
export declare const getListCategoriesQueryOptions: <TData = Awaited<ReturnType<typeof listCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listCategories>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListCategoriesQueryResult = NonNullable<Awaited<ReturnType<typeof listCategories>>>;
export type ListCategoriesQueryError = ErrorType<unknown>;
/**
 * @summary List active categories with sub-categories
 */
export declare function useListCategories<TData = Awaited<ReturnType<typeof listCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListAdsUrl: (params?: ListAdsParams) => string;
/**
 * @summary List active ads/promos
 */
export declare const listAds: (params?: ListAdsParams, options?: Parameters<typeof customFetch>[1]) => Promise<Ad[]>;
export declare const getListAdsQueryKey: (params?: ListAdsParams) => readonly ["/api/ads", ...ListAdsParams[]];
export declare const getListAdsQueryOptions: <TData = Awaited<ReturnType<typeof listAds>>, TError = ErrorType<unknown>>(params?: ListAdsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAds>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAds>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAdsQueryResult = NonNullable<Awaited<ReturnType<typeof listAds>>>;
export type ListAdsQueryError = ErrorType<unknown>;
/**
 * @summary List active ads/promos
 */
export declare function useListAds<TData = Awaited<ReturnType<typeof listAds>>, TError = ErrorType<unknown>>(params?: ListAdsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAds>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListShortsUrl: () => string;
/**
 * @summary List active shorts
 */
export declare const listShorts: (options?: Parameters<typeof customFetch>[1]) => Promise<Short[]>;
export declare const getListShortsQueryKey: () => readonly ["/api/shorts"];
export declare const getListShortsQueryOptions: <TData = Awaited<ReturnType<typeof listShorts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listShorts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listShorts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListShortsQueryResult = NonNullable<Awaited<ReturnType<typeof listShorts>>>;
export type ListShortsQueryError = ErrorType<unknown>;
/**
 * @summary List active shorts
 */
export declare function useListShorts<TData = Awaited<ReturnType<typeof listShorts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listShorts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListBackendCategoriesAllUrl: () => string;
/**
 * @summary List all categories (admin)
 */
export declare const listBackendCategoriesAll: (options?: Parameters<typeof customFetch>[1]) => Promise<CategoryWithSubs[]>;
export declare const getListBackendCategoriesAllQueryKey: () => readonly ["/api/backend/categories/all"];
export declare const getListBackendCategoriesAllQueryOptions: <TData = Awaited<ReturnType<typeof listBackendCategoriesAll>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendCategoriesAll>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBackendCategoriesAll>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBackendCategoriesAllQueryResult = NonNullable<Awaited<ReturnType<typeof listBackendCategoriesAll>>>;
export type ListBackendCategoriesAllQueryError = ErrorType<unknown>;
/**
 * @summary List all categories (admin)
 */
export declare function useListBackendCategoriesAll<TData = Awaited<ReturnType<typeof listBackendCategoriesAll>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendCategoriesAll>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateBackendCategoryUrl: (id: number) => string;
/**
 * @summary Update a category (admin)
 */
export declare const updateBackendCategory: (id: number, categoryBody: CategoryBody, options?: Parameters<typeof customFetch>[1]) => Promise<Category>;
export declare const getUpdateBackendCategoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBackendCategory>>, TError, {
        id: number;
        data: BodyType<CategoryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateBackendCategory>>, TError, {
    id: number;
    data: BodyType<CategoryBody>;
}, TContext>;
export type UpdateBackendCategoryMutationResult = NonNullable<Awaited<ReturnType<typeof updateBackendCategory>>>;
export type UpdateBackendCategoryMutationBody = BodyType<CategoryBody>;
export type UpdateBackendCategoryMutationError = ErrorType<unknown>;
/**
* @summary Update a category (admin)
*/
export declare const useUpdateBackendCategory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBackendCategory>>, TError, {
        id: number;
        data: BodyType<CategoryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateBackendCategory>>, TError, {
    id: number;
    data: BodyType<CategoryBody>;
}, TContext>;
export declare const getDeleteBackendCategoryUrl: (id: number) => string;
/**
 * @summary Delete a category (admin)
 */
export declare const deleteBackendCategory: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteBackendCategoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBackendCategory>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteBackendCategory>>, TError, {
    id: number;
}, TContext>;
export type DeleteBackendCategoryMutationResult = NonNullable<Awaited<ReturnType<typeof deleteBackendCategory>>>;
export type DeleteBackendCategoryMutationError = ErrorType<unknown>;
/**
* @summary Delete a category (admin)
*/
export declare const useDeleteBackendCategory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBackendCategory>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteBackendCategory>>, TError, {
    id: number;
}, TContext>;
export declare const getListBackendAdsUrl: () => string;
/**
 * @summary List all ads (admin)
 */
export declare const listBackendAds: (options?: Parameters<typeof customFetch>[1]) => Promise<Ad[]>;
export declare const getListBackendAdsQueryKey: () => readonly ["/api/backend/ads"];
export declare const getListBackendAdsQueryOptions: <TData = Awaited<ReturnType<typeof listBackendAds>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendAds>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBackendAds>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBackendAdsQueryResult = NonNullable<Awaited<ReturnType<typeof listBackendAds>>>;
export type ListBackendAdsQueryError = ErrorType<unknown>;
/**
 * @summary List all ads (admin)
 */
export declare function useListBackendAds<TData = Awaited<ReturnType<typeof listBackendAds>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendAds>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateBackendAdUrl: () => string;
/**
 * @summary Create an ad (admin)
 */
export declare const createBackendAd: (adBody: AdBody, options?: Parameters<typeof customFetch>[1]) => Promise<Ad>;
export declare const getCreateBackendAdMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBackendAd>>, TError, {
        data: BodyType<AdBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createBackendAd>>, TError, {
    data: BodyType<AdBody>;
}, TContext>;
export type CreateBackendAdMutationResult = NonNullable<Awaited<ReturnType<typeof createBackendAd>>>;
export type CreateBackendAdMutationBody = BodyType<AdBody>;
export type CreateBackendAdMutationError = ErrorType<unknown>;
/**
* @summary Create an ad (admin)
*/
export declare const useCreateBackendAd: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBackendAd>>, TError, {
        data: BodyType<AdBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createBackendAd>>, TError, {
    data: BodyType<AdBody>;
}, TContext>;
export declare const getUpdateBackendAdUrl: (id: number) => string;
/**
 * @summary Update an ad (admin)
 */
export declare const updateBackendAd: (id: number, adBody: AdBody, options?: Parameters<typeof customFetch>[1]) => Promise<Ad>;
export declare const getUpdateBackendAdMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBackendAd>>, TError, {
        id: number;
        data: BodyType<AdBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateBackendAd>>, TError, {
    id: number;
    data: BodyType<AdBody>;
}, TContext>;
export type UpdateBackendAdMutationResult = NonNullable<Awaited<ReturnType<typeof updateBackendAd>>>;
export type UpdateBackendAdMutationBody = BodyType<AdBody>;
export type UpdateBackendAdMutationError = ErrorType<unknown>;
/**
* @summary Update an ad (admin)
*/
export declare const useUpdateBackendAd: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBackendAd>>, TError, {
        id: number;
        data: BodyType<AdBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateBackendAd>>, TError, {
    id: number;
    data: BodyType<AdBody>;
}, TContext>;
export declare const getDeleteBackendAdUrl: (id: number) => string;
/**
 * @summary Delete an ad (admin)
 */
export declare const deleteBackendAd: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteBackendAdMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBackendAd>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteBackendAd>>, TError, {
    id: number;
}, TContext>;
export type DeleteBackendAdMutationResult = NonNullable<Awaited<ReturnType<typeof deleteBackendAd>>>;
export type DeleteBackendAdMutationError = ErrorType<unknown>;
/**
* @summary Delete an ad (admin)
*/
export declare const useDeleteBackendAd: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBackendAd>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteBackendAd>>, TError, {
    id: number;
}, TContext>;
export declare const getListBackendShortsUrl: () => string;
/**
 * @summary List all shorts (admin)
 */
export declare const listBackendShorts: (options?: Parameters<typeof customFetch>[1]) => Promise<Short[]>;
export declare const getListBackendShortsQueryKey: () => readonly ["/api/backend/shorts"];
export declare const getListBackendShortsQueryOptions: <TData = Awaited<ReturnType<typeof listBackendShorts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendShorts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBackendShorts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBackendShortsQueryResult = NonNullable<Awaited<ReturnType<typeof listBackendShorts>>>;
export type ListBackendShortsQueryError = ErrorType<unknown>;
/**
 * @summary List all shorts (admin)
 */
export declare function useListBackendShorts<TData = Awaited<ReturnType<typeof listBackendShorts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBackendShorts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateBackendShortUrl: () => string;
/**
 * @summary Create a short (admin)
 */
export declare const createBackendShort: (shortBody: ShortBody, options?: Parameters<typeof customFetch>[1]) => Promise<Short>;
export declare const getCreateBackendShortMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBackendShort>>, TError, {
        data: BodyType<ShortBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createBackendShort>>, TError, {
    data: BodyType<ShortBody>;
}, TContext>;
export type CreateBackendShortMutationResult = NonNullable<Awaited<ReturnType<typeof createBackendShort>>>;
export type CreateBackendShortMutationBody = BodyType<ShortBody>;
export type CreateBackendShortMutationError = ErrorType<unknown>;
/**
* @summary Create a short (admin)
*/
export declare const useCreateBackendShort: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBackendShort>>, TError, {
        data: BodyType<ShortBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createBackendShort>>, TError, {
    data: BodyType<ShortBody>;
}, TContext>;
export declare const getUpdateBackendShortUrl: (id: number) => string;
/**
 * @summary Update a short (admin)
 */
export declare const updateBackendShort: (id: number, shortBody: ShortBody, options?: Parameters<typeof customFetch>[1]) => Promise<Short>;
export declare const getUpdateBackendShortMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBackendShort>>, TError, {
        id: number;
        data: BodyType<ShortBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateBackendShort>>, TError, {
    id: number;
    data: BodyType<ShortBody>;
}, TContext>;
export type UpdateBackendShortMutationResult = NonNullable<Awaited<ReturnType<typeof updateBackendShort>>>;
export type UpdateBackendShortMutationBody = BodyType<ShortBody>;
export type UpdateBackendShortMutationError = ErrorType<unknown>;
/**
* @summary Update a short (admin)
*/
export declare const useUpdateBackendShort: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBackendShort>>, TError, {
        id: number;
        data: BodyType<ShortBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateBackendShort>>, TError, {
    id: number;
    data: BodyType<ShortBody>;
}, TContext>;
export declare const getDeleteBackendShortUrl: (id: number) => string;
/**
 * @summary Delete a short (admin)
 */
export declare const deleteBackendShort: (id: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteBackendShortMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBackendShort>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteBackendShort>>, TError, {
    id: number;
}, TContext>;
export type DeleteBackendShortMutationResult = NonNullable<Awaited<ReturnType<typeof deleteBackendShort>>>;
export type DeleteBackendShortMutationError = ErrorType<unknown>;
/**
* @summary Delete a short (admin)
*/
export declare const useDeleteBackendShort: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBackendShort>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteBackendShort>>, TError, {
    id: number;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map