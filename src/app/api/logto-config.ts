import { UserScope } from '@logto/next';

export const logtoClientNextConfig = {
    endpoint: process.env.LOGTO_AUTHORIZATION_ENDPOINT ?? `https://${process.env.LOGTO_TENANT_ID}.logto.app/`,
    appId: process.env.LOGTO_APP_ID ?? '',
    appSecret: process.env.LOGTO_APP_SECRET ?? '',
    baseUrl: process.env.NEXT_PUBLIC_APP_BASE_URL ?? '',
    cookieSecret: process.env.LOGTO_COOKIE_SECRET ?? '',
    cookieSecure: process.env.NODE_ENV === 'production',
    resources: [process.env.WALNUT_MAIN_API_URL ?? ''],
    scopes: [UserScope.Organizations],
}