/* =====================================================================
   ARBAB KEBAB — site settings (used by index.html and pay.html)
   Edit this one file; both pages pick up the changes.
   ===================================================================== */
window.SITE_CONFIG = {
  /* Supabase → Project Settings → API Keys.
     Use the PUBLISHABLE (or anon) key — never the secret / service_role key. */
  supabaseUrl: "https://addfbbpqhxsinedvnnme.supabase.co",          // e.g. "https://abcdefghijkl.supabase.co"
  supabaseKey: "sb_publishable_vNys_OaZ_iVP1bfJj64Qhw_QQvyEaQp",          // e.g. "sb_publishable_..."

  /* GCash details shown on the payment page (pay.html) */
  gcash: {
    accountName: "Jana May N.",        // as shown in GCash, e.g. "AR**B K**AB" or the owner's masked name
    number: "09161118041",             // e.g. "0917 123 4567"
    qrImage: "gcash-qr.jpg" // upload the QR image with exactly this file name next to this file
  }
};
