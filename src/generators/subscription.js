/**
 * Subscription content generator
 */

import { at, pt, ed, trojanPt, HttpsPort } from '../config/constants.js';
import { proxyIPs } from '../config/defaults.js';

// Top tier Asia-Pacific Anycast CNAME domains (~70ms latency in Mainland China)
const mainDomains = [
	'saas.sin.fan',         // Singapore Anycast (~70ms)
	'cf.090227.xyz',        // HK/SG Fast Anycast (~70ms)
	'cf.hw.090227.xyz',     // Huawei Cloud HK (~70ms)
	'cf.0sm.com',           // Optimized CDN
];

/**
 * Generates subscription content with VLESS and Trojan URLs.
 * @param {string} userID_path - User ID path (supports comma-separated multiple UUIDs)
 * @param {string} hostname - Host name for configuration
 * @param {string|string[]} proxyIP - Proxy IP address or array of addresses
 * @param {string} trojanPassword - Trojan password (optional, defaults to first userID)
 * @returns {string} Base64 encoded subscription content
 */
export function genSub(userID_path, hostname, proxyIP, trojanPassword = null) {
	const userIDArray = userID_path.includes(',') ? userID_path.split(",") : [userID_path];
	const proxyIPArray = Array.isArray(proxyIP) ? proxyIP : (proxyIP ? (proxyIP.includes(',') ? proxyIP.split(',') : [proxyIP]) : proxyIPs);
	const targetDomains = new Set([hostname, ...mainDomains]);
	const commonUrlPartHttps = `?encryption=none&security=tls&sni=${hostname}&fp=random&type=ws&host=${hostname}&path=%2F%3Fed%3D2048#`;

	const result = userIDArray.flatMap((userID) => {
		let allUrls = [];

		// Generate main HTTPS URLs for pure ultra-fast domains
		targetDomains.forEach(domain => {
			Array.from(HttpsPort).forEach((port) => {
				const urlPart = `CF-${domain}-HTTPS-${port}`;
				const mainProtocolHttps = atob(pt) + '://' + userID + atob(at) + domain + ':' + port + commonUrlPartHttps + urlPart;
				allUrls.push(mainProtocolHttps);
			});
		});

		return allUrls;
	});

	// Generate Trojan URLs
	const effectiveTrojanPassword = trojanPassword || userIDArray[0];
	const trojanUrls = generateTrojanUrls(effectiveTrojanPassword, hostname, proxyIPArray);

	return btoa([...result, ...trojanUrls].join('\n'));
}

/**
 * Generates Trojan subscription URLs
 * @param {string} password - Trojan password
 * @param {string} hostname - Host name
 * @param {string[]} proxyIPArray - Proxy IP array
 * @returns {string[]} Array of Trojan URLs
 */
function generateTrojanUrls(password, hostname, proxyIPArray) {
	const urls = [];
	const encodedPassword = encodeURIComponent(password);
	const commonParams = `?security=tls&type=ws&host=${hostname}&path=%2F%3Fed%3D2048&sni=${hostname}`;

	// Main hostname Trojan URLs (HTTPS ports only)
	mainDomains.forEach(domain => {
		Array.from(HttpsPort).forEach((port) => {
			const urlPart = `Trojan-${domain}-HTTPS-${port}`;
			const trojanUrl = `${atob(trojanPt)}://${encodedPassword}@${domain}:${port}${commonParams}#${urlPart}`;
			urls.push(trojanUrl);
		});
	});

	// Proxy IP Trojan URLs
	proxyIPArray.forEach((proxyAddr) => {
		const [proxyHost, proxyPort = '443'] = proxyAddr.split(':');
		const urlPart = `Trojan-${proxyHost}-${proxyPort}`;
		const trojanUrl = `${atob(trojanPt)}://${encodedPassword}@${proxyHost}:${proxyPort}${commonParams}#${urlPart}`;
		urls.push(trojanUrl);
	});

	return urls;
}

/**
 * Generates Trojan-only subscription content
 * @param {string} password - Trojan password
 * @param {string} hostname - Host name
 * @param {string|string[]} proxyIP - Proxy IP address or array of addresses
 * @returns {string} Base64 encoded Trojan subscription content
 */
export function genTrojanSub(password, hostname, proxyIP) {
	const proxyIPArray = Array.isArray(proxyIP) ? proxyIP : (proxyIP ? (proxyIP.includes(',') ? proxyIP.split(',') : [proxyIP]) : proxyIPs);
	const urls = generateTrojanUrls(password, hostname, proxyIPArray);
	return btoa(urls.join('\n'));
}
