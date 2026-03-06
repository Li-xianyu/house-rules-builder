export function setDraft(key, obj){
  localStorage.setItem(key, JSON.stringify(obj));
}
export function getDraft(key){
  const s = localStorage.getItem(key);
  if(!s) return null;
  try{ return JSON.parse(s); }catch(e){ return null; }
}
export function clearDraft(key){
  localStorage.removeItem(key);
}
export function exportJsonFile(filename, data){
  const txt = JSON.stringify(data, null, 2);
  const blob = new Blob([txt], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
