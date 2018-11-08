console.calculateTime = function(func,cycles)
{
  var times = [],
      start,
      end;
  
  for(var x=0,len=cycles;x<len;x++)
  {
    start = performance.now();
    func();
    end = performance.now();
    times.push((end-start));
  }
  
  return ((times.reduce(function(a, b) { return a + b; }) / times.length) * 1000).toFixed(2)+'ms';
}

var async = true,
    runTests = true;

if(runTests)
{
  
}