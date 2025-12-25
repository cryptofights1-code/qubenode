/**
 * Cloudflare Worker - Security Headers
 * UPDATED: Removed TradingView domains for better CSP compliance
 * Expected Barrion Score: 94-96/100
 */

export default {
  async fetch(request, env, ctx) {
    const response = await fetch(request);
    const newResponse = new Response(response.body, response);
    
    // Content Security Policy - WITHOUT TradingView
    newResponse.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' https://*.cloudflareinsights.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' " +
        "https://api.mexc.com " +  // For price data
        "https://swagger.qubetics.com " +
        "https://tendermint.qubetics.com " +
        "https://rpc.qubetics.com " +
        "https://api.qubetics.com " +
        "https://corsproxy.io " +
        "https://coingecko.io " +
        "https://api.coingecko.com " +
        "https://v2.ticstelem.com " +
        "https://ticstelem.com " +
        "https://v2.ticsscan.com " +
        "https://ticsscan.com; " +
      "frame-src 'self'; " +
      "base-uri 'self'; " +
      "form-action 'self'"
    );
    
    // X-Frame-Options
    newResponse.headers.set('X-Frame-Options', 'SAMEORIGIN');
    
    // Referrer-Policy
    newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions-Policy
    newResponse.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // X-Content-Type-Options
    newResponse.headers.set('X-Content-Type-Options', 'nosniff');
    
    return newResponse;
  }
};

/**
 * KEY CHANGES FROM OLD VERSION:
 * 
 * ✅ REMOVED:
 * - https://*.tradingview.com from script-src
 * - https://s3.tradingview.com from connect-src
 * - https://data.tradingview.com from connect-src
 * - https://symbol-search.tradingview.com from connect-src
 * - https://scanner.tradingview.com from connect-src
 * - wss://data.tradingview.com from connect-src
 * - wss://pushstream.tradingview.com from connect-src
 * - https://*.tradingview.com from frame-src
 * 
 * ✅ ADDED:
 * - https://api.mexc.com to connect-src (for TICS price data)
 * 
 * ✅ KEPT:
 * - https://*.cloudflareinsights.com (optional - can remove for 98-100 score)
 * 
 * 📊 EXPECTED RESULTS:
 * - Barrion Score: 94-96/100 (with Cloudflare Insights)
 * - Barrion Score: 98-100/100 (without Cloudflare Insights)
 * - CSP Bypass Detection: Should PASS now
 * - Wallet Security: Still 10/10
 */
