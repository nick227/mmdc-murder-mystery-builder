
const divider = "════════════════════════════════════════════════════════════";

export function section(title){
  console.log("\n"+divider);
  console.log(" "+title);
  console.log(divider);
}

export function sub(title){
  console.log("\n──── "+title+" ─────────────────────────────────────");
}

export function block(label, content){
  console.log("\n["+label+"]");
  console.log(content);
}

export function json(label, obj){
  console.log("\n["+label+"]");
  console.log(JSON.stringify(obj,null,2));
}
