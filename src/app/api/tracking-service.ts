export const isTrackingActive = () => {
	if (typeof window === 'undefined') {
		return true;
	}
	// Check if the URL has skipTracking=true in the query params
	const urlParams = new URLSearchParams(window.location.search);
	const shouldSkipSentryBasedOnQueryParam = urlParams.get('skip_tracking') === 'true';

	// Also to disable Sentry on client - set 'skip-sentry-pls=true' cookie
	const cookies = document.cookie.split(';');
	const shouldSkipSentryBasedOnCookie = cookies.some((cookie) =>
		cookie.trim().startsWith('skip_tracking_pls=true')
	);

	// Sentry starts only on client if NEXT_PUBLIC_USE_TRACKING is set to 'true'
	const isProdEnv = process.env.NEXT_PUBLIC_USE_TRACKING === 'true';
	return !shouldSkipSentryBasedOnCookie && !shouldSkipSentryBasedOnQueryParam && isProdEnv;
};
