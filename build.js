var base = process.cwd().replace(/\\/g,'/'),
    fs = require('fs'),
    closureCompiler = require('google-closure-compiler-js').compile,
    flags = {};

console.log("Building Czosnek Library...");

flags.jsCode = [{src: fs.readFileSync(base+'/czosnek.js','utf8')}];
flags.compilationLevel = 'SIMPLE';
fs.unlinkSync(base+'/czosnek.min.js');
fs.writeFileSync(base+'/czosnek.min.js',closureCompiler(flags).compiledCode);

console.log("Finished Building Minified Library..");