// src/lib/utils/permissions.ts
/**
 * Robust mobile device detection
 * Checks multiple indicators to catch tech-savvy users spoofing user agents
 */
export function isMobileDevice(): boolean {
	// Check 1: User agent
	const userAgent = navigator.userAgent.toLowerCase()
	const mobileUserAgent = /iphone|ipad|android|webos|blackberry|windows phone|opera mini|iemobile|mobile/i.test(
		userAgent
	)

	// Check 2: Touch capability
	const hasTouch =
		'ontouchstart' in window ||
		navigator.maxTouchPoints > 0 ||
		(navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0)

	// Check 3: Screen size (mobile typically < 768px width or aspect ratio)
	const smallScreen = window.innerWidth < 768
	const portraitOrientation = window.innerHeight > window.innerWidth

	// Check 4: Device pixel ratio (mobile devices often have higher DPR)
	const highPixelRatio = window.devicePixelRatio > 1.5

	// Check 5: Platform
	const platform = navigator.platform.toLowerCase()
	const mobileOS = /iphone|ipad|android|arm/.test(platform)

	// At least 3 indicators must suggest mobile to be safe
	const indicators = [mobileUserAgent, hasTouch, smallScreen, highPixelRatio, mobileOS]
	const mobileIndicatorCount = indicators.filter(Boolean).length

	return mobileIndicatorCount >= 3
}

/**
 * Check if device supports fullscreen API
 */
export function supportsFullscreen(): boolean {
	return !!(
		document.fullscreenEnabled ||
		(document as any).mozFullScreenEnabled ||
		(document as any).webkitFullscreenEnabled ||
		(document as any).msFullscreenEnabled
	)
}

/**
 * Check if window management API is available
 */
export function supportsWindowManagement(): boolean {
	return 'getScreens' in window.screen || 'windows' in (window as any)
}

/**
 * Permissions model
 */
export interface PermissionsRequired {
	location: boolean
	camera: boolean
	microphone: boolean
	windowManagement: boolean // Only on desktop
}

/**
 * Get required permissions based on device type and assessment requirements
 */
export function getRequiredPermissions(options: {
	requireFaceVerify: boolean
	fullscreenRequired: boolean
	locationRequired: boolean
}): PermissionsRequired {
	const isMobile = isMobileDevice()

	return {
		location: options.locationRequired,
		camera: options.requireFaceVerify,
		microphone: options.requireFaceVerify, // For proctoring audio
		// CRITICAL: Skip window management on mobile devices
		windowManagement: !isMobile && options.fullscreenRequired,
	}
}

/**
 * Request permissions from user
 * Returns which permissions were granted
 */
export async function requestPermissions(required: PermissionsRequired): Promise<{
	location: boolean
	camera: boolean
	microphone: boolean
	windowManagement: boolean
	allGranted: boolean
}> {
	const results = {
		location: false,
		camera: false,
		microphone: false,
		windowManagement: false,
		allGranted: false,
	}

	try {
		// Request Location
		if (required.location) {
			try {
				const position = await new Promise<GeolocationPosition>((resolve, reject) => {
					navigator.geolocation.getCurrentPosition(resolve, reject, {
						timeout: 10000,
						enableHighAccuracy: true,
					})
				})
				results.location = !!position
			} catch (err) {
				console.warn('Location permission denied:', err)
			}
		}

		// Request Camera
		if (required.camera) {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
				})
				results.camera = !!stream
				// Stop stream immediately (we just needed to request permission)
				stream.getTracks().forEach((track) => track.stop())
			} catch (err) {
				console.warn('Camera permission denied:', err)
			}
		}

		// Request Microphone
		if (required.microphone) {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
				results.microphone = !!stream
				// Stop stream immediately
				stream.getTracks().forEach((track) => track.stop())
			} catch (err) {
				console.warn('Microphone permission denied:', err)
			}
		}

		// Request Window Management (Desktop Only!)
		if (required.windowManagement) {
			try {
				// Window Management API is experimental
				if ('getScreens' in window.screen) {
					const screens = await (window.screen as any).getScreens()
					results.windowManagement = !!screens
				} else if (supportsFullscreen()) {
					// Fallback: just check if fullscreen is available
					results.windowManagement = true
				}
			} catch (err) {
				console.warn('Window management not supported:', err)
			}
		}

		// All granted if all required ones were granted
		results.allGranted = Object.entries(required).every(
			([key, isRequired]) => !isRequired || results[key as keyof typeof results]
		)

		return results
	} catch (err) {
		console.error('Permission request error:', err)
		return results
	}
}

/**
 * Format device info for debugging (log on exam start)
 */
export function getDeviceInfo() {
	const isMobile = isMobileDevice()

	return {
		isMobile,
		userAgent: navigator.userAgent,
		platform: navigator.platform,
		screenSize: {
			width: window.innerWidth,
			height: window.innerHeight,
		},
		orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
		touchSupport: 'ontouchstart' in window,
		devicePixelRatio: window.devicePixelRatio,
		features: {
			supportsFullscreen: supportsFullscreen(),
			supportsWindowManagement: supportsWindowManagement(),
		},
	}
}