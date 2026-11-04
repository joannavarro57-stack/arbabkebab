/* =====================================================================
   Photo optimizer — every photo is run through this before it is uploaded
   and its link is saved in the database.
   The same file lives in arbab-kebab-site/js/ and arbab-kebab-admin/js/
   (the two sites deploy separately) — keep both copies identical.

   What it does:
     • turns the photo upright (phone camera rotation) and removes hidden
       data such as GPS location and camera details
     • refuses photos that are too small to look sharp (minSide)
     • shrinks big photos to maxSide with high-quality resampling
     • saves as WebP (JPEG on browsers that can't make WebP), lowering the
       quality step by step until the file is under maxBytes

   optimizeImage(file, options) → Promise<{blob, ext, width, height, before, after}>
   Throws an Error with a friendly message if the photo can't be used.
   ===================================================================== */
(function(){
  const ACCEPTED = /^image\/(jpeg|png|webp)$/;

  async function decode(file){
    if(window.createImageBitmap){
      try{ return await createImageBitmap(file, {imageOrientation: "from-image"}); }catch(e){ /* try <img> below */ }
    }
    const url = URL.createObjectURL(file);
    try{
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    }finally{ URL.revokeObjectURL(url); }
  }

  const canvasOf = (w, h) => Object.assign(document.createElement("canvas"), {width: w, height: h});
  const sizeOf = src => ({w: src.naturalWidth || src.width, h: src.naturalHeight || src.height});

  /* halve the size in steps, then one final high-quality pass — avoids the jagged look of a single big shrink */
  function resample(src, w, h){
    let cur = src, {w: cw, h: ch} = sizeOf(src);
    while(cw / 2 >= w * 1.5 && ch / 2 >= h * 1.5){
      cw = Math.round(cw / 2); ch = Math.round(ch / 2);
      const step = canvasOf(cw, ch), x = step.getContext("2d");
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
      x.drawImage(cur, 0, 0, cw, ch);
      cur = step;
    }
    const out = canvasOf(w, h), x = out.getContext("2d");
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
    x.drawImage(cur, 0, 0, w, h);
    return out;
  }

  function hasTransparency(canvas){
    const d = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    for(let i = 3; i < d.length; i += 4) if(d[i] < 250) return true;
    return false;
  }
  function onWhite(canvas){
    const out = canvasOf(canvas.width, canvas.height), x = out.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, out.width, out.height); x.drawImage(canvas, 0, 0);
    return out;
  }
  const encode = (canvas, type, q) => new Promise(r => canvas.toBlob(r, type, q));
  const kb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";

  window.optimizeImage = async function(file, o = {}){
    const {
      maxSide = 900,          // longest side after shrinking, in pixels
      minSide = 0,            // refuse photos whose longest side is smaller than this
      quality = 0.86,         // starting quality (0–1)
      minQuality = 0.6,       // never go below this quality
      maxBytes = 400 * 1024,  // aim to finish under this size
      hardLimit = 5 * 1024 * 1024,   // storage bucket limit — fail if still bigger
      what = "photo"
    } = o;
    if(!file || !ACCEPTED.test(file.type)) throw new Error(`Use a JPG, PNG or WebP ${what}.`);

    let src;
    try{ src = await decode(file); }
    catch(e){ throw new Error(`This ${what} couldn't be opened. Try saving it again as JPG or PNG.`); }
    const {w: w0, h: h0} = sizeOf(src);
    if(!w0 || !h0) throw new Error(`This ${what} couldn't be opened. Try saving it again as JPG or PNG.`);
    if(Math.max(w0, h0) < minSide){
      if(src.close) src.close();
      throw new Error(`This ${what} is too small (${w0}×${h0} px) and would look blurry. Use one at least ${minSide} px wide or tall.`);
    }

    const scale = Math.min(1, maxSide / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale)), h = Math.max(1, Math.round(h0 * scale));
    let canvas = resample(src, w, h);
    if(src.close) src.close();

    // WebP keeps transparency and is smallest; browsers that can't make WebP get JPEG
    let type = "image/webp", q = quality, blob = await encode(canvas, type, q);
    if(!blob || blob.type !== "image/webp"){
      type = "image/jpeg";
      if(file.type !== "image/jpeg" && hasTransparency(canvas)) canvas = onWhite(canvas);
      blob = await encode(canvas, type, q);
    }
    while(blob && blob.size > maxBytes && q > minQuality){
      q = Math.max(minQuality, q - 0.08);
      blob = await encode(canvas, type, q);
    }
    if(!blob) throw new Error(`This ${what} couldn't be processed on this device. Try another browser.`);
    if(blob.size > hardLimit) throw new Error(`This ${what} is still too large after compressing (${kb(blob.size)}). Try a smaller one.`);

    return {blob, ext: type === "image/webp" ? "webp" : "jpg", width: w, height: h,
      before: kb(file.size), after: kb(blob.size)};
  };
})();
