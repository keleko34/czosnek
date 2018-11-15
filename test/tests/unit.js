mocha.setup('bdd');

/* timer library */
function timer(key,index)
{ 
  this.key = key;
  this.index = index;
  
  this.getLastTime = function()
  {
    return localStorage.getItem(this.key+this.index);
  }

  this.updateTime = function(time)
  {
    return localStorage.setItem(this.key+this.index,time);
  }
  
  this.getTime = function(duration)
  {
    return parseInt(duration.textContent.replace('ms'),10);
  }
}

function getElementsByText(str, tag = 'a') 
{
  return Array.prototype.slice.call(document.getElementsByTagName(tag)).filter(el => el.textContent.trim() === str.trim())[0];
}

function getDurationsInTest(key)
{
  return getElementsByText(key+':').parentElement.parentElement.querySelectorAll('span.duration')
}

function trackTestTime(key)
{
  var perf,
      slow = 3;

  beforeEach(function(){
    perf = new timer(key,getDurationsInTest(key).length);
  })

  afterEach(function(){

    var durations = getDurationsInTest(key),
        index = (durations.length - 1),
        performance = durations[index].parentElement.appendChild(document.createElement('span')),
        time = perf.getTime(durations[index]),
        oldTime = (perf.getLastTime() || 0);
    
    durations[index].style.display = 'inline';
    durations[index].style.background = (time > slow ? 'red' : '#c09853');
    performance.style.display = 'inline';
    performance.style.color = 'white';
    performance.style.background = (oldTime > slow ? 'red' : 'green');
    performance.style.boxShadow = 'inset 0 1px 1px rgba(0,0,0,.2)';
    performance.style.fontSize = '9px';
    performance.style.padding = '2px 5px';
    performance.style.borderRadius = '5px';

    performance.innerHTML = 'Last: ' + oldTime + 'ms';
    
    perf.updateTime(time);
  })
}

(function(describe,it,expect,spy){
  /* mocha tests */
  
  mocha.run();
}(describe,it,chai.expect,sinon.spy));