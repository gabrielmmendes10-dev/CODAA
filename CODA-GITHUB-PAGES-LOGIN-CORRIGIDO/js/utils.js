(function createCodaUtils(root){
  const escapeHtml=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  root.CodaUtils=Object.freeze({escapeHtml});
})(globalThis);
