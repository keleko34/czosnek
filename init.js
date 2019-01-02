/* TODO: */

window.czosnek = (function(){
  /* SCOPED LOCALS */
  /* REGION */
  
      /* start bind chars */
  var __templates = {},
      
      /* events associated with the dom */
      __domEvents = Object.keys(HTMLElement.prototype).filter(function(v){return v.indexOf('on') === 0}),
      
      __slice = Array.prototype.slice;
  /* ENDREGION */
  
  /* REGEX RULES */
  /* REGION */
  
  /* regex for searching for nodes */
  var __reNodes = /(<\/.*?>)/g,
      
      /* splits binds out of text */
      __matchText = /(\{\{.*?\}\})/g,
      __splitText = /(\{\{.*?\}\})/g,
      __replaceKey = /[\s\{\}\>]|(\|(.*))/g,
      __matchFilters = /(\{\{(.*?)\|(.*?)\}\})/g,
      __replacefilters = /(.*?)\||[\s\{\}]/g,
      __matchVFilters = /(\()(.*?)(\))/g,
      __replaceVFilters = /[\(\)]/g,
      __matchStoreFilter = /(\[)(.*?)(\])/g,
      __replaceStoreFilter = /[\[\]\~\+\-]/g,
      __matchForText = /((.*?)for)(.*?)(loop(.*))/g,
      __replaceForKey = /((.*?)for\s)|(\sloop(.*))/g,
      __replaceForComponent = /(.*?loop\s)|(\|(.*))|[\s]/g,
      __matchInsert = /(\{\{(\s*)\>(.*?)(\}\}))/g,
      __replaceEndingTag = /(<(?!input|img)(.*?) (.*?)\/>)/g,
      __replaceTag = /[(\<\\)\>]/g,
      __replaceNodeName = /(\<\/?\{\{(.*?)\>)/g,
      __replaceNodeBind = /(<({{.*?}})(.*))/g;
      
  /* ENDREGION */
  
  /* OBJECT CLASSES */
  /* REGION */
  
  function attachExtensions(root, parent, maps)
  {
    this.root = root;
    this.pointers = [];
    this.parent = parent;
    this.maps = maps;
    Object.defineProperties(this, {
      localmaps: setDescriptorLocalMaps(parent),
      subnodes: setDecriptorSubNodes(parent)
    })
  }
  
  function mapObject(text, mapText, type, property, listener, local, localAttr, node, maps, localComponent, isAttr, isFor, id)
  {
    this.key = (isFor ? getForKey(text) : getKey(text));
    this.type = type;
    this.text = text;
    this.mapText = mapText;
    this.keyLength = this.key.split('.').length;
    this.localKey = this.key.split('.').pop();
    this.filters = parseFilterTypes(getfilters(text));
    this.forComponent = (isFor ? getForComponent(text) : undefined);
    this.forId = id;
    this.isPointer = (!!localComponent);
    this.isDirty = (mapText.length !== 1);
    this.listener = listener;
    this.property = property;
    this.local = local;
    this.localAttr = localAttr;
    this.localComponent = localComponent;
    this.node = node;
    this.maps = maps;
    this.isEvent = (!!isAttr && __domEvents.indexOf(localAttr) !== -1);
    this.isInput = (node.tagName === 'INPUT');
    this.isRadio = (!!this.isInput && ['radio','checkbox'].indexOf(node.type) !== -1);
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
  
  function setDescriptorLocalMaps(parent)
  {
    var __arr = [],
        __parentExt = (parent && parent.__czosnekExtensions__);
    
    function get(){ return __arr; }
    
    function set(v)
    {
      __arr.push(v);
      if(__parentExt) __parentExt.localmaps = v;
    }
    
    return {
      get:get,
      set:set,
      enumerable: true,
      configurable: true
    }
  }
  
  function setDecriptorSubNodes(parent)
  {
    var __arr = [],
        __parentExt = (parent && parent.__czosnekExtensions__);
    
    function get(){ return __arr; }
    
    function set(v)
    {
      __arr.push(v);
      if(__parentExt) __parentExt.subnodes = v;
    }
    
    return {
      get: get,
      set: set,
      enumerable: true,
      configurable: true
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
    return str.split(__splitText).filter(Boolean);
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
    return (str.match(__matchFilters) ? str.replace(__replacefilters,'').split(',') : []);
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
        if(filter.indexOf('~') !== -1) filterObj.model.push(filter.replace(__replaceStoreFilter, ''));
        if(filter.indexOf('+') !== -1) filterObj.local.push(filter.replace(__replaceStoreFilter, ''));
        if(filter.indexOf('-') !== -1) filterObj.session.push(filter.replace(__replaceStoreFilter, ''));
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
  function isUnknown(node)
  {
    return ((node instanceof HTMLUnknownElement) || (node.nodeName.indexOf('-') !== -1))
  }
  
  function getUnknownHTML(html)
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
  
  function getUnknown(node)
  {
    if(typeof node === 'string') return getUnknownHTML(node);
    return __slice.call(node.querySelectorAll('*')).filter(isUnknown) 
  }
  
  function register(title, template)
  {
    if(__templates[title] === undefined)
    {
      __templates[title] = template
      
      /* replace single line elements <div /> to have their correct ending tag </div>. ignores inputs and img tags */
      .replace(__replaceEndingTag, "<$2 $3></$2>")
      .replace(/( \>)/g, '>')
      
      /* replaces <{{bind}}> tags as comments */
      .replace(__replaceNodeName, '<!--$1-->');
    }
    else
    {
      console.error("ERR: A template by the name %o already exists",name, new Error().stack);
    }
    return this;
  }
  
  function unregister(title)
  {
    __templates[title] = undefined;
    return this;
  }
  
  function clearRegistry()
  {
    var keys = Object.keys(__templates),
        x = 0,
        len = keys.length,
        key;
    
    for(x;x<len;x++)
    {
      key = keys[x];
      __templates[key] = undefined;
    }
    
    return this;
  }
  
  function isRegistered(title)
  {
    return (__templates[title] !== undefined);
  }
  
  function map(node, parent, maps, localComponent)
  {
    if(!node.__czosnekExtensions__)
    {
      var nodeType = node.nodeType,
          isElement = ([8,3].indexOf(nodeType) === -1);
      
      if(isUnknown(node)) localComponent = node;
      
      Object.defineProperty(node, '__czosnekExtensions__', setDescriptor(new attachExtensions((localComponent || node), parent, maps)));
      
      switch(nodeType)
      {
        /* Text Node */
        case 3:
          mapTextNode(node, parent, maps, localComponent);
          break;
        /* Comment Node */
        case 8:
          mapCommentNode(node, parent, maps, localComponent);
          break;
        /* Standard Element */
        default:
          mapElementNode(node, parent, maps, localComponent);
          break;
      }
      
      if(isElement)
      {
        var childNodes = node.childNodes,
            child,
            x = 0,
            len = childNodes.length;
        
        for(x;x<len;x++)
        {
          child = childNodes[x];
          map(child, node, maps, localComponent);
          
          /* In case we have a node bind that removes some sibling nodes */
          len = childNodes.length;
        }
      }
    }
    
    return maps;
  }
  
  /* ENDREGION */
  
  /* BIND HELPERS */
  /* REGION */
  
  function mapTextNode(node, parent, maps, localComponent)
  {
    if(!node.textContent.match(__matchText)) return;

    var text = node.textContent,
        extensions = node.__czosnekExtensions__,
        mapText = splitText(text),
        localmap,
        item,
        x = 0,
        len = mapText.length;
    
    for(x;x<len;x++)
    {
      item = mapText[x];
      
      /* MATCH INSERT TYPE */
      if(item.match(__matchInsert))
      {
        maps.push(new mapObject(item, mapText, 'insert', 'innerHTML', undefined, node, 'textContent', parent, maps, localComponent));
        mapText[x] = maps[(maps.length - 1)];
      }
      
      /* MATCH FOR TYPE */
      else if(item.match(__matchForText))
      {
        if(mapText.length !== 1) return console.error('ERR: loop binds can not include adjacent content,', text, 'in', parent);
        
        localmap = new mapObject(item, mapText, (localComponent ? 'pointers.loop' : 'loop'), 'innerHTML', 'html', node, 'textContent', parent, maps, localComponent, undefined, true);
            
        maps.push(localmap);
        mapText[x] = localmap;

        /* LOCAL MAPS */
        extensions.localmaps = localmap;

        /* POINTER FOR TYPE */
        if(localComponent) localComponent.__czosnekExtensions__.pointers.push(localmap);
      }
      
      /* MATCH TEXT TYPE */
      else if(item.match(__matchText))
      {
        localmap = new mapObject(item, mapText, 'standard', 'innerHTML', 'html', node, 'textContent', parent, maps, localComponent);
            
        maps.push(localmap);
        mapText[x] = localmap;

        /* LOCAL MAPS */
        extensions.localmaps = localmap;

        /* POINTER STANDARD TYPE */
        if(localComponent) localComponent.__czosnekExtensions__.pointers.push(localmap);
      }
    }
  }
  
  function mapCommentNode(node, parent, maps, localComponent)
  {
    if(!node.textContent.match(__matchText)) return;
    
    var text = node.textContent,
        extensions = node.__czosnekExtensions__,
        localmap,
        mapText = [text.replace(__replaceNodeBind, '$2')],
        item = mapText[0];
        
    if(item.match(__matchText))
    {
      var key = getKey(item),
          reg = new RegExp('(\<\/\{\{\s?'+key+'(.*?)\>)','g'),
          nodeChildren = [],
          sibling,
          next;
      
      localmap = new mapObject(item, mapText, 'node', 'innerHTML', 'html', node, 'node', parent, maps, localComponent);
          
      maps.push(localmap);
      mapText[0] = localmap;

      /* LOCAL MAPS */
      extensions.localmaps = localmap;

      /* POINTER NODE TYPE */
      if(localComponent) localComponent.__czosnekExtensions__.pointers.push(localmap);

      sibling = node.nextSibling;
      
      while(!sibling.textContent.match(reg))
      {
        next = sibling.nextSibling;
        nodeChildren.push(sibling);
        parent.removeChild(sibling);

        var div = document.createElement('div');
        div.appendChild(sibling);
        map(div, node, maps, localComponent);
        sibling = next;
      }
      parent.removeChild(node);
      parent.removeChild(sibling);

      /* double check that it is shared among object locations */
      mapText[0].nodeChildren = nodeChildren;
    }
  }
  
  function mapElementNode(node, parent, maps, localComponent)
  {
    var attrs = __slice.call(node.attributes),
        extensions = node.__czosnekExtensions__,
        localmap,
        item,
        x = 0,
        len = attrs.length,
        text,
        title,
        mapText,
        i,
        lenn;
    
    for(x;x<len;x++)
    {
      text = attrs[x].value;
      
      if(text.match(__matchText))
      {
        title = attrs[x].name;
        mapText = splitText(text);
        lenn = mapText.length;
        i = 0;

        for(i;i<lenn;i++)
        {
          item = mapText[i];
          if(item.match(__matchInsert))
          {
            maps.push(new mapObject(item, mapText, 'insert', title, undefined, attrs[x], 'value', node, maps, localComponent, true));
            mapText[i] = maps[(maps.length - 1)];
          }
          else if(item.match(__matchText))
          {
            localmap = new mapObject(item, mapText, 'standard', title, title, attrs[x], 'value', node, maps, localComponent, true);
              
            maps.push(localmap);
            mapText[i] = localmap;

            /* LOCAL MAPS */
            extensions.localmaps = localmap;

            /* POINTER TYPE */
            if(localComponent) localComponent.__czosnekExtensions__.pointers.push(localmap);
          }
        }
      }
    }
  }
  
  /* ENDREGION */
  
  /* CONSTRUCTOR */
  /* REGION */
  function Czosnek(node)
  {
    /* Name of the component */
    this.name = node.tagName.toLowerCase();

    if(!__templates[this.name]) console.error("ERR: Component "+this.name+" does not exist, make sure to create it", new Error().stack);

    /* template of the component */
    this.template = __templates[this.name] || '<div class="missing_component">Unknown Component</div>';

    /* original node */
    this.node = node;

    /* SETUP PARAMS */
    /* Fetch all possible params for this component: Attributes, pointers, html */
    this.params = __slice.call(this.node.attributes).reduce(function(o, v) {
      return ((o[v.name] = v.value) && o);
    },{});
    
    if(this.node.__czosnekExtensions__) this.pointers = this.node.__czosnekExtensions__.pointers;
    
    this.innerHTML = (this.node.childNodes || []);

    /* EXPAND NODE */
    var wrapper = document.createElement('div');
    wrapper.innerHTML = this.template;
    
    if(wrapper.children.length !== 1) return console.error('ERR: Component must be wrapped in a single element,', wrapper.children.length, 'nodes in', this.name, new Error().stack);
    
    this.expanded = wrapper.children[0];
    
    this.maps = map(this.expanded, undefined, []);
  }
  
  Object.defineProperties(Czosnek,{
    register:setDescriptor(register, false, true),
    unregister:setDescriptor(unregister, false, true),
    clearRegistry:setDescriptor(clearRegistry, false, true),
    isRegistered:setDescriptor(isRegistered, false, true),
    getUnknown:setDescriptor(getUnknown, false, true),
    isUnknown:setDescriptor(isUnknown, false, true)
  });
  /* ENDREGION */
  
  /* AMD AND COMMONJS COMPATABILITY */
  /* REGION */
  
  if (typeof define === "function" && define.amd){
    define('czosnek',function(){return Czosnek;});
  }
  if(typeof module === 'object' && typeof module.exports === 'object'){
    module.exports.czosnek = Czosnek;
  }
  
  /* ENDREGION */
  
  return Czosnek;
}());