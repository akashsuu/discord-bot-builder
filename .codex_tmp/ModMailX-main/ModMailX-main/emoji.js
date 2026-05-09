if (process.env.FOIL_MAIN !== '1' || !process.env.FOIL_SECURITY_HASH) {
    console.error('🚨 SECURITY ERROR: foil.js security system not initialized');
    console.error('This application requires foil.js to function properly');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    process.exit(1);
}

module.exports = { 
  success: "<:tick:1482652224009277450>", 
  ping: "<:ping:1482942981534253156>",
  error: "<:error:1482667568467677275>", 
  loading: "<a:loading2:1482766261204291776>", 
  ticket: "<:ticket:1482652396697157742>", 
  lock: "<:lock:1482652433816621076>", 
  unlock: "<:unlock:1482652468642054307>", 
  reply: "<:reply:1482652502821175419>", 
  close: "<:cross:1482652264886702150>", 
  claim: "<:claim:1482652582123012196>",
  staff: "<:staff:1482667731865047060>",
  user: "<:user:1482667752278855910>",
  anon: "<:anonymous:1482667826559848448>",
  help: "<:help:1482667858881155144>",
  guide: "<:guide:1482667888061055122>",
  delete: "<:delete:1482652550661541981>",
  reload: "<:reload:1482652303617163314>",
  list: "<:list:1482669056728240260>",
  transcript: "<:transcript2:1482669405333881027>"
} 
