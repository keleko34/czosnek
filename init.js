/* TODO: */

window.czosnek = (function(){
  
  /* SCOPED LOCALS */
  /* REGION */
  
      /* HTML TEMPLATES FOR COMPONENTS */
  var __templates = {},
      
      /* CSS STYLE TEMPLATES FOR COMPONENTS */
      __styles = {},
      
      __slice = Array.prototype.slice,
      
      __byteToHex = Array.apply(null, Array(256)).map(function(v, i){return (i + 0x100).toString(16).substr(1);}),
      
      __EventList__ = Object.keys(HTMLElement.prototype).filter(function(v){return (v.indexOf('on') === 0);})
      .concat([
        'onDOMContentLoaded','onDOMAttributeNameChanged',
        'onDOMAttrModified','onDOMCharacterDataModified',
        'onDOMNodeInserted','onDOMNodeRemoved',
        'onDOMSubtreeModified'])
        .map(function(v){ return (v.toLowerCase()); });
      
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
      __replaceNodeBind = /(<({{.*?}})(.*))/g,
      __matchLocal = /({{>?local}})/g,
      __matchLocalStyle = /((.*?)({{>?local}}[\r\n\s\S]*?{(([\r\n\s\W\w]+?)|(.*?))(?:[^}])}(?=[\n\.\r\s]|$)))/g;
      
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
      subnodes: setDescriptorSubNodes(parent)
    })
  }
  
  function mapObject(local_id, node_id, text, mapText, type, property, listener, local, localAttr, node, maps, isAttr, isFor, isPointer, isStyle, for_id)
  {
    this.key = (isFor ? getForKey(text) : getKey(text));
    /* Always force innerhtml */
    this.type = (this.key === 'innerHTML' ? 'insert' : type);
    this.text = text;
    this.mapText = mapText;
    this.keyLength = this.key.split('.').length;
    this.localKey = this.key.split('.').pop();
    this.filters = parseFilterTypes(getfilters(text));
    this.forComponent = (isFor ? getForComponent(text) : undefined);
    this.forId = for_id;
    this.isPointer = isPointer;
    this.isDirty = (mapText.length !== 1 || this.key === 'innerHTML');
    this.listener = listener;
    this.property = property;
    this.local = local
    this.localAttr = localAttr;
    this.node = node;
    this.maps = maps;
    this.isAttr = isAttr;
    this.isFor = isFor;
    this.isStyle = isStyle;
    this.isEvent = (!!isAttr && __EventList__.indexOf(localAttr) !== -1);
    this.isInput = (node.tagName === 'INPUT');
    this.isRadio = (!!this.isInput && ['radio','checkbox'].indexOf(node.type) !== -1);
    
    if(!isStyle)
    {
      Object.defineProperties(this, {
        localId: setDescriptorAttribute('component-id', local_id, node),
        nodeId: setDescriptorAttribute('node-id', (local_id + '-' + node_id), node)
      });
    }
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
  
  function setDescriptorSubNodes(parent)
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
  
  function setDescriptorAttribute(title, value, node)
  {
    var attr = node.attributes;
    if(!attr[title]) node.setAttribute(title, value);
    function get()
    {
      return attr[title].value;
    }
    function set(v)
    {
      attr[title].value = v;
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
    return ((node.nodeName.indexOf('-') !== -1) || node instanceof HTMLUnknownElement)
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
      if((key.indexOf('-') !== -1) || document.createElement(key) instanceof HTMLUnknownElement)
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
  
  function register(title, template, style)
  {
    if(__templates[title] === undefined)
    {
      __templates[title] = template
      
      /* replace single line elements <div /> to have their correct ending tag </div>. ignores inputs and img tags */
      .replace(__replaceEndingTag, "<$2 $3></$2>")
      .replace(/( \>)/g, '>')
      
      /* replaces <{{bind}}> tags as comments */
      .replace(__replaceNodeName, '<!--$1-->');
      
      style = (style || '');
      
      var local = (style.match(__matchLocalStyle) || ''),
          global = style.replace(__matchLocalStyle, '');
      
      __styles[title] = [global, (local && local.join('\r\n'))];
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
    __styles[title] = undefined;
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
      __styles[key] = undefined;
    }
    
    return this;
  }
  
  function isRegistered(title)
  {
    return (__templates[title] !== undefined);
  }
  
  function map(component, style, id)
  {
    var maps = [];
    
    createGlobalStyleMaps(style[0], maps, id);
    createLocalStyleMaps(style[1], maps, id);
    
    return createMaps(component, undefined, maps, id);
  }
  
  /* creates style objects, one is localized to the component, one is global */
  function style(title, id)
  {
    if(!__templates[title]) return console.error("ERR: Component "+title+" does not exist, make sure to create it", new Error().stack);
    
    var styleTemplates = __styles[title],
        mainStyle = (document.head.querySelector('style[title="'+ title +'"]') || createStyleNode(title, styleTemplates[0])),
        localStyle = createStyleNode(id, styleTemplates[1]);
    
    return [mainStyle, localStyle];
  }
  
  function expand(title)
  {
    var wrapper = document.createElement('div');
    wrapper.innerHTML = (__templates[title] || '<div class="missing_component">Unknown Component</div>');

    if(wrapper.children.length !== 1) return console.error('ERR: Component must be wrapped in a single element,', wrapper.children.length, 'nodes in', title, new Error().stack);

    return wrapper.children[0];
  }
  
  /* ENDREGION */
  
  /* BIND HELPERS */
  /* REGION */
  
  function uuid()
  {
    var rnds = new Uint8Array(8).map(function(){return Math.floor((Math.random() * 99) + 1)}),
        i = 0;
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x0f) | 0x80;
    
    return ([__byteToHex[rnds[i++]], __byteToHex[rnds[i++]], 
             __byteToHex[rnds[i++]], __byteToHex[rnds[i++]],
             __byteToHex[rnds[i++]], __byteToHex[rnds[i++]],
             __byteToHex[rnds[i++]], __byteToHex[rnds[i++]]]).join('');
  }
  
  function createMaps(node, parent, maps, id)
  {
    id = (id || uuid());
    
    Object.defineProperty(node, '__czosnekExtensions__', setDescriptor(new attachExtensions(node, parent, maps)));
    
    switch(node.nodeType)
    {
      /* Text Node */
      case 3:
        mapTextNode(node, parent, maps, id);
        break;
      /* Comment Node */
      case 8:
        mapCommentNode(node, parent, maps, id);
        break;
      /* Standard Element */
      default:
        if(isUnknown(node))
        {
          mapComponentNode(node, parent, maps, id);
        }
        else
        {
          mapElementNode(node, parent, maps, id);
        }
        break;
    }
    
    if(node.childNodes)
    {
        var x = 0,
            len = node.childNodes.length;
      
      for(x;x<len;x++)
      {
        createMaps(node.childNodes[x], node, maps, id);
        len = node.childNodes.length;
      }
    }
    
    return maps;
  }
  
  function createGlobalStyleMaps(node, maps, id)
  {
    id = (id || uuid());
    if(!node.__czosnekExtensions__) Object.defineProperty(node, '__czosnekExtensions__', setDescriptor(new attachExtensions(node, parent, maps)));
    
    var localmaps = node.__czosnekExtensions__.localmaps;
    
    if(localmaps && localmaps.length)
    {
      var x = 0,
          len = localmaps.length;
      
      for(x;x<len;x++)
      {
        maps.push(localmaps[x]);
      }
    }
    else
    {
      mapStyleNode(node, maps, id);
    }
    return maps;
  }
  
  function createLocalStyleMaps(node, maps, id)
  {
    id = (id || uuid());
    if(!node.__czosnekExtensions__) Object.defineProperty(node, '__czosnekExtensions__', setDescriptor(new attachExtensions(node, parent, maps)));
    mapStyleNode(node, maps, id, uuid());
    return maps;
  }
  
  function createStyleNode(title, template)
  {
    var styleNode = document.createElement('style');
    styleNode.type = 'text/css';
    styleNode.title =  title;
    styleNode.textContent = template;
    
    document.head.appendChild(styleNode);
    
    return styleNode;
  }
  
  function mapTextNode(node, parent, maps, id)
  {
    if(!node.textContent.match(__matchText)) return;

    var text = node.textContent,
        extensions = node.__czosnekExtensions__,
        mapText = splitText(text),
        localmap,
        item,
        x = 0,
        len = mapText.length,
        nodeId = uuid(),
        u = undefined,
        f = false;
    
    for(x;x<len;x++)
    {
      item = mapText[x];
      
      /* MATCH INSERT TYPE */
      if(item.match(__matchInsert))
      {
        maps.push(new mapObject(id, nodeId, item, mapText, 'insert', 'innerHTML', u, node, 'textContent', parent, maps));
        mapText[x] = maps[(maps.length - 1)];
      }
      
      /* MATCH FOR TYPE */
      else if(item.match(__matchForText))
      {
        if(mapText.length !== 1) return console.error('ERR: loop binds can not include adjacent content,', text, 'in', parent);
        
        localmap = new mapObject(id, nodeId, item, mapText, 'loop', 'innerHTML', 'html', node, 'textContent', parent, maps, f, true, f, f, f, uuid());
            
        maps.push(localmap);
        mapText[x] = localmap;

        /* LOCAL MAPS */
        extensions.localmaps = localmap;
      }
      
      /* MATCH TEXT TYPE */
      else if(item.match(__matchText))
      {
        localmap = new mapObject(id, nodeId, item, mapText, 'standard', 'innerHTML', 'html', node, 'textContent', parent, maps);
            
        maps.push(localmap);
        mapText[x] = localmap;

        /* LOCAL MAPS */
        extensions.localmaps = localmap;
      }
    }
  }
  
  function mapCommentNode(node, parent, maps, id)
  {
    if(!node.textContent.match(__matchText)) return;
    
    var text = node.textContent,
        extensions = node.__czosnekExtensions__,
        localmap,
        mapText = [text.replace(__replaceNodeBind, '$2')],
        item = mapText[0],
        nodeId = uuid();
        
    if(item.match(__matchText))
    {
      /* TODO: Should we allow multiple inner hot swappable components? */
      var key = getKey(item),
          reg = new RegExp('(\<\/\{\{\s?'+key+'(.*?)\>)','g'),
          nodeChildren = [],
          sibling,
          next;
      
      localmap = new mapObject(id, nodeId, item, mapText, 'node', 'innerHTML', 'html', node, 'node', parent, maps);

      maps.push(localmap);
      mapText[0] = localmap;

      /* LOCAL MAPS */
      extensions.localmaps = localmap;

      /* POINTER NODE TYPE */
      /* TODO: map to unknown component comment attributes */
      // node.__czosnekExtensions__.pointers.push(localmap);

      sibling = node.nextSibling;
      
      while(!sibling.textContent.match(reg))
      {
        next = sibling.nextSibling;
        nodeChildren.push(sibling);
        parent.removeChild(sibling);

        var div = document.createElement('div');
        div.appendChild(sibling);
        createMaps(div, node, maps, id);
        sibling = next;
      }
      parent.removeChild(node);
      parent.removeChild(sibling);

      /* double check that it is shared among object locations */
      mapText[0].nodeChildren = nodeChildren;
    }
  }
  
  function mapElementNode(node, parent, maps, id)
  {
    var attrs = __slice.call(node.attributes),
        extensions = node.__czosnekExtensions__,
        nodeId = uuid(),
        localmap,
        item,
        event,
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
        event = __EventList__.indexOf(title);
        
        if(event === -1)
        {
          for(i;i<lenn;i++)
          {
            item = mapText[i];
            if(item.match(__matchInsert))
            {
              maps.push(new mapObject(id, nodeId, item, mapText, 'insert', title, undefined, attrs[x], 'value', node, maps, true));
              mapText[i] = maps[(maps.length - 1)];
            }
            else if(item.match(__matchText))
            {
              localmap = new mapObject(id, nodeId, item, mapText, 'standard', title, title, attrs[x], 'value', node, maps, true);

              maps.push(localmap);
              mapText[i] = localmap;

              /* LOCAL MAPS */
              extensions.localmaps = localmap;
            }
          }
        }
        else
        {
          if(lenn === 1)
          {
            item = mapText[0];
            if(item.match(__matchInsert))
            {
              maps.push(new mapObject(id, nodeId, item, mapText, 'event', __EventList__[event], undefined, node, __EventList__[event], node, maps, true));
              mapText[i] = maps[(maps.length - 1)];
            }
            if(item.match(__matchText))
            {
              localmap = new mapObject(id, nodeId, item, mapText, 'event', __EventList__[event], __EventList__[event], node, __EventList__[event], node, maps, true)
              maps.push(localmap);
              mapText[i] = localmap;
              
              /* LOCAL MAPS */
              extensions.localmaps = localmap;
            }
          }
          else
          {
            console.error(node, text, new Error('You can only have a single bind in events'))
          }
        }
      }
    }
  }
  
  function mapComponentNode(node, parent, maps, id)
  {
    var attrs = __slice.call(node.attributes),
        extensions = node.__czosnekExtensions__,
        nodeId = uuid(),
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
            maps.push(new mapObject(id, nodeId, item, mapText, 'insert', title, undefined, attrs[x], 'value', node, maps, true));
            mapText[i] = maps[(maps.length - 1)];
          }
          else if(item.match(__matchText))
          {
            localmap = new mapObject(id, nodeId, item, mapText, 'insert', title, title, attrs[x], 'value', node, maps, true);

            maps.push(localmap);
            mapText[i] = localmap;

            /* LOCAL MAPS */
            extensions.localmaps = localmap;
            extensions.pointers.push(localmap);
            extensions.innerHTML = node.childNodes;
          }
        }
      }
    }
  }
  
  function mapStyleNode(node, maps, id, localid)
  {
    if(!node.textContent.match(__matchText)) return;
    
    var text = node.textContent,
        extensions = node.__czosnekExtensions__,
        mapText = splitText(text),
        outputText = [],
        localmap,
        item,
        x = 0,
        len = mapText.length,
        nodeId = localid,
        u = undefined,
        f = false;
    
    for(x;x<len;x++)
    {
      item = mapText[x];
      outputText[x] = item;
      /* MATCH LOCAL KEY */
      if (item.match(__matchLocal))
      {
        outputText[x] = '[component-id="'+ id +'"]';
      }
      /* MATCH INSERT TYPE */
      else if(item.match(__matchInsert))
      {
        maps.push(new mapObject(id, nodeId, item, mapText, 'insert', 'html', u, node, 'textContent', node, maps, f, f, f, true));
        mapText[x] = maps[(maps.length - 1)];
      }
      /* MATCH TEXT TYPE */
      else if(item.match(__matchText))
      {
        localmap = new mapObject(id, nodeId, item, mapText, 'standard', 'innerHTML', 'html', node, 'textContent', node, maps, f, f, f, true);
            
        maps.push(localmap);
        mapText[x] = localmap;

        /* LOCAL MAPS */
        extensions.localmaps = localmap;
      }
    }
    
    node.textContent = outputText.join('');
  }
  
  /* ENDREGION */
  
  /* CONSTRUCTOR */
  /* REGION */
  function Czosnek(title)
  {
    if(!__templates[title]) return console.error("ERR: Component "+title+" does not exist, make sure to create it", new Error().stack);
    /* Name of the component */
    this.title = title;
    
    /* Component ID */
    this.id = uuid();
    
    /* created component */
    this.component = expand(title);
    
    /* Expanded styles */
    this.style = style(title, this.id);
    
    /* Maps of component */
    this.maps = map(this.component, this.style, this.id);
  }
  
  Object.defineProperties(Czosnek,{
    register:setDescriptor(register, false, true),
    unregister:setDescriptor(unregister, false, true),
    clearRegistry:setDescriptor(clearRegistry, false, true),
    isRegistered:setDescriptor(isRegistered, false, true),
    getUnknown:setDescriptor(getUnknown, false, true),
    isUnknown:setDescriptor(isUnknown, false, true),
    expand:setDescriptor(expand, false, true),
    map:setDescriptor(map, false, true)
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