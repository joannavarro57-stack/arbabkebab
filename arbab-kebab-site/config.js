/* =====================================================================
   ARBAB KEBAB — site settings (used by index.html and pay.html)
   Edit this one file; both pages pick up the changes.
   ===================================================================== */
window.SITE_CONFIG = {
  /* Supabase → Project Settings → API Keys.
     Use the PUBLISHABLE (or anon) key — never the secret / service_role key. */
  supabaseUrl: "https://addfbbpqhxsinedvnnme.supabase.co",          // e.g. "https://abcdefghijkl.supabase.co"
  supabaseKey: "sb_publishable_vNys_OaZ_iVP1bfJj64Qhw_QQvyEaQp",          // e.g. "sb_publishable_..."

  /* Google Maps browser key for the delivery pin map (Maps JavaScript, Places API (New),
     Geocoding). Restrict it to https://arbabkebab.vercel.app/* in Google Cloud.
     Leave "" to use the free OpenStreetMap map instead. */
  googleMapsKey: "AIzaSyAC6CIUp7DUj8WBz72VGzreqXADzfUti_s",

  /* BRANCHES — to add a branch, copy one { ... } line, paste it below, and change the details.
     name     shown to customers and saved with every order (don't rename a branch once it has orders)
     lat, lng where the delivery map starts for that branch — in Google Maps, right-click the shop
              and click the two numbers to copy them (first number = lat, second = lng)
     address, hours   optional, shown under "Branches" on the website
     The admin site reads this list too, so new branches appear there automatically. */
  branches: [
    { name: "Malolos", lat: 14.8433, lng: 120.8114, address: "", hours: "" },
    { name: "C6 Banaba", lat: 14.67685030707215, lng: 121.11544909999999, address: "", hours: "" },
    { name: "Makati", lat: 14.563169874749514, lng: 121.0130246153436, address: "", hours: "" },
    { name: "Fairview", lat: 14.71143651904663, lng: 121.06178288412517, address: "", hours: "" },
    { name: "Pasig", lat: 14.554163592535158, lng: 121.09678732454763, address: "", hours: "" },
    { name: "Diliman", lat: 14.631154670911398, lng: 121.03891623619046, address: "", hours: "" }, 
    { name: "Marikina", lat: 14.638209287629184, lng: 121.10864875741734, address: "", hours: "" },
    // example: { name: "New Branch", lat: 14.0000, lng: 121.0000, address: "Street, Barangay, City", hours: "10 AM – 9 PM" },
  ],//14.638209287629184, 121.10864875741734

  /* Chat buttons shown after an order is placed (index.html and pay.html).
     instagram: the account's username without @, e.g. "arbabkebab". Leave "" to hide the button. */
  messenger: "https://m.me/ArbabKebabOfficial",
  instagram: "",

  /* GCash details shown on the payment page (pay.html) */
  gcash: {
    accountName: "Jana May N.",        // as shown in GCash, e.g. "AR**B K**AB" or the owner's masked name
    number: "09161118041",             // e.g. "0917 123 4567"
    qrImage: "gcash-qr.jpg" // upload the QR image with exactly this file name next to this file
  }
};
