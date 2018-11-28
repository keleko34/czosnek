/* TODO: maybe get rid of the obects of different maps and replace it with an array of arrays as we have type in the map object now */

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
  
  function attachExtensions(root)
  {
    this.root = root;
    this.pointers = [];
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
  
  function isRegistered(title)
  {
    return (__templates[title] !== undefined);
  }
  
  /* creates the bind objects mapped against the text */
  function map(node, maps, extensions, localComponent)
  {
    /* FIRST INITIAL CALL */
    if(!extensions) 
    {
      Object.defineProperty(node, '__czosnekExtensions__', setDescriptor(new attachExtensions(node), '__czosnekExtensions__', false, false));
      extensions = node.__czosnekExtensions__;
      maps =  {
        standards: [],
        inserts: [],
        loops: [],
        nodes: [],
        pointers: {
          standards: [],
          loops: [],
          nodes: []
        }
      }
    }
    
    var childNodes = node.childNodes,
        x = 0,
        len = childNodes.length,
        localNode,
        child;
    
    /* LOOP CHILDREN NODES INCLUDING TEXT AND COMMENT NODES */
    for(x;x<len;x++)
    {
      child = childNodes[x];
      
      /* LOCAL REAL NODE (NOT TEXT OR COMMENT NODES) */
      localNode = ([3,8].indexOf(child.nodeType) !== -1 ? child.parentElement : child);
      
      /* ONLY MAP IF THIS IS A LOCAL COMPONENT */
      if(!child.__czosnekExtensions__)
      {
        Object.defineProperty(child, '__czosnekExtensions__', setDescriptor(new attachExtensions(extensions.root), '__czosnekExtensions__', false, false));
        getMap(child, localNode, maps, (isUnknown(child) ? child : localComponent));
        len = childNodes.length;
        if(child.childNodes && child.childNodes.length) map(child, maps, extensions, (isUnknown(child) ? child : localComponent));
      }
    }
    
    return maps;
  }
  
  /* ENDREGION */
  
  /* BIND HELPERS */
  /* REGION */
  
  function getMap(child, localNode, maps, localComponent)
  {
    var mapText = [],
        toMap = maps,
        sibling,
        text,
        item,
        mp,
        x = 0,
        len;
    
    switch(child.nodeType)
    {
      /* TEXT NODE, POSSIBLE MAPS: FOR, STANDARD, INSERT, POINTER */
      case 3:
        text = child.textContent;
        mapText = splitText(text);
        len = mapText.length;
        for(x;x<len;x++)
        {
          item = mapText[x];
          
          /* INSERT TYPE */
          if(item.match(__matchInsert))
          {
            maps.inserts.push(new mapObject(item, mapText, 'insert', 'innerHTML', undefined, child, 'textContent', localNode, maps, localComponent));
            mapText[x] = maps.inserts[(maps.inserts.length - 1)];
          }
          else if(item.match(__matchForText))
          {
            mp = new mapObject(item, mapText, (localComponent ? 'pointers.loop' : 'loop'), 'innerHTML', 'html', child, 'textContent', localNode, maps, localComponent, undefined, true);
            
            /* POINTER FOR TYPE */
            if(localComponent)
            {
              toMap = maps.pointers;
              localComponent.__czosnekExtensions__.pointers.push(mp);
            }
            
            if(mapText.length === 1) 
            {
              toMap.loops.push(mp);
              mapText[x] = mp;
            }
            else
            {
              console.error('ERR: loop binds can not include adjacent content,', text, 'in', localNode);
            }
          }
          else if(item.match(__matchText))
          {
            mp = new mapObject(item, mapText, (localComponent ? 'pointers.standard' : 'standard'), 'innerHTML', 'html', child, 'textContent', localNode, maps, localComponent);
            
            /* POINTER STANDARD TYPE */
            if(localComponent)
            {
              toMap = maps.pointers;
              localComponent.__czosnekExtensions__.pointers.push(mp);
            }
            
            toMap.standards.push(mp);
            mapText[x] = mp;
          }
        }
        break;
        
      /* COMMENT NODE, POSSIBLE MAPS: NODE, ATTRIBUTE NAME(future) */
      case 8:
        text = child.textContent;
        mapText = [text.replace(__replaceNodeBind, '$2')];
        item = mapText[0];
        if(item.match(__matchText))
        {
          var key = getKey(item),
              reg = new RegExp('(\<\/\{\{\s?'+key+'(.*?)\>)','g'),
              nodeChildren = [],
              next;
              
          mp = new mapObject(item, mapText, (localComponent ? 'pointers.node' : 'node'), 'innerHTML', 'html', child, 'node', localNode, maps, localComponent);
          
          if(localComponent)
          {
            toMap = maps.pointers;
            localComponent.__czosnekExtensions__.pointers.push(mp);
          }
          toMap.nodes.push(mp);
          mapText[0] = mp;
          sibling = child.nextSibling;
          
          while(!sibling.textContent.match(reg))
          {
            next = sibling.nextSibling;
            nodeChildren.push(sibling);
            localNode.removeChild(sibling);
            
            var div = document.createElement('div');
            div.appendChild(sibling);
            map(div, maps, child.__czosnekExtensions__, item);
            sibling = next;
          }
          localNode.removeChild(child);
          localNode.removeChild(sibling);
          toMap.nodes[(toMap.nodes.length - 1)].nodeChildren = nodeChildren;
        }
        break;
        
      /* NORMAL DOM NODE, POSSIBLE MAPS: STANDARD, INSERT, POINTER */
      default:
        
        /* LOOP ATTRIBUTES */
        var attrs = __slice.call(child.attributes),
            i = 0,
            lenn = attrs.length,
            title;
        
        for(i;i<lenn;i++)
        {
          text = attrs[i].value;
          title = attrs[i].name;
          mapText = splitText(text);
          len = mapText.length;
          for(x;x<len;x++)
          {
            item = mapText[x];
            
            /* INSERT TYPE */
            if(item.match(__matchInsert))
            {
              maps.inserts.push(new mapObject(item, mapText, 'insert', title, undefined, attrs[i], 'value', localNode, maps, localComponent, true));
              mapText[x] = maps.inserts[(maps.inserts.length - 1)];
            }
            else if(item.match(__matchText))
            {
              mp = new mapObject(item, mapText, (localComponent ? 'pointer.standard' : 'standard'), title, title, attrs[i], 'value', localNode, maps, localComponent, true)
              /* POINTER TYPE */
              if(localComponent)
              {
                toMap = maps.pointers;
                localComponent.__czosnekExtensions__.pointers.push(mp);
              }
              
              toMap.standards.push(mp);
              mapText[x] = mp;
            }
          }
        }
        break;
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
    
    this.innerHTML = this.node.innerHTML;

    /* EXPAND NODE */
    var wrapper = document.createElement('div');
    wrapper.innerHTML = this.template;
    
    if(wrapper.children.length !== 1) return console.error('ERR: Component must be wrapped in a single element,', wrapper.children.length, 'nodes in', this.name, new Error().stack);
    
    this.expanded = wrapper.children[0];
    
    this.maps = map(this.expanded);
  }
  
  Object.defineProperties(Czosnek,{
    register:setDescriptor(register, false, true),
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