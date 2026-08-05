// Generated Astro endpoint. Returns the approved HTML without Vite parsing inline tracking scripts.
export const prerender = true;
const html = "<!doctype html>\n<html lang=\"ar\" dir=\"rtl\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"robots\" content=\"noindex,follow\">\n<link rel=\"canonical\" href=\"https://salon-team.com/hair-fiber/\">\n<meta http-equiv=\"refresh\" content=\"0;url=/hair-fiber/\">\n<title>جارٍ التحويل…</title>\n<script>location.replace(\"/hair-fiber/\"+location.search+location.hash);</script>\n</head>\n<body><p>جارٍ تحويلك إلى <a href=\"/hair-fiber/\">https://salon-team.com/hair-fiber/</a></p></body>\n</html>\n";
export function GET() {
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
