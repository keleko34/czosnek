/* Make this library not depend on frytki if it does not exist but prefer it if it does, add observables to necessary items, make data observable */

window.czosnek = (function(){
  
  /* PIKANTNY/FRYTKI LOAD */
  /* REGION */
  
  var __hasPikantny = (window.pikantny !== undefined),
      __hasFrytki = (window.frytki !== undefined);
  
  if(!__hasPikantny)
  {
    /* Attempt to load it pikantny */
    var script = document.createElement('script');
    script.setAttribute('src','/node_modules/pikantny/init.min.js');
    script.setAttribute('type','text/javascript');
    script.onload = function(){
      if(!window.pikantny) return pikantnyError();
      __hasPikantny = true;
    }
    script.onerror = pikantnyError;
    document.head.appendChild(script);
  }
  
  function pikantnyError()
  {
    console.error("Pikantny library failed to load, either please `npm i pikantny` or include this library in your project loading order before the czosnek library");
  }
  
  
  
  /* ENDREGION */
  
  /* SCOPED LOCALS */
  /* REGION */

      /* start bind chars */
  var __start = '{{',
      
      /* end bind chars */
      __end = '}}',
      
      /* seperator for bind names and methods */
      __pipe = '|',
      
      /* locally stored templates */
      __templates = {},
      
      /* events associated with the dom */
      __domEvents = Object.keys(HTMLElement.prototype).filter(function(v){return v.indexOf('on') === 0}),
      
      __slice = Array.prototype.slice.call,
      
      __loopEvent = [];
  /* ENDREGION */
  
  /* REGEX RULES */
  /* REGION */
  
  /* regex for searching for nodes */
  var __reNodes = /(<\/.*?>)/g,
      
      /* splits binds out of text */
      __matchText = /(\{\{.*?\}\})/g,
      __splitText = /(\{\{.*?\}\})/g,
      __replaceKey = /[\s\{\}\>]|(\|(.*))/g,
      __replacefilters = /(.*?)\||[\s\{\}]/g,
      __matchVFilters = /(\()(.*?)(\))/g,
      __replaceVFilters = /[\(\)]/g,
      __matchStoreFilter = /(\[)(.*?)(\])/g,
      __replaceStoreFilter = /[\[\]\~\+\-]/g,
      __matchForText = /((.*?)for)(.*?)(loop(.*))/g,
      __replaceForKey = /((.*?)for\s)(\sloop(.*))/g,
      __replaceForComponent = /(.*?loop\s)|(\|(.*))|[\s]/g,
      __matchInsert = /(\{\{(\s*)\>(.*?)(\}\}))/g,
      __replaceTag = /[(\<\\)\>]/g
      
  /* ENDREGION */
  
  /* OBJECT CLASSES */
  /* REGION */
  
  /* all params after text are passed the same for each bind in a single instance (string) */
  function bindObject(key, text, type, id, bindText, listener, localAttr, local, node, binds)
  {
    /* Individual Bind */
    this.text = text;
    this.key = key;
    this.type = type;
    this.keyLength = this.key.split('.').length;
    this.localKey = this.key.split('.').pop();
    this.filters = parseFilterTypes(getfilters(text));
    this.component = (this.type === 'for' ? getForComponent(text)[1] : undefined);
    this.isDirty = (type !== 'for' && bindText.match(__matchText).length !== 1);
    this.isAttr = (['for', 'textContent'].indexOf(type) === -1);
    this.id = id;
    
    /* Shared Pointers */
    this.isComponent = (node instanceof HTMLUnknownElement || node.tagName.indexOf('-') !== -1);
    this.bindText = bindText;
    this.listener = listener;
    this.attr = listener;
    this.localAttr = localAttr;
    this.local = local;
    this.node = node;
    this.binds = binds;
    this.isEvent = (this.isAttr && __domEvents.indexOf(localAttr) !== -1);
    this.isInput = (node.tagName === 'INPUT');
    this.isRadio = (this.isInput && ['radio','checkbox'].indexOf(node.type) !== -1);
  }
  
  /* ENDREGION */
  
  /* DESCRIPTORS */
  /* REGION */
  function setDescriptor(value,writable,redefinable,enumerable)
  {
    return {
        value:value,
        writable:!!writable,
        enumerable:!!enumerable,
        configurable:!!redefinable
    }
  }
  
  function setPointer(obj,key,redefinable,enumerable)
  {
    return {
      get:function(){return obj.get(key);},
      set:function(v)
      {
        (this.stop ? obj.stop() : obj)[key] = v;
      },
      configurable:!!redefinable,
      enumerable:!!enumerable
    }
  }
  /* ENDREGION */
  
  /* BIND SPLITTING METHODS */
  /* REGION */
  
  /* returns an array of standard text and bindings, binding texts are later converted to bind objects
     EXAMPLE::
      string: "Hello {{name}}, {{greeting}}"
      return: ["Hello ", "{{name}}", ", ", "{{greeting}}"]
  */
  function splitText(str)
  {
    var split = str.split(__splitText);
    return (split.pop() || split);
  }
  
  /* takes a bind and returns just the name/key
     EXAMPLE::
      string: "{{name | toUpperCase}}"
      return: "name"
  */
  function getKey(str)
  {
    return str.replace(__replaceKey, '');
  }
  
  /* takes a for bind and returns just the name/key
     EXAMPLE::
      string: "{{for items loop listitem}}"
      return: "items"
  */
  function getForKey(str)
  {
    return str.replace(__replaceForKey, '');
  }
  
  /* takes a for bind and returns just the component
     EXAMPLE::
      string: "{{for items loop listitem}}"
      return: "listitem"
  */
  function getForComponent(str)
  {
    return str.replace(__replaceForComponent,'');
  }
  
  /* takes a bind and returns array of the filter names
     EXAMPLE::
      string: "{{name | toUpperCase, duplicate}}"
      return: ["toUpperCase","duplicate"]
  */
  function getfilters(str)
  {
    return str.replace(__replacefilters,'').split(',');
  }
  
  /* takes a filters array and parses out specials, eg: (vmFilter),[(~|+|-)storename]
     EXAMPLE::
      string: "["toUpperCase","(duplicate)","[~model.key]"]"
      return: {filters:["toUpperCase"],vmFilters:["duplicate"],model:["model.key"],local:[],session:[]}
  */
  function parseFilterTypes(filters)
  {
    if(typeof filters === 'string') filters = getfilters(filters);
    
    var filterObj = {
          filters:[],
          vmFilters:[],
          model:[],
          local:[],
          session:[]
        },
        x = 0,
        len = filters.length,
        filter;
    
    for(x;x<len;x++)
    {
      filter = filters[x];
      
      if(filter.match(__matchVFilters))
      {
        filterObj.vmFilters.push(filter.replace(__replaceVFilters, ''));
      }
      else if(filter.match(__matchStoreFilter))
      {
        if(filter.indexOf('~') !== -1) filterObj.model.push(filter.replcae(__replaceStoreFilter, ''));
        if(filter.indexOf('+') !== -1) filterObj.local.push(filter.replcae(__replaceStoreFilter, ''));
        if(filter.indexOf('-') !== -1) filterObj.session.push(filter.replcae(__replaceStoreFilter, ''));
      }
      else
      {
        filterObj.filters.push(filter);
      }
    }
    
    return filterObj;
  }
  
  /* ENDREGION */
  
  /* PUBLIC METHODS */
  /* REGION */
  function getUnknown(html)
  {
    var matched = html.match(__reNodes),
        unknown = [],
        x = 0,
        len = matched.length,
        key;
    
    for(x;x<len;x++)
    {
      key = matched[x].replace(__replaceTag, '');
      if((document.createElement(key) instanceof HTMLUnknownElement) || key.indexOf('-') !== -1)
      {
        if(unknown.indexOf(key) === -1) 
        {
          if(__templates[key] === undefined) unknown.push(key);
        }
      }
    }
    
    return unknown;
  }
  
  function register(title, template)
  {
    if(__templates[title] === undefined)
    {
      __templates[title] = template;
    }
    else
    {
      console.error("Class: KonnektMP Method: 'register', A template by the name %o already exists",name);
    }
    return this;
  }
  
  function isRegistered(title)
  {
    return (__templates[title] !== undefined);
  }
  
  /* Inserts a data set into the html and does not create a bind */
  function insertData(html, data)
  {
    var text = html,
        inserts = text.match(__matchInsert),
        x = 0,
        len = inserts.length,
        insert,
        key,
        filters,
        value;
    
    for(x;x<len;x++)
    {
      insert = inserts[x],
      key = insert.replace(__replaceKey, '');
      filters = parseFilterTypes(getfilters(insert));
      value = (data.get ? data.get(key) : data[key]);
      text = text.replace(insert, runThroughFilters(value, filters, data.filters.filters));
    }
    
    return text;
  }
  
  function loopMap(childNodes, binds, root)
  {
    var x = 0,
        len = childNodes.length,
        child,
        extensions;
    
    for(x;x<len;x++)
    {
      child = childNodes[x];
      extensions = child.__pikantnyExtensions__;
      /* block from reading sub components, block comment type nodes */
      if(!extensions.mapper && child.nodeType !== 8)
      {
        extensions.mapper = {};
        extensions.mapper.root = root;
        extensions.mapper.maps = binds;
        
        if(child.nodeType === 3)
        {
          getTextBinds(child,binds);
        }
        else
        {
          getAttrBinds(child,binds);
          if(child.childNodes && child.childNodes.length !== 0)
          {
            loopMap(child.childNodes, binds);
          }
        }
      }
    }
    
    return binds;
  }
  
  function map(node)
  {
    return loopMap([node], {}, node);
  }
  
  function addLoopListener(func)
  {
    __loopEvent.push(func);
    
    return this;
  }
  
  function removeLoopListener(func)
  {
    var stringFunc = func.toString(),
        x = 0,
        len = __loopEvent.length;
    for(x;x<len;x++)
    {
      if(__loopEvent[x].toString() === stringFunc);
    }
    return this;
  }
  
  /* ENDREGION */
  
  /* BIND HELPERS */
  /* REGION */
  
  function runThroughBinds(binds)
  {
    var bind,
        data,
        text = '',
        x = 0,
        len = binds.length;
    
    for(x;x<len;x++)
    {
      bind = binds[x];
      data = bind.data;
      if(typeof bind === 'string')
      {
        text += bind;
      }
      else
      {
        if(data === undefined)
        {
          text += bind.text;
        }
        else
        {
          text += runThroughFilters(data[bind.localkey],bind.filters.filters,data.filters);
        }
      }
      
      return text;
    }
    
    return text;
  }
  
  function runThroughFilters(val, filters, filterFuncs)
  {
    var returnValue = val,
        x = 0,
        len = filters.length;
    
    for(x;x<len;x++)
    {
      returnValue = (filterFuncs[filters[x]] ? filterFuncs[filters[x]](returnValue) : returnValue);
    }
    
    return returnValue;
  }
  
  function runThroughForFilters(val, filters, filterFuncs, index)
  {
    var returnValue,
        x = 0,
        len = filters.length;
    
    for(x;x<len;x++)
    {
      returnValue = (filterFuncs[filters[x]] ? filterFuncs[filters[x]](val,index)  : returnValue)
    }
    return returnValue;
  }
  
  function insertHTML(node, html)
  {
    var stop = node.stop,
        x = 0,
        len = html.length;
    
    for(x;x<len;x++)
    {
      stop().appendChild(html[x]);
    }
  }
  
  function addBind(node, binds, title, text, local)
  {
    var isText = (title === 'textContent'),
        bindText = splitText(text),
        type = (isText ? (text.match(__matchForText) ? 'for' : 'text') : 'attr'),
        listener = title,
        localAttr = (isText ? title : 'value'),
        isEvent = (!isText && __domEvents.indexOf(title) !== -1),
        localBinds = [],
        
        /* loop */
        x = 0,
        len = bindText.length,
        item,
        key,
        bind;
    
    if(isEvent) node.stop().removeAttribute(title);
    
    /* TODO loop binds */
    if(type === 'for')
    {
      item = text;
      key = getForKey(text);
      return this;
    }
    
    for(x;x<len;x++)
    {
      item = bindText[x]
      if(item.match(__matchText))
      {
        key = getKey(item);
        bind = new bindObject(key, item, type, x, bindText, listener, localAttr, local, node, localBinds);
        localBinds.push(bind);
        bindText[x] = bind;

        if(!binds[key]) binds[key] = [];

        binds[key].push(bind);
      }
    }
  }
  
  function getTextBinds(node, binds)
  {
    /* the actual text */
    var text = node.textContent,
        title = 'textContent';
    
    if(text.match(__matchText)) addBind(node.parentElement, binds, title, text, node)
  }
  
  function getAttrBinds(node, binds)
  {
    /* all attributes of the node */
    var attrs = __slice(node.attributes),
        
        /* if the parent element is a component then we need to treat it as a single instance map */
        x = 0,
        len = attrs.length,
        text,
        title;
    
    for(x;x<len;x++)
    {
      text = attrs[x].value;
      title = attrs[x].name;
      
      if(text.match(__matchText)) addBind(node, binds, title, text, attrs[x]);
    }
  }
  
  function getLayer(obj, key)
  {
    var __scopeArray = (typeof key === 'string' ? key.split('.') : [key]),
        __retObj = obj,
        __len = __scopeArray.length,
        __x = 0;
    
    for(__x;__x<(__len - 1);__x++)
    {
      if(__retObj[__scopeArray[__x]] === 'undefined')
      {
        if(__retObj.set)
        {
          __retObj.set(__scopeArray[__x], {});
        }
        else
        {
           __retObj[__scopeArray[__x]] = {};
        }
      }
      else if(__retObj[__scopeArray[__x]] !== undefined) 
      {
        if(typeof __retObj[__scopeArray[__x]] === 'object') __retObj = __retObj[__scopeArray[__x]];
      }
    }
    
    return __retObj;
  }
  
  function getLocalKey(key)
  {
    return (typeof key === 'string' ? key.substring(key.lastIndexOf('.') + 1, key.length) : key.toString());
  }
  
  /* TODO loop binds */
  function loopItemChange()
  {
    
  }
  
  /* ENDREGION */
  
  /* STORAGE */
  /* REGION */
  
  function storageGet(type, key)
  {
    if(window[type]) return window[type].getItem(key);
  }
  
  function storageSet(type, value, keys)
  {
    var x = 0,
        len = keys.length;
    
    if(len && window[type])
    {
      for(x;x<len;x++)
      {
        window[type].setItem(keys[x],value);
      }
    }
  }
  
  function getModel(key)
  {
    return storageGet('model', key);
  }
  
  function setModel(value, keys)
  {
    return storageSet('model', value, keys);
  }
  
  function getLocal(key)
  {
    return storageGet('localStorage', key);
  }
  
  function setLocal(value, keys)
  {
    return storageSet('localStorage', value, keys);
  }
  
  function getSession(key)
  {
    return storageGet('sessionStorage', key);
  }
  
  function setSession(value, keys)
  {
    return storageSet('sessionStorage', value, keys);
  }
  
  /* ENDREGION */
  
  /* BINDING PROTOTYPES */
  /* REGION */
  
  /* connected listener */
  function dataListener(e)
  {
    if(e.event === 'delete')
    {
      this.unsync();
    }
    else
    {
      this.setDom(e.value);
    }
  }
  
  /* connected listener */
  function domListener(e)
  {
    this.setData(e.value);
  }
  
  function addSetDescriptor(obj, key)
  {
    var __value = obj[key],
        __set = function(v)
        {
          __value = v;
          dataListener.call(this, {value: v, type:(v === undefined ? 'delete' : 'set')});
        };
    Object.defineProperty(obj, key, {
      set: __set,
      get: function(){ return __value },
      enumerable: true,
      configurable: true
    })
  }
  
  function connect(data)
  {
    var dataIsOfFrytkiType = (__hasFrytki && (this.data instanceof frytki));
    
    this.data = (data || this.data || {});
    this.localkey = this.key;
    
    if(this.localkey.indexOf('.') !== -1)
    {
      this.data = getLayer(this.data);
      this.localkey = getLocalKey(this.key);
    }
    
    /* TODO loop binds */
    if(this.type === 'for')
    {
      
      return this;
    }
    
    /* if object is frytki use local commands */
    if(dataIsOfFrytkiType)
    {
      this.data.addEventListener(this.localkey, dataListener.bind(this));
      if(!this.isDirty) this.node.addEventListener(this.listener + "update",domListener.bind(this));
    }
    else
    {
      addSetDescriptor(this.data, this.localkey);
      
      if(!this.isDirty) this.node.addEventListener(this.listener + "update",domListener.bind(this));
    }
    
    var dataStopped = (dataIsOfFrytkiType ? this.data.stop() : this.data);
    
    /* first check storage to data */
    if(this.filters.model && this.filters.model.length !== 0)
    {
      dataStopped[this.localkey] = getModel(this.key);
    }
    else if(this.filters.session && this.filters.session.length !== 0)
    {
      dataStopped[this.localkey] = getModel(this.key);
    }
    else if(this.filters.local && this.filters.local.length !== 0)
    {
      dataStopped[this.localkey] = getModel(this.key);
    }
    
    if(this.isEvent)
    {
      this.node.stop()[this.attr] = this.data[this.localkey];
    }
    
    else if(this.localkey === 'innerHTML')
    {
      this.node.stop().innerHTML = '';
      insertHTML(this.node, this.data.innerHTML);
    }
    else
    {
      this.local.stop()[this.localAttr] = runThroughBinds(this.bindText);
      if(this.isInput && ['value','checked'].indexOf(this.attr) !== -1) this.node.stop()[this.attr] = this.data[this.localkey];
    }
  }
  
  function reconnect()
  {
    /* TODO loop binds */
    if(this.type === 'for')
    {
      
      return this;
    }
    
    if(__hasFrytki && (this.data instanceof frytki))
    {
      this.data.removeEventListener(this.localKey, dataListener);
      this.data.addEventListener(this.localkey, dataListener.bind(this));
    }
    else
    {
      addSetDescriptor(this.data, this.localkey);
    }
    
    if(!this.isDirty)
    {
      this.node.removeEventListener(this.listener + "update",domListener);
      this.node.addEventListener(this.listener + "update",domListener.bind(this));
    }
  }
  
  function setData(value)
  {
    var data = this.data,
        filters = this.filters;
    /* run through vmFilters + post set storage and model filters */
    value = runThroughFilters(value,filters.vmFilters,data.filters);
    if(data.stop) 
    { 
      data.stop().set(this.key,value);
    }
    else
    {
      data[this.key] = value;
    }
        
    setModel(filters.model,value);
    setSession(filters.session,value);
    setLocal(filters.local,value);
    
    return this;
  }
  
  function setDom(value)
  {
    var data = this.data,
        filters = this.filters,
        key = this.key,
        attr = this.attr;
    
    /* run through Standard filters + pre set storage and model filters */
    setModel(filters.model,value);
    setSession(filters.session,value);
    setLocal(filters.local,value);
    
    /* tie actual function methods */
    if(this.isEvent)
    {
      this.node.stop()[attr] = data.get(key);
    }
    
    /* set actual value of an input */
    else if(this.isInput && (['value','checked'].indexOf(attr) !== -1))
    {
      this.node.stop()[attr] = data.get(key);
    }
    
    /* pass nodes into the binded location */
    else if(key === 'innerHTML')
    {
      /* first clear binding text, then append nodes */
      this.node.stop().innerHTML = "";
      insertHTML(this.node,data.innerHTML);
      
      /* release pointers */
      data.innerHTML = null;
    }
    
    /* standard string set */
    else
    {
      this.local.stop()[this.localAttr] = runThroughBinds(this.bindText);
    }
    return this;
  }
  
  /* TODO loop binds */
  function setLoop(items, type)
  {
    /* items can be a single key or an array of items */
    var node = this.node;
    
    switch(type)
    {
      /* DELETE */
      case 0:
        node.removeChild(node.children[items]);
        node.removeEventListener(items, loopItemChange);
        node.data.stop().removePointer(items);
        break;
      /* CREATE */
      case 1:
      
        break;
      /* SINGLE SET */
      case 2:
        
        break;
      /* ALL ITEMS CHANGED */
      default:
      
        break;
    }
  }
  
  /* Removes all object pointers so GC can collect them easier */
  function unsync()
  {
    this.bindText = null;
    this.data = null;
    this.binds = null;
    this.node = null;
    this.local = null;
    return this;
  }
  
  Object.defineProperties(bindObject.prototype, {
    connect: setDescriptor(connect, false, true),
    reconnect: setDescriptor(reconnect, false, true),
    setData: setDescriptor(setData, false, true),
    setDom: setDescriptor(setDom, false, true),
    setLoop: setDescriptor(setLoop, false, true),
    unsync: setDescriptor(unsync, false, true),
    getModel: setDescriptor(getModel, false, true),
    setModel: setDescriptor(setModel, false, true),
    getLocal: setDescriptor(getLocal, false, true),
    setLocal: setDescriptor(setLocal, false, true),
    getSession: setDescriptor(getSession, false, true),
    setSession: setDescriptor(setSession, false, true)
  })
  
  /* ENDREGION */
  
  /* CONSTRUCTOR */
  /* REGION */
  function Czosnek(node)
  {
    /* Name of the component */
      this.name = node.tagName.toLowerCase();
      
      if(!__templates[this.name]) console.error("COMPONENT "+this.name+" Does not exist, make sure to create it");
    
      /* template of the component */
      this.template = __templates[this.name] || '<div class="missing_component">Unknown Component</div>';

      /* original node */
      this.node = node;

      /* wrapper div for placing components inside */
      this.wrapper = document.createElement('div');
  }
  
  Object.defineProperties(Czosnek.prototype,{
      register:setDescriptor(register, false, true),
      isRegistered:setDescriptor(isRegistered, false, true),
      getUnknown:setDescriptor(getUnknown, false, true),
      map:setDescriptor(map, false, true),
      insert:setDescriptor(insertData, false, true),
      getModel:setDescriptor(getModel, false, true),
      setModel:setDescriptor(setModel, false, true),
      getLocal:setDescriptor(getLocal, false, true),
      setLocal:setDescriptor(setLocal, false, true),
      getSession:setDescriptor(getSession, false, true),
      setSession:setDescriptor(setSession, false, true),
      addLoopListener:setDescriptor(addLoopListener, false, true),
      removeLoopListener:setDescriptor(removeLoopListener, false, true)
    });
  /* ENDREGION */
  
  return Czosnek;
}());