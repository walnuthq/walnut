export const isMonitoringFeatureActive = () => {
    return process.env.NEXT_PUBLIC_MONITORING_FEATURE === 'true' ?? false;
}

export const isAuthorizationRequiredFeatureActive = () => {
    return process.env.NEXT_PUBLIC_REQUIRE_AUTHORIZATION_FEATURE === 'true';
}