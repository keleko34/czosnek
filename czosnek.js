/* TODO: */

/* Map types:
   insert: single insert value item
   standard: a standard bind item
   loop: a for loop bind
   event: an event attr was used
   pointer: an attr on a component, needs pointer
   stylesheet: a bind on a stylesheet
   node: a component that uses a bind for the component used
   style: a style attribute map
   attr: a unique attr name map
*/

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
        .map(function(v){ return (v.toLowerCase()); }),
      
      __registered__ = [];
      
  /* ENDREGION */
  
  /* REGEX RULES */
  /* REGION */
  
  /* regex for searching for nodes */
  var __reNodes = /(<\/.*?>)/g,
      __matchNodes = /(<.*?([^{]>))/g,
      __matchBrace = /[{]/g,
      __matchNodeBind = /(<\/?{{.*?}}.*?>)/g,
      __matchAttrNameBind = /({{(?:(?!{{).)*?}}=["'].*?["'])/g,
      __matchStyleAttr = /(style=["'].*?{{.*?}}.*?["'])/g,
      __matchStyleClass = /(({([\s\r\n\t]+)?{{.[^}]*?}}([\s\r\n\t]+)?})([\s\r\n\t]+)?)$/g,
      __matchPrevProperty = /(:(\s+)?)$/g,
      __matchNextProperty = /^((\s+)?;)/g,
      __matchClosestBrace = /^(([\s\r\n\t]+)?})/g,
      __matchValues = /(^(\s+)?:(\s+)?(.*?);)|(^(\s+)?:([\s\w\W]+)?)|(^([\s\w\W]+)?;)/g,
      __replaceTagName = /(<\/?(\w.*?)\s.*?>)/g,
      /* splits binds out of text */
      __matchText = /(?!\{\{\{)(?!\}\}\})(\{\{.*?\}\})/g,
      __splitText = /(?!\{\{\{)(?!\}\}\})(\{\{.*?\}\})/g,
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
      __replaceNodeNameStart = /(<({{(.*?)}})(.*?)>)/g,
      __replaceNodeNameFinish = /(<\/({{(.*?)}})>)/g,
      __matchAttr = /(([\w{}|+\-~].*?:[\w\W{}|+\-~].*?)(?=[;\n\r]))|([\w{}|+\-~].*?:[\w\W{}|+\-~].*?)$/g,
      __matchStyles= /(([\w{}|+\-~].*?:[\w\W{}|+\-~].*?)(?=[;\n\r]))|([\w{}|+\-~].*?:[\w\W{}|+\-~].*?)$|(({{.*?}})(?=[;\n\r]))|(({{.*?}}))$/g,
      __matchLocal = /({{>?local}})/g,
      __matchLocalStyle = /(([^};][\s\w\.]+?)?{{>?local}}(([\r\n\s\S]*?{(([\r\n\s\W\w]+?)|(.*?))(?:[^}])}(?=[\n\.\r\s]|$))|(((.[^;\r\n\t↵]*?)({{.[^}]*?}})(\s+)?)$)))/g,
      __replaceStyleValue = /(:(\s+)?(.*?);)/g,
      __replaceEndStyleValue = /((\s+)?(.*?);)/g,
      __replaceColonAndString = /(:\s+)/g,
      __replaceSingleQuotes = /(^['])|([']$)/g;
  
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
  
  function mapObject(obj)
  {
    /* The key of the bind */
    this.key = (obj.key || (obj.isLoop ? getLoopKey(obj.text) : getKey(obj.text)));
    
    /* see map types comment */
    this.type = obj.type;
    
    /* The entire text associated with the bind */
    this.text = obj.text;
    
    /* The entire text as an array with binds being map objects */
    this.mapText = obj.mapText;
    
    /* The length of the key in case it is a deep proeprty key eg. prop.innerprop.mostinnerprop */
    this.keyLength = (obj.keyLength || this.key.split('.').length);
    
    /* The last key in the key string in case its a deep property key */
    this.localKey = (obj.localKey || this.key.split('.').pop());
    
    /* Filters attache to the bind */
    this.filters = (obj.filters || parseFilterTypes(getfilters(this.text)));
    
    /* The unique id for the for loop */
    this.loopId = obj.loop_id;
    
    /* Whether this bind was associated with a component */
    this.isPointer = obj.isPointer;
    
    /* Tells if the bind had extra content with it, this effects whether a two-way bind is allowed */
    this.isDirty = (obj.isDirty !== undefined ? obj.isDirty : (this.mapText.length !== 1 || this.key === 'innerHTML'));
    
    /* The dom listener to listen for changes */
    this.listener = obj.listener;
    
    /* The associated property of the node */
    this.property = obj.property;
    
    /* The local object node eg (Text, Element, Attr) */
    this.local = obj.local
    
    /* The local property associated with the local object node that will update the dom */
    this.localAttr = obj.localAttr;
    
    /* The associated Element of the local node, if Text or Attr then this is their parent */
    this.node = obj.node;
    
    /* All the maps associated with this component */
    this.maps = obj.maps;
    
    /* All the maps associated with just the values */
    this.mapValues = (obj.mapValues || []);
    
    /* The index that this object is in the map array */
    this.mapIndex = obj.mapIndex;
    
    /* The index that this object is in the mapText array */
    this.mapTextIndex = obj.mapTextIndex;
    
    /* if this map is a attr name or a style name */
    this.isProperty = obj.isProperty;
    
    /* if this map belongs to a attr or style name map */
    this.isProperyValue = obj.isPropertyValue;
    
    /* if this bind is an attribute bind */
    this.isAttr = obj.isAttr;
    
    /* if this bind is a for loop bind */
    this.isLoop = obj.isLoop;
    
    /* if this bind is a style bind */
    this.isStyleSheet = obj.isStyleSheet;
    
    /* if this bind is an inline style */
    this.isInlineStyle = obj.isInlineStyle;
    
    /* determines if an entire css class is a map */
    this.isFullStyle = obj.isFullStyle;
    
    /* determines if an entire css property is a map */
    this.isFullProp = obj.isFullProp;
    
    /* if this bind is an event bind */
    this.isEvent = (obj.isEvent !== undefined ? obj.isEvent : (!!this.isAttr && __EventList__.indexOf(this.localAttr) !== -1));
    
    /* if this bind is a value bind on an input */
    this.isInput = (obj.isInput !== undefined ? obj.isInput : (this.node.tagName === 'INPUT'));
    
    /* if this bind is a value bind on a radio element */
    this.isRadio = (obj.isRadio !== undefined ? obj.isRadio : (!!this.isInput && ['radio','checkbox'].indexOf(this.node.type) !== -1));
    
    /* If the bind is meant to be inserted */
    this.isInsert = (this.key === 'innerHTML' ? true : obj.isInsert);
    
    this.isGlobal = obj.isGlobal;
    
    /* IN case its a for bind, this is the component name with it */
    this.component = (obj.component || (this.isLoop ? getLoopComponent(this.text) : undefined));
    
    /* Extra property to hold values assocated with a style or attr name bind eg {{attr}}="This is values" similiar to mapObject but gets passed to the {{attr}} bind in the event it is a function */
    this.values = (obj.values || []);
    
	if(!this.isGlobal)
	{
		Object.defineProperties(this, {
		  nodeId: setDescriptorAttribute('node-id', (obj.nodeId || (obj.local_id + '-' + obj.node_id)), this.node)
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
        __parentExt = (parent && parent.__CzosnekExtensions__);
    
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
        __parentExt = (parent && parent.__CzosnekExtensions__);
    
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
  function getLoopKey(str)
  {
    return str.replace(__replaceForKey, '');
  }
  
  /* takes a for bind and returns just the component
     EXAMPLE::
      string: "{{for items loop listitem}}"
      return: "listitem"
  */
  function getLoopComponent(str)
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
      /* replaceCommentHTML replaces nodes with <{{nodename}}, <div {{attrname}}="", and <div style="color:{{color}};" type binds with comment nodes */
      __templates[title] = replaceNonConformingHTML(template
      
      /* replace single line elements <div /> to have their correct ending tag </div>. ignores inputs and img tags */
      .replace(__replaceEndingTag, "<$2 $3></$2>")
      .replace(/( \>)/g, '>')
      
      .replace(__replaceNodeNameStart, '<kaleoreplacenode__ __kaleonodebind__="$2" $4>')
      .replace(__replaceNodeNameFinish, '</kaleoreplacenode__>'));
      
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
    removeAllComponents(title);
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
        mainStyle = (document.head.querySelector('style[component="'+ title +'"]') || createStyleNode(title, styleTemplates[0], undefined, true)),
        localStyle = createStyleNode(title, styleTemplates[1], id);
    
    return [mainStyle, localStyle];
  }
  
  function expand(title)
  {
    var wrapper = document.createElement('div');
    wrapper.innerHTML = (__templates[title] || '<div class="missing_component">Unknown Component</div>');

    if(wrapper.children.length !== 1) return console.error('ERR: Component must be wrapped in a single element,', wrapper.children.length, 'nodes in', title, new Error().stack);
    
    wrapper.children[0].setAttribute('root', '');
    wrapper.children[0].setAttribute('component', title);
    wrapper.children[0].title = title;
    
    return wrapper.children[0];
  }
  
  function destruct(component)
  {
    var mapComponent = (component || this);
    if(!mapComponent.maps) return this;
    
    var components = document.body.querySelectorAll('[component="'+mapComponent.title+'"]'),
        len = (components || []).length;
    
    __registered__.splice(__registered__.indexOf(mapComponent), 1);
    
    while(mapComponent.maps[0])
    {
      mapComponent.maps.splice(0, 1);
    }
    /* May need to destruct __CzosnekExtensions__ here as well */
    if(!len)
    {
      removeComponentStyles(mapComponent.title);
    }
    return this;
  }
  
  /* ENDREGION */
  
  /* BIND HELPERS */
  /* REGION */
  
  function removeAllComponents(title)
  {
    var len = __registered__.length,
        x = 0;
    for(x;x<len;x++)
    {
      if(__registered__[x].title === title) __registered__[x].destruct();
    }
  }
  
  function removeComponentStyles(title)
  {
    var nodes = document.head.querySelectorAll('[component="'+title+'"]'),
        len = nodes.length,
        x = 0;
    for(x;x<len;x++){ document.head.removeChild(nodes[x]); }
  }
  
  function replaceNonConformingHTML(html)
  {
    /* get nodes by start and finish */
    var nodes = html.match(__matchNodes),
        matches,
        match,
        node,
        len = nodes.length,
        x = 0,
        lenn,
        i;
    
    for(x;x<len;x++)
    {
      node = nodes[x];
      if(node.match(__matchAttrNameBind))
      {
        matches = node.match(__matchAttrNameBind);
        lenn = matches.length;
        i = 0;
        for(i;i<lenn;i++)
        {
          match = matches[i];
          matches[i] = matches[i].replace('=',':').replace(/["]/g, "'") + ';'
          nodes[x] = nodes[x].replace(match, '');
        }
        nodes[x] = nodes[x].replace('>', '__kaleoattrsbind__="' + matches.join('') + '">')
      }
      
      if(node.match(__matchStyleAttr))
      {
        nodes[x] = nodes[x].replace('style=', '__kaleostylebind__=');
      }
      html = html.replace(node, nodes[x]);
    }
    return html;
  }
  
  function uuid()
  {
    var rnds = new Uint8Array(8),
        len = rnds.length,
        x = 0,
        i = 0;
    
    /* IE11 does not support map function on Byte Arrays */
    for(x;x<len;x++)
    {
      rnds[x] = Math.floor((Math.random() * 99) + 1);
    }
    
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x0f) | 0x80;
    
    return ([__byteToHex[rnds[i++]], __byteToHex[rnds[i++]], 
             __byteToHex[rnds[i++]], __byteToHex[rnds[i++]],
             __byteToHex[rnds[i++]], __byteToHex[rnds[i++]],
             __byteToHex[rnds[i++]], __byteToHex[rnds[i++]]]).join('');
  }
  
  function createMaps(node, parent, maps, id)
  {
    /* skip comment nodes */
    if(node.nodeType === 8) return maps;
    
    id = (id || uuid());
    
    Object.defineProperty(node, '__CzosnekExtensions__', setDescriptor(new attachExtensions(node, parent, maps)));
    
    switch(node.nodeType)
    {
      /* Text Node */
      case 3:
        mapTextNode(node, parent, maps, id);
        break;
      /* Standard Element */
      default:
        node.setAttribute('node-id', (id + '-' + uuid()))
        if(node.nodeName === 'KALEOREPLACENODE__')
        {
          mapMapNode(node, parent, maps, id);
        }
        else if(isUnknown(node))
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
  
  function createGlobalStyleMaps(node, maps)
  {
    if(!node.__CzosnekExtensions__) Object.defineProperty(node, '__CzosnekExtensions__', setDescriptor(new attachExtensions(node, parent, maps)));
    
    var localmaps = node.__CzosnekExtensions__.localmaps;
    
    if(localmaps && localmaps.length)
    {
      var x = 0,
          len = localmaps.length;
      
      for(x;x<len;x++)
      {
        maps.push(localmaps[x])
      }
    }
    else
    {
      mapStyleNode(node, maps, undefined, undefined, true);
    }
    return maps;
  }
  
  function createLocalStyleMaps(node, maps, id)
  {
    if(!node.__CzosnekExtensions__) Object.defineProperty(node, '__CzosnekExtensions__', setDescriptor(new attachExtensions(node, parent, maps)));
	node.setAttribute('component-id', id);
    mapStyleNode(node, maps, id, uuid());
    return maps;
  }
  
  function createStyleNode(title, template, id)
  {
    var styleNode = document.createElement('style');
    styleNode.type = 'text/css';
    styleNode.setAttribute('component', title);
    styleNode.textContent = template;
    document.head.appendChild(styleNode);
    
    return styleNode;
  }
  
  function mapTextNode(node, parent, maps, id)
  {
    if(!node.textContent.match(__matchText)) return;

    var text = node.textContent,
        extensions = node.__CzosnekExtensions__,
        mapText = splitText(text),
        localmap,
        item,
        x = 0,
        len = mapText.length,
        nodeId = uuid();
    
    for(x;x<len;x++)
    {
      item = mapText[x];
      
      /* MATCH INSERT TYPE */
      if(item.match(__matchInsert))
      {
        maps.push(new mapObject({
          local_id: id,
          node_id: id,
          mapIndex: maps.length,
          mapTextIndex: x,
          text: item,
          mapText: mapText,
          maps: maps,
          type: 'standard',
          isInsert: true,
          property: 'textContent',
          local: node,
          localAttr: 'textContent',
          node: parent
        }));
        mapText[x] = maps[(maps.length - 1)];
      }
      
      /* MATCH FOR TYPE */
      else if(item.match(__matchForText))
      {
        if(mapText.length !== 1) return console.error('ERR: loop binds can not include adjacent content,', text, 'in', parent);
        
        localmap = new mapObject({
          local_id: id,
          node_id: nodeId,
          mapIndex: maps.length,
          mapTextIndex: 0,
          text: item,
          mapText: mapText,
          maps: maps,
          type: 'loop',
          property: 'innerHTML',
          listener: 'html',
          local: node,
          localAttr: 'innerHTML',
          node: parent,
          isLoop: true,
          loop_id: uuid()
        });
            
        maps.push(localmap);
        mapText[x] = maps[(maps.length - 1)];

        /* LOCAL MAPS */
        extensions.localmaps = maps[(maps.length - 1)];
      }
      
      /* MATCH TEXT TYPE */
      else if(item.match(__matchText))
      {
        localmap = new mapObject({
          local_id: id,
          node_id: nodeId,
          mapIndex: maps.length,
          mapTextIndex: x,
          text: item,
          mapText: mapText,
          maps: maps,
          type: 'standard',
          property: 'textContent',
          listener: 'html',
          local: node,
          localAttr: 'textContent',
          node: parent
        });
            
        maps.push(localmap);
        mapText[x] = maps[(maps.length - 1)];

        /* LOCAL MAPS */
        extensions.localmaps = maps[(maps.length - 1)];
      }
    }
  }
  
  function mapElementNode(node, parent, maps, id)
  {
    var attrs = __slice.call(node.attributes),
        extensions = node.__CzosnekExtensions__,
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
      title = attrs[x].name;
      if(title === '__kaleoattrsbind__')
      {
        mapAttrName(node, text, maps, id, nodeId);
      }
      else if(title === '__kaleostylebind__')
      {
        mapStyleAttr(node, text, maps, id, nodeId);
      }
      else if(text.match(__matchText))
      {
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
              maps.push(new mapObject({
                local_id: id,
                node_id: nodeId,
                mapIndex: maps.length,
                mapTextIndex: i,
                text: item,
                mapText: mapText,
                maps: maps,
                type: 'standard',
                isInsert: true,
                property: title,
                local: attrs[x],
                localAttr: 'value',
                node: node,
                isAttr: true
              }));
              mapText[i] = maps[(maps.length - 1)];
            }
            else if(item.match(__matchText))
            {
              localmap = new mapObject({
                local_id: id,
                node_id: nodeId,
                mapIndex: maps.length,
                mapTextIndex: i,
                text: item,
                mapText: mapText,
                maps: maps,
                type: 'standard',
                property: title,
                listener: title,
                local: attrs[x],
                localAttr: 'value',
                node: node,
                isAttr: true
              });

              maps.push(localmap);
              mapText[i] = maps[(maps.length - 1)];

              /* LOCAL MAPS */
              extensions.localmaps = maps[(maps.length - 1)];
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
              maps.push(new mapObject({
                local_id: id,
                node_id: nodeId,
                mapIndex: maps.length,
                mapTextIndex: i,
                text: item,
                mapText: mapText,
                maps: maps,
                type: 'event',
                isInsert: true,
                property: __EventList__[event],
                local: node,
                localAttr: __EventList__[event],
                node: node,
                isEvent: true
              }));
              mapText[i] = maps[(maps.length - 1)];
              node.removeAttribute(title);
            }
            if(item.match(__matchText))
            {
              localmap = new mapObject({
                local_id: id,
                node_id: nodeId,
                mapIndex: maps.length,
                mapTextIndex: i,
                text: item,
                mapText: mapText,
                maps: maps,
                type: 'event',
                property: __EventList__[event],
                listener: __EventList__[event],
                local: node,
                localAttr: __EventList__[event],
                node: node,
                isEvent: true
              })
              maps.push(localmap);
              mapText[i] = maps[(maps.length - 1)];
              
              /* LOCAL MAPS */
              extensions.localmaps = maps[(maps.length - 1)];
              node.removeAttribute(title);
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
        extensions = node.__CzosnekExtensions__,
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
      title = attrs[x].name;
      if(title === '__kaleoattrsbind__')
      {
        mapAttrName(node, text, maps, id, nodeId);
      }
      else if(title === '__kaleostylebind__')
      {
        mapStyleAttr(node, text, maps, id, nodeId);
      }
      else if(text.match(__matchText))
      {
        mapText = splitText(text);
        lenn = mapText.length;
        i = 0;
        
        for(i;i<lenn;i++)
        {
          item = mapText[i];
          if(item.match(__matchInsert))
          {
            maps.push(new mapObject({
              local_id: id,
              node_id: nodeId,
              mapIndex: maps.length,
              mapTextIndex: i,
              text: item,
              mapText: mapText,
              maps: maps,
              type: 'pointer',
              isInsert: true,
              property: title,
              local: attrs[x],
              localAttr: 'value',
              node: node,
              isAttr: true
            }));
            mapText[i] = maps[(maps.length - 1)];
          }
          else if(item.match(__matchText))
          {
            localmap = new mapObject({
              local_id: id,
              node_id: nodeId,
              mapIndex: maps.length,
              mapTextIndex: i,
              text: item,
              mapText: mapText,
              maps: maps,
              type: 'pointer',
              property: title,
              listener: title,
              local: attrs[x],
              localAttr: 'value',
              node: node,
              isAttr: true,
              isPointer: true
            });

            maps.push(localmap);
            mapText[i] = maps[(maps.length - 1)];

            /* LOCAL MAPS */
            extensions.localmaps = maps[(maps.length - 1)];
            extensions.pointers.push(maps[(maps.length - 1)]);
            extensions.innerHTML = node.childNodes;
          }
        }
      }
    }
  }
  
  function mapStyleNode(node, maps, id, localid, isGlobal)
  {
    if(!node.textContent.match(__matchText)) return;
    
    var text = node.textContent,
        extensions = node.__CzosnekExtensions__,
        isFullStyle = false,
        isFullProp = false,
        prevIsString,
        nextIsString,
        prevMatch,
        nextMatch,
        titleMap,
        mapText = splitText(text),
        mapValues,
        outputText = [],
        localmap,
        item,
        x = 0,
        len = mapText.length,
        nodeId = localid;
    
    /* TODO: allow binding class style and property style */
    for(x;x<len;x++)
    {
      item = mapText[x];
      prevIsString = (typeof mapText[x - 1] === 'string' && mapText[x - 1]);
      nextIsString = (typeof mapText[x + 1] === 'string' && mapText[x + 1]);
      isFullStyle = false;
      isFullProp = false;
      /* MATCH LOCAL KEY */
      if(item.match(__matchLocal))
      {
        outputText[x] = '[component-id="'+ id +'"]';
        mapText[x] = outputText[x];
      }
      /* MATCH INSERT TYPE */
      else if(item.match(__matchInsert))
      {
        if(prevIsString && !prevIsString.match(__matchPrevProperty))
        {
          nextMatch = (nextIsString && nextIsString.match(__matchClosestBrace))
          prevMatch = (prevIsString + mapText[x] + (nextMatch ? nextMatch[0] : '')).match(__matchStyleClass);
          nextMatch = (nextIsString && nextIsString.match(__matchNextProperty));
          isFullStyle = (prevMatch && (prevMatch[0].indexOf(';') === -1) && !nextMatch);
          isFullProp = (!!nextMatch);
        }
        
        mapValues = (titleMap ? titleMap.mapValues : maps);
        
        localmap = new mapObject({
          local_id: id,
          node_id: nodeId,
          mapIndex: mapValues.length,
          mapTextIndex: (titleMap ? -1 : x),
          text: item,
          mapText: mapText,
          maps: mapValues,
          type: 'stylesheet',
          isInsert: true,
          property: 'innerHTML',
          local: node,
          localAttr: 'innerHTML',
          node: node,
          isStyleSheet: true,
          isFullStyle: isFullStyle,
          isFullProp: isFullProp,
          isGlobal: isGlobal
        });
        
        if(titleMap)
        {
          mapText.splice(x, 1);
          len = mapText.length;
          x -= 1;
		  localmap.isProperyValue = true;
          titleMap.mapValues.push(localmap);
          titleMap.values.push(titleMap.mapValues[(titleMap.mapValues.length - 1)]);
        }
        else if(!titleMap && mapText[x + 1] && mapText[x + 1].indexOf(':') === 0)
        {
		  localmap.isProperty = true;
          maps.push(localmap);
          mapText[x] = maps[(maps.length - 1)];
          titleMap = maps[(maps.length - 1)];
          outputText[x] = item;
        }
        else
        {
          maps.push(localmap);
          mapText[x] = maps[(maps.length - 1)];
          outputText[x] = item;
        }
      }
      /* MATCH TEXT TYPE */
      else if(item.match(__matchText))
      {
        if(prevIsString && !prevIsString.match(__matchPrevProperty))
        {
          nextMatch = (nextIsString && nextIsString.match(__matchClosestBrace))
          prevMatch = (prevIsString + mapText[x] + (nextMatch ? nextMatch[0] : '')).match(__matchStyleClass);
          nextMatch = (nextIsString && nextIsString.match(__matchNextProperty));
          isFullStyle = (prevMatch && (prevMatch[0].indexOf(';') === -1) && !nextMatch);
          isFullProp = (!!nextMatch);
        }
        
        mapValues = (titleMap ? titleMap.mapValues : maps);
        
        localmap = new mapObject({
          local_id: id,
          node_id: nodeId,
          mapIndex: mapValues.length,
          mapTextIndex: (titleMap ? -1 : x),
          text: item,
          mapText: mapText,
          maps: mapValues,
          type: 'stylesheet',
          property: 'innerHTML',
          listener: 'html',
          local: node,
          localAttr: 'innerHTML',
          node: node,
          isStyleSheet: true,
          isFullStyle: isFullStyle,
          isFullProp: isFullProp,
          isGlobal: isGlobal
        });
        
        if(titleMap)
        {
          mapText.splice(x, 1);
          len = mapText.length;
          x -= 1;
		  localmap.isProperyValue = true;
          titleMap.mapValues.push(localmap);
          titleMap.values.push(titleMap.mapValues[(titleMap.mapValues.length - 1)]);
        }
        else if(!titleMap && nextIsString && mapText[x + 1].indexOf(':') === 0)
        {
		  localmap.isProperty = true;
          maps.push(localmap);
          mapText[x] = maps[(maps.length - 1)];
          titleMap = maps[(maps.length - 1)];
          /* LOCAL MAPS */
          extensions.localmaps = maps[(maps.length - 1)];
          outputText[x] = item;
        }
        else
        {
          maps.push(localmap);
          mapText[x] = maps[(maps.length - 1)];
          /* LOCAL MAPS */
          extensions.localmaps = maps[(maps.length - 1)];
          outputText[x] = item;
        }
      }
      else if(titleMap)
      {
        if(item.match(__matchValues))
        {
          mapText[x] = mapText[x].replace(item.match(__matchValues)[0], '');
          titleMap.values.push(item.match(__matchValues)[0].replace(/[:;]/g, ''));
        }
        else
        {
          titleMap.values.push(item);
          mapText.splice(x, 1);
          len = mapText.length;
          x -= 1;
        }
        titleMap = ((item.indexOf(';') !== -1) ? undefined : titleMap);
      }
      else
      {
        outputText[x] = item;
      }
    }
    
    node.textContent = outputText.join('');
  }
  
  /* creates dynamic map that changes the element component, also keeps associated attr, style, event and html binds */
  function mapMapNode(node, parent, maps, id)
  {
    var local,
        attrs = __slice.call(node.attributes),
        nodeMaps = [],
        nodeId = uuid(),
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
      title = attrs[x].name;
      if(title === '__kaleonodebind__')
      {
        mapText = splitText(text);
        item = mapText[0];

        /* create nodemap */
        local = new mapObject({
          local_id: id,
          node_id: nodeId,
          mapIndex: maps.length,
          mapTextIndex: 0,
          text: item,
          mapText: mapText,
          maps: maps,
          type: 'node',
          property: 'nodeName',
          listener: 'nodeName',
          isDirty: false,
          localAttr: 'nodeName',
          node: node,
          values: nodeMaps
        })
        maps.push(local);
        mapText[0] = maps[(maps.length - 1)];
      }
      else if(title === '__kaleoattrsbind__')
      {
        mapAttrName(node, text, nodeMaps, id, nodeId, true);
      }
      else if(title === '__kaleostylebind__')
      {
        mapStyleAttr(node, text, nodeMaps, id, nodeId, true);
      }
      else if(text.match(__matchText))
      {
        mapText = splitText(text);
        lenn = mapText.length;
        i = 0;
        for(i;i<lenn;i++)
        {
          item = mapText[i];
          if(item.match(__matchInsert))
          {
            nodeMaps.push(new mapObject({
              local_id: id,
              node_id: nodeId,
              mapIndex: maps.length,
              mapTextIndex: i,
              text: item,
              mapText: mapText,
              maps: nodeMaps,
              type: 'pointer',
              isInsert: true,
              property: title,
              local: attrs[x],
              localAttr: 'value',
              node: node,
              isAttr: true
            }));
          }
          else if(item.match(__matchText))
          {
            nodeMaps.push(new mapObject({
              local_id: id,
              node_id: nodeId,
              mapIndex: maps.length,
              mapTextIndex: i,
              text: item,
              mapText: mapText,
              maps: nodeMaps,
              type: 'pointer',
              property: title,
              listener: title,
              local: attrs[x],
              localAttr: 'value',
              node: node,
              isAttr: true,
              isPointer: true
            }));
          }
        }
      }
    }
  }
  
  /* creates dyanmic map that changes the attr name */
  function mapAttrName(node, text, maps, id, nodeId, isComponent)
  {
    var attrs = text.match(__matchAttr),
        mapText,
        mapValues,
        attr,
        title,
        value,
        item,
        len = attrs.length,
        titleMap,
        localMap,
        x = 0,
        lenn,
        i = 0;
    
    for(x;x<len;x++)
    {
      attr = attrs[x].split(':');
      title = attr[0];
      value = attr[1].replace(__replaceSingleQuotes, '');
      
      if(title.match(__matchInsert))
      {
        titleMap = new mapObject({
          local_id: id,
          node_id: nodeId,
          mapIndex: maps.length,
          mapTextIndex: 0,
          text: title,
          maps: maps,
          mapText: [title],
          type: 'attr',
          isInsert: true,
          node: node,
          isAttr: true,
          isPointer: isComponent,
          isProperty: true
        })
        maps.push(titleMap)
        titleMap.mapText = [maps[(maps.length - 1)]];
      }
      else if(title.match(__matchText))
      {
        titleMap = new mapObject({
          local_id: id,
          node_id: nodeId,
          mapIndex: maps.length,
          mapTextIndex: 0,
          text: title,
          maps: maps,
          mapText: [title],
          type: 'attr',
          node: node,
          isAttr: true,
          listener: 'setAttribute',
          local: node,
          isPointer: isComponent,
          isProperty: true
        })
        maps.push(titleMap);
        titleMap.mapText = [maps[(maps.length - 1)]];
      }
      
      mapText = splitText(value);
      mapValues = (titleMap ? titleMap.mapValues : maps);
      lenn = mapText.length;
      i = 0;
      
      for(i;i<lenn;i++)
      {
        item = mapText[i];
        if(item.match(__matchInsert))
        {
          localMap = new mapObject({
            local_id: id,
            node_id: nodeId,
            mapIndex: mapValues.length,
            mapTextIndex: i,
            text: item,
            mapText: mapText,
            maps: mapValues,
            type: 'attr',
            isInsert: true,
            property: title,
            listener: title,
            node: node,
            isAttr: true,
            isPointer: isComponent,
            isPropertyValue: true
          });
          titleMap.mapValues.push(localMap)
        }
        else if(item.match(__matchText))
        {
          localMap = new mapObject({
            local_id: id,
            node_id: nodeId,
            mapIndex: mapValues.length,
            mapTextIndex: i,
            text: item,
            mapText: mapText,
            maps: mapValues,
            type: 'attr',
            property: title,
            listener: title,
            node: node,
            isAttr: true,
            isPointer: isComponent,
            isPropertyValue: true
          });
          titleMap.mapValues.push(localMap)
        }
        else
        {
          localMap = item;
        }
        mapText[i] = localMap;
      }
      titleMap.values = mapText;
    }
  }
  
  /* map style takes all styles and maps to the property */
  function mapStyleAttr(node, text, maps, id, nodeId, isComponent)
  {
    var styles = text.match(__matchStyles),
        isFullStyle = (styles && styles[0].match(__matchText) && styles.length === 1),
        mapText,
        mapValues,
        style,
        title,
        value,
        item,
        len = styles.length,
        titleMap,
        localMap,
        x = 0,
        lenn,
        i = 0;
    
    if(isFullStyle)
    {
      item = styles[0];
      if(item.match(__matchInsert))
      {
        localMap = new mapObject({
            local_id: id,
            node_id: nodeId,
            mapIndex: maps.length,
            mapTextIndex: 0,
            text: item,
            maps: maps,
            mapText: [item],
            type: 'style',
            isInsert: true,
            property: 'style',
            local: node.style,
            node: node,
            isInlineStyle: true,
            isFullStyle: true,
            isPointer: isComponent
          })
          maps.push(localMap)
          localMap.mapText = [maps[(maps.length - 1)]];
      }
      else if(item.match(__matchText))
      {
        localMap = new mapObject({
            local_id: id,
            node_id: nodeId,
            mapIndex: maps.length,
            mapTextIndex: 0,
            text: item,
            maps: maps,
            mapText: [item],
            type: 'style',
            property: 'style',
            listener: 'style',
            local: node.style,
            node: node,
            isInlineStyle: true,
            isFullStyle: true,
            isPointer: isComponent
          })
          maps.push(localMap)
          localMap.mapText = [maps[(maps.length - 1)]];
      }
    }
    else
    {
      for(x;x<len;x++)
      {
        if(styles[x].indexOf(':') === -1)
        {
          title = styles[x];
          value = '';
        }
        else
        {
          style = styles[x].split(':');
          title = style[0];
          value = style[1];
        }
        /* First we try to match the title */
        if(title.match(__matchInsert))
        {
          titleMap = new mapObject({
            local_id: id,
            node_id: nodeId,
            mapIndex: maps.length,
            mapTextIndex: 0,
            text: title,
            maps: maps,
            mapText: [title],
            type: 'style',
            isInsert: true,
            property: 'style',
            node: node,
            local: node.style,
            isFullProp: !(value),
            isInlineStyle: true,
            isPointer: isComponent,
            isProperty: true
          })
          maps.push(titleMap)
          titleMap.mapText = [maps[(maps.length - 1)]];
        }
        else if(title.match(__matchText))
        {
          titleMap = new mapObject({
            local_id: id,
            node_id: nodeId,
            mapIndex: maps.length,
            mapTextIndex: 0,
            text: title,
            maps: maps,
            mapText: [title],
            type: 'style',
            property: 'style',
            node: node,
            local: node.style,
            isFullProp: !(value),
            isInlineStyle: true,
            isPointer: isComponent,
            isProperty: true
          })
          maps.push(titleMap)
          titleMap.mapText = [maps[(maps.length - 1)]];
        }
        else
        {
          titleMap = undefined;
        }
        /* Then we try to match the value */
        mapText = splitText(value);
        mapValues = (titleMap ? titleMap.mapValues : maps);
        lenn = mapText.length;
        i = 0;

        for(i;i<lenn;i++)
        {
          item = mapText[i];
          if(item.match(__matchInsert))
          {
            localMap = new mapObject({
              local_id: id,
              node_id: nodeId,
              mapIndex: mapValues.length,
              mapTextIndex: i,
              text: item,
              mapText: mapText,
              maps: mapValues,
              node: node,
              type: 'style',
              isInsert: true,
              property: title,
              local: node.style,
              localAttr: title,
              isInlineStyle: true,
              isPointer: isComponent,
              isPropertyValue: true
            })
            if(!titleMap)
            {
              maps.push(localMap);
              localMap.mapText = [maps[(maps.length - 1)]];
            }
            else
            {
              titleMap.mapValues.push(localMap)
            }
          }
          else if(item.match(__matchText))
          {
            localMap = new mapObject({
              local_id: id,
              node_id: nodeId,
              mapIndex: mapValues.length,
              mapTextIndex: i,
              text: item,
              mapText: mapText,
              maps: mapValues,
              node: node,
              type: 'style',
              property: title,
              listener: title,
              local: node.style,
              localAttr: title,
              isInlineStyle: true,
              isPointer: isComponent,
              isPropertyValue: true
            })
            if(!titleMap)
            {
              maps.push(localMap);
              localMap.mapText = [maps[(maps.length - 1)]];
            }
            else
            {
              titleMap.mapValues.push(localMap)
            }
          }
          else
          {
            localMap = item;
          }
          mapText[i] = localMap;
        }
        if(titleMap) titleMap.values = mapText;
      }
    }
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
    
    Object.defineProperty(this.component, '__CzosnekRoot__', setDescriptor(this));
    
	this.component.setAttribute('component-id', this.id);
	
    __registered__.push(this);
  }
  
  Object.defineProperties(Czosnek.prototype,{
    destruct:setDescriptor(destruct, false, true)
  });
  
  Object.defineProperties(Czosnek,{
    register:setDescriptor(register, false, true),
    unregister:setDescriptor(unregister, false, true),
    clearRegistry:setDescriptor(clearRegistry, false, true),
    isRegistered:setDescriptor(isRegistered, false, true),
    getUnknown:setDescriptor(getUnknown, false, true),
    isUnknown:setDescriptor(isUnknown, false, true),
    expand:setDescriptor(expand, false, true),
    map:setDescriptor(map, false, true),
    destruct:setDescriptor(destruct, false, true)
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