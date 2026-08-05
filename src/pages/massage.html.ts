// Generated Astro endpoint. Returns the approved HTML without Vite parsing inline tracking scripts.
export const prerender = true;
const html = "<!doctype html>\n<html lang=\"ar\" dir=\"rtl\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"robots\" content=\"noindex,follow\">\n<link rel=\"canonical\" href=\"https://salon-team.com/massage/\">\n<meta http-equiv=\"refresh\" content=\"0;url=/massage/\">\n<title>جارٍ التحويل…</title>\n<script>location.replace(\"/massage/\"+location.search+location.hash);</script>\n</head>\n<body><p>جارٍ تحويلك إلى <a href=\"/massage/\">https://salon-team.com/massage/</a></p></body>\n</html>\n";
export function GET() {
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
