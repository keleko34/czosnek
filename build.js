const { unlink, readFileSync, writeFileSync } = require('fs')
      base = process.cwd().replace(/\\/g,'/'),
      closureCompiler = require('google-closure-compiler-js'),
      flags = {};

console.log("Building Czosnek Library...");

flags.jsCode = [{src: readFileSync(base+'/czosnek.js','utf8')}];
flags.compilationLevel = 'SIMPLE';
flags.rewritePolyfills = false;
unlink(base+'/czosnek.min.js', (err) => {
 if(err && !err.code === 'ENOENT') return;
 writeFileSync(base+'/czosnek.min.js',closureCompiler(flags).compiledCode);
 console.log("Finished Building Minified Czosnek Library..");
});
