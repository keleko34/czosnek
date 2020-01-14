"use strict";

window.czosnek = (function(){

  /* SCOPED LOCALS */
  /* REGION */

  /* Holds the templates for components */
  var __templates = {},

      /* Scoped copy of Array slice */
      __slice = Array.prototype.slice,

      /* byte array for creating uuids */
      __byteToHex = Array.apply(null, Array(256)).map(function(v, i){return (i + 0x100).toString(16).substr(1);}),

      /* Holds all possible dom events */
      __eventList = Object.keys(HTMLElement.prototype).filter(function(v){return (v.indexOf('on') === 0);})
      .concat([
        'onDOMContentLoaded','onDOMAttributeNameChanged',
        'onDOMAttrModified','onDOMCharacterDataModified',
        'onDOMNodeInserted','onDOMNodeRemoved',
        'onDOMSubtreeModified'])
        .map(function(v){ return (v.toLowerCase()); }),

        __registered = [],

        /* Each components associated maps based off of component id */
        __mapped = {},

        /* setup to allow replacing the base uuid method */
        __uuid = uuid,

        /* HOOKS */
        __beforeRegistered = function(){},

        __afterRegistered = function(){},

        __beforeUnregistered = function(){},

        __afterUnregistered = function(){},

        __beforeMapped = function(){},

        __afterMapped = function(){};
  /* ENDREGION */

  /* REGEX RULES */
  /* REGION */


  /* ELEMENTS AND NON CONFORMING HTML */

  /* Helps to create array of all element tag names */
  var __matchTagEndings = /<\/(.*?)>/g,

      /* Matches all elements that contain binds on them */
      __matchBindElements = /(<.*?([^{]>))/g,

      /* Helps match attribute name binds <div {{attr}}|{{attrname}}="value"> for conforming html */
      __matchAttrNameBind = /({{(?:(?!{{).)*?}}=["'].*?["'])|({{(?:(?!{{).)*?}}(?!.*?[="]))/g,
      
      /* Matches all nodes that have a bind inside the style attribute,
         we need to alter these as browsers tend to overwrite non conforming
         styles inside the style attribute */
      __matchStyleAttr = /(style=["'].*?{{.*?}}.*?["'])/g,

      /* Helps conform non standard element tag endings <component /> to <component></component> */
      __replaceEndingTag = /(<(?!input|img)(.*?) (.*?)\/>)/g,

      /* Helps seperate element tagname binds <{{bindname}}> to <kaleoireplacenode kaleoinodebind="{{bindname}}"  */
      __replaceNodeNameStart = /(<({{(.*?)}})(.*?)>)/g,
      __replaceNodeNameFinish = /(<\/({{(.*?)}})>)/g;

  /* STYLES */

  /* Matches full class binding .class { {{bind}} } > single item at a time*/
  var __matchStyleClass = /(({([\s\r\n\t]+)?{{.[^}]*?}}([\s\r\n\t]+)?})([\s\r\n\t]+)?)$/g,
      
      /* Check if the css style rule contains the local keyword bind */
      __matchLocal = /({{>?local}})/g,

      /* Helps to extract localized style rules from the global style rules */
      __matchLocalStyle = /(([^};][\s\w\.]+?)?{{>?local}}(([\r\n\s\S]*?{(([\r\n\s\W\w]+?)|(.*?))(?:[^}])}(?=[\n\.\r\s]|$))|(((.[^;\r\n\t↵]*?)({{.[^}]*?}})(\s+)?)$)))/g,
      
      /* Helps match if a style bind is a full property bind */
      __matchNextProperty = /^((\s+)?;)/g,

      /* Helps grab the remaining text content after a bind to check for a full style bind */
      __matchClosestBrace = /^(([\s\r\n\t]+)?})/g,

      /* Helps match the remaining of the text for property name bind value string text */
      __matchValues = /(^(\s+)?:(\s+)?(.*?);)|(^(\s+)?:([\s\w\W]+)?)|(^([\s\w\W]+)?;)/g;
  /* BINDS */
      
  /* Used for matching all the binds, also splits string up into binds/text */
  var __matchSplitText = /(?!\{\{\{)(?!\}\}\})(\{\{.*?\}\})/g,
      
      /* Helps to fetch the main bind key string */
      __replaceKey = /[\s\{\}\>]|(\|(.*))/g,

      /* helps to match filters inside a bind */
      __matchFilters = /(\{\{(.*?)\|(.*?)\}\})/g,

      /* Extracts the filters from the text */
      __replacefilters = /(.*?)\||[\s\{\}]/g,

      /* Checks if the filter is a viewmodel side type filter */
      __matchVFilters = /(\()(.*?)(\))/g,

      /* Extracts viewmodel side filters */
      __replaceVFilters = /[\(\)]/g,

      /* Checks if the filter is a storage type filter */
      __matchStoreFilter = /(\[)(.*?)(\])/g,

      /* Extracts storage filters */
      __replaceStoreFilter = /[\[\]\~\+\-]/g,

      /* Checks if the bind is a loop bind */
      __matchForText = /((.*?)for)(.*?)(loop(.*))/g,

      /* Extracts key name from the loop bind string */
      __replaceForKey = /((.*?)for\s)|(\sloop(.*))/g,

      /* Extracts the component name from the loop bind string */
      __replaceForComponent = /(.*?loop\s)|(\|(.*))|[\s]/g,

      /* Checks if bind is an insert only bind */
      __matchInsert = /(\{\{(\s*)\>(.*?)(\}\}))/g,

      /* replaces single quotes from conformed attr name bind values */
      __replaceSingleQuotes = /(^['])|([']$)/g;

  /* ENDREGION */

  /* OBJECT CLASSES */
  /* REGION */

  function Extension(root, parent, maps)
  {
    this.root = root;
    this.parent = parent;
    this.maps = maps;
  }

  function Bindmap(type, str, local, node, listener, property, mapText)
  {
    var isLoop = (str.match(__matchForText) !== null),
        isEvent = (__eventList.indexOf(listener) !== -1);

    if(isLoop && mapText.length > 1) return console.error("No spaces or extra content can accompany loop binds " + str)
    if(isEvent && mapText.length > 1) return console.error("No spaces or extra content can accompany event binds " + str)

    this.text = str;

    /* KEY */

    /* the name of the property that will be used for binding */
    this.key = (isLoop ? getLoopKey(str) : getKey(str));

    /* key split by property indexes in case it is a deep property key eg. prop.innerprop.mostinnerprop */
    this.keySplit = this.key.split('.');

    /* The length of the key in case it is a deep property */
    this.keyLength = this.keySplit.length;

    /* The last key in the chain in case it is a deep property */
    this.localKey = this.keySplit.pop();

    /* LOOP */

    this.isLoop = isLoop;

    /* The uuid for the loop */
    this.loopId = (isLoop ? uuid() : undefined);

    /* The component that will be loop created for each entry of the bound array */
    this.loopComponent = (isLoop ? getLoopComponent(str) : undefined);

    /* BIND */

    /* value altering methods attached to the bind */
    this.filters = parseFilterTypes(getfilters(str));

    /* The key that should be used to listen for changes on the dom */
    this.listener = listener;

    /* The direct node property that should be updated when something changes */
    this.property = (isEvent ? listener : property);

    /* The local dom object eg (Text, Element, Attr) */
    this.local = (isEvent ? node : local);

    /* The dom element associated with local property */
    this.node = node;

    /* MAPS */

    this.mapText = (mapText.length ? mapText : [this]);

    this.maps = this.mapText.filter(isMap);

    this.mapIndex = this.maps.length;

    this.mapTextIndex = this.mapText.indexOf(str);

    /* If this is a property title then this will hold all the maps associated with its value text */
    this.submaps = [];
    
    /* BOOLEANS */

    this.isEvent = isEvent;

    this.isInput = (node.tagName === 'INPUT');

    this.isRadio = (this.isInput && ['radio', 'checkbox'].indexOf(node.type) !== -1);

    this.isInsert = (str.match(__matchInsert) !== null);

    this.isDirty = (this.mapText.length !== 1 || this.key === 'innerHTML');

    /* MAP TYPE */

    this.type = (isLoop ? 'LOOP' : (isEvent ? 'EVENT' : (this.isInput ? 'INPUT' : type)));
  }

  /* ENDREGION */

  /* DESCRIPTORS */
  /* REGION */

  function setDescriptor(value, writable, redefinable, enumerable)
  {
    return {
      value: value,
      writable: !!writable,
      enumerable: !!enumerable,
      configurable: !!redefinable
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
   return str.split(__matchSplitText).filter(Boolean);
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
    var parsedFilters = { filters: [], vmFilters: [], model: [], local: [], session: [] }

    if(typeof filters === 'string') filters = getfilters(filters);

    if(!filters.length) return parsedFilters;

    var x = 0,
        len = filters.length,
        filter;
    
    for(x;x<len;x++)
    {
      filter = filters[x];
      
      if(filter.match(__matchVFilters))
      {
        parsedFilters.vmFilters.push(filter.replace(__replaceVFilters, ''));
      }
      else if(filter.match(__matchStoreFilter))
      {
        if(filter.indexOf('~') !== -1) parsedFilters.model.push(filter.replace(__replaceStoreFilter, ''));
        if(filter.indexOf('+') !== -1) parsedFilters.local.push(filter.replace(__replaceStoreFilter, ''));
        if(filter.indexOf('-') !== -1) parsedFilters.session.push(filter.replace(__replaceStoreFilter, ''));
      }
      else
      {
        parsedFilters.filters.push(filter);
      }
    }
    
    return parsedFilters;
  }

  /* ENDREGION */

  /* HELPER METHODS */
  /* REGION */

  function replaceNonConformingHTML(template)
  {
    /* get nodes by start and finish */
    var html = template
    
        /* replace single line elements <div /> to have their correct ending tag </div>. ignores inputs and img tags */
        .replace(__replaceEndingTag, "<$2 $3></$2>")
        .replace(/( \>)/g, '>')
        
        /* Replaces html nodeName binds eg. <{{bind}}></{{bind}}> to <knode knodebind="{{bind}}"></knode> */
        .replace(__replaceNodeNameStart, '<knode data-knode="$2" $4>')
        .replace(__replaceNodeNameFinish, '</knode>'),

        nodes = html.match(__matchBindElements),
        len = nodes.length,
        x = 0,
        matches,
        match,
        node,
        lenn,
        i;

    for(x;x<len;x++)
    {
      node = nodes[x];

      /* Replaces attribute name binds eg {{attr}}="value" to data-kattr="{{attr}}:'value';"*/
      matches = node.match(__matchAttrNameBind);
      if(matches)
      {
        lenn = matches.length;
        i = 0;
        for(i;i<lenn;i++)
        {
          match = matches[i];
          matches[i] = match.replace('=',':').replace(/["]/g, "'") + ';';
          nodes[x] = node.replace(match, '');
        }
        nodes[x] = node.replace('>', 'data-kattr="' + matches.join('') + '">')
      }

      /* Replaces style attributes that contain bindings due to how browsers process the style attribute,
       * eg. style="{{bind}};" to data-kstyle="{{bind}};" */
      if(node.match(__matchStyleAttr))
      {
        nodes[x] = node.replace('style=', 'data-kstyle=');
      }
      html = html.replace(node, nodes[x]);
    }
    return html;
  }

  function createStyleNode(styles, component, kid)
  {
    var style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('component', component);
    style.setAttribute((kid ? 'k-' + kid : 'global'), '');
    style.textContent = styles;
    return style;
  }

  function createComponentNode(html, component, kid)
  {
    var div = document.createElement('div'),
        frag = document.createDocumentFragment(),
        base;

    div.innerHTML = html;
    base = div.children[0];

    /* Add id to components when mapping */

    base.setAttribute('root', '');
    base.setAttribute('k-' + kid, '');
    base.setAttribute('component', component);
    frag.appendChild(base);
    return frag;
  }

  function createAndMapStyles(styles, kid)
  {
    var global = styles.global,
        local = styles.local;

    if(!global.__Czosnek__) Object.defineProperty(global, '__Czosnek__', setDescriptor(new Extension(global, document.head, mapStyleSheet(global))));
    Object.defineProperty(local, '__Czosnek__', setDescriptor(new Extension(local, document.head, mapStyleSheet(local, kid))));

    return []
      .concat(global.__Czosnek__.maps)
      .concat(local.__Czosnek__.maps);
  }

  /* Array: Parses html string and returns a list of unknown element tagnames */
  function getUnknownTagsFromHTML(html)
  {
    var matched = html.match(__matchTagEndings),
        unknown = [],
        len = matched.length,
        x = 0,
        key;
    for(x;x<len;x++)
    {
      key = matched[x].replace(__matchTagEndings, '$1');
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

  /* Array: returns a list of all the unknown element tagnames from a node */
  function getUnknownTagsFromNode(node)
  {
    if(typeof node === 'string') return getUnknownTagsFromHTML(node);
    var inner = getUnknownTagsFromHTML(node.innerHTML);
    return (isUnknownNode(node) ? [node.nodeName.toLowerCase()].concat(inner) : inner)
  }

  /* Boolean: Returns if the node passed is a native dom element */
  function isUnknownNode(node)
  {
    return ((node.nodeName.indexOf('-') !== -1) || node instanceof HTMLUnknownElement);
  }

  function isUnknownHTMLNode(node)
  {
    return ((node.indexOf('-') !== -1) || document.createElement(node) instanceof HTMLUnknownElement);
  }

  /* ENDREGION */

  /* MAPPING METHODS */
  /* REGION */

  function mapText(textNode, parent)
  {
    var maps = [],
        mapText = splitText(textNode.textContent),
        item,
        len = mapText.length,
        x = 0;
    
    for(x;x<len;x++)
    {
      item = mapText[x];
      if(item.match(__matchSplitText))
      {
        mapText[x] =  new Bindmap('TEXT', mapText[x], textNode, parent, 'html', 'textContent', mapText);
        maps[maps.length] = mapText[x];
      }
    }

    return maps;
  }

  function mapElement(node)
  {
    var maps = [],
        knode = node.attributes['data-knode'],
        kattr = node.attributes['data-kattr'],
        kstyle = node.attributes['data-kstyle'];
    if(knode)
    {
      maps = [new Bindmap('NODE', knode.value, node, node, 'nodeName', 'nodeName', [])];
      node.removeAttribute('data-knode');
    }
    if(kattr) mapAttrNames(kattr.value, node, maps);
    if(kstyle) mapAttrStyles(kstyle.value, node, maps);

    mapAttr(node.attributes, node, maps);

    return maps;
  }

  function mapAttr(attrs, parent, maps)
  {
    var isUnknown = isUnknownNode(parent),
        mapText = [],
        attr,
        len = attrs.length,
        x = 0,
        lenn,
        i = 0;
    
    for(x;x<len;x++)
    {
      attr = attrs[x];
      if(attr.value.match(__matchSplitText))
      {
        mapText = splitText(attr.value);
        lenn = mapText.length;
        i = 0;
        for(i;i<lenn;i++)
        {
          if(mapText[i].match(__matchSplitText))
          {
            mapText[i] = new Bindmap((isUnknown ? 'POINTER' : 'ATTRIBUTE'), mapText[i], attr, parent, attr.name, 'value', mapText);
            maps[maps.length] = mapText[i];
            if(mapText[i].isEvent)
            {
              parent.removeAttribute(attr.name);
              attrs = parent.attributes;
              len = attrs.length;
            }
          }
        }
      }
    }

    return maps;
  }

  function mapAttrNames(text, parent, maps)
  {
    var attrs = text.split(';').filter(Boolean),
        mapText = [],
        submaps = [],
        item,
        sub,
        len = attrs.length,
        x = 0,
        lenn,
        i = 0;
    
    for(x;x<len;x++)
    {
      item = attrs[x].split(':');
      mapText = [];
      submaps = [];
      if(item.length === 1)
      {
        mapText = new Bindmap('ATTRIBUTE_FULL', item[0], parent, parent, undefined, undefined, mapText);
      }
      else
      {
        item[1] = item[1].replace(__replaceSingleQuotes, '');
        mapText = new Bindmap('ATTRIBUTE_NAME', item[0], parent, parent, undefined, undefined, mapText);
        mapText.submaps = splitText(item[1]);
        submaps = mapText.submaps;
        lenn = submaps.length;
        i = 0;
        for(i;i<lenn;i++)
        {
          sub =  submaps[i];
          if(sub.match(__matchSplitText))
          {
            submaps[i] = new Bindmap('ATTRIBUTE_VALUE', sub, mapText, parent, undefined, undefined, submaps);
          }
        }
      }

      maps[maps.length] = mapText;
    }
    parent.removeAttribute('data-kattr');
    return maps;
  }

  function mapAttrStyles(style, parent, maps)
  {
    var styles = style.split(';').filter(Boolean),
        mapText = [],
        submaps = [],
        item,
        sub,
        len = styles.length,
        x = 0,
        lenn,
        i = 0;

    if(len === 1 && styles[0].indexOf(':') === -1)
    {
      mapText = new Bindmap('STYLE_INLINE_FULL', styles[0], parent.style, parent, undefined, undefined, mapText);
      maps[maps.length] = mapText;
    }
    else
    {
      for(x;x<len;x++)
      {
        item = styles[x].split(':');
        mapText = [];
        submaps = [];
        if(item.length === 1)
        {
          mapText = new Bindmap('STYLE_INLINE_PROPERTY', item[0], parent.style, parent, undefined, undefined, mapText);
          maps[maps.length] = mapText;
        }
        else
        {
          if(item[0].match(__matchSplitText))
          {
            mapText = new Bindmap('STYLE_INLINE_NAME', item[0], parent.style, parent, undefined, undefined, mapText);
            mapText.submaps = splitText(item[1]);
            submaps = mapText.submaps;
            lenn = submaps.length;
            i = 0;
            for(i;i<lenn;i++)
            {
              sub =  submaps[i];
              if(sub.match(__matchSplitText))
              {
                submaps[i] = new Bindmap('STYLE_INLINE_VALUE', sub, parent.style, parent, undefined, undefined, submaps);
              }
            }
            maps[maps.length] = mapText;
          }
          else
          {
            mapText = splitText(item[1]);
            lenn = mapText.length;
            i = 0;
            for(i;i<lenn;i++)
            {
              sub =  mapText[i];
              if(sub.match(__matchSplitText))
              {
                mapText[i] = new Bindmap('STYLE_INLINE_VALUE', sub, parent.style, parent, item[0], item[0], mapText);
                maps[maps.length] = mapText[i];
              }
            }
          }
        }
      }
    }
    parent.removeAttribute('data-kstyle');
    return maps;
  }

  function mapStyleSheet(node, kid)
  {
    if(!node.textContent.match(__matchSplitText)) return [];

    var maps = [],
        lcs = (kid ? '[k-' + kid + ']' : '[global]'),
        mapText = splitText(node.textContent),
        prev,
        next,
        prevMatch,
        submaps,

        /* Default standard bind is 0 */
        /* Full property bind {{name:value}}; is 2 */
        /* Full style bind .class { {{bind}} } is 3 */
        type,
        item,
        len = mapText.length,
        x = 0;

    if(kid) node.textContent = node.textContent.replace(__matchLocal, lcs);

    for(x;x<len;x++)
    {
      item = mapText[x];
      type = 0;
      if(kid && item.match(__matchLocal))
      {
        mapText[x] = lcs;
      }
      else if(item.match(__matchSplitText))
      {
        prev = mapText[x - 1];
        next = mapText[x + 1];
        if(typeof prev === 'string' && typeof next === 'string' && !prev.match(__matchSplitText))
        {
          prevMatch = (prev + mapText[x] + (next.match(__matchClosestBrace) || '')).match(__matchStyleClass);
          type = (next.match(__matchNextProperty) ? 1 : ((prevMatch && prevMatch[0].indexOf(';') === -1) ? 2 : 0));
        }

        switch(type)
        {
          case 0:
            /* This is a title property name bind */
            if(!submaps && next && next.indexOf(':') === 0)
            {
              mapText[x] = new Bindmap('STYLE_NAME', mapText[x], node, node, 'html', 'textContent', mapText);
              submaps = mapText[x].submaps;
            }

            /* This is a value bind of a title property name bind */
            else if(submaps)
            {
              mapText[x] = '';
              submaps[submaps.length] = new Bindmap('STYLE_VALUE', mapText[x], node, node, 'html', 'textContent', submaps);
            }

            /* this is a standard bind */
            else
            {
              mapText[x] = new Bindmap('STYLE', mapText[x], node, node, 'html', 'textContent', mapText);
            }
            break;
          case 1:
              mapText[x] = new Bindmap('STYLE_PROPERTY', mapText[x], node, node, 'html', 'textContent', mapText);
            break;
          case 2:
              mapText[x] = new Bindmap('STYLE_FULL', mapText[x], node, node, 'html', 'textContent', mapText);
            break;
        }

        if(typeof mapText[x] !== 'string') maps[maps.length] = mapText[x];
      }
      else if(submaps)
      {
        var remainder = item.match(__matchValues);
        
        if(remainder)
        {
          /* remove the string from the mapText */
          mapText[x] = mapText[x].replace(remainder[0], '');
          submaps[submaps.length] = remainder[0].replace(/[:;]/g, '');
        }
        else
        {
          mapText[x] = '';
          submaps[submaps.length] = item;
        }

        if(item.indexOf(';') !== -1) submaps = null;
      }
    }

    return maps;
  }

  /* ENDREGION */

  /* PUBLIC METHODS */
  /* REGION */

  function hook(title, func)
  {
    if(func.constructor !== Function) return this;

    switch(title)
    {
      case 'beforeRegister': __beforeRegistered = func;
      case 'afterRegister': __afterRegistered = func;
      case 'beforeUnregister': __beforeUnregistered = func;
      case 'afterUnregister': __afterUnregistered = func;
      case 'beforeMap': __beforeMapped = func;
      case 'afterMap': __afterMapped = func;
      case 'uuid': __uuid = func;
    }
  }

  function map(title, node, kid, parent)
  {
    var maps = [];

    /* skip comment nodes */
    if(node.nodeType === 8) return maps;

    switch(node.nodeType)
    {
      /* Text Node */
      case 3:
        if(node.textContent === '') return maps;
        Object.defineProperty(node, '__Czosnek__', setDescriptor(new Extension(node, parent, mapText(node, kid))));
        return node.__Czosnek__.maps;
      /* Document Fragment */
      case 11:
        if(node.childNodes.length !== 1) return console.error('Components may only have one root element', title)
        break;
      /* Standard Element */
      default:
        node.setAttribute('k-' + kid, '');
        node.setAttribute('component', title);
        maps = mapElement(node, kid);
        Object.defineProperty(node, '__Czosnek__', setDescriptor(new Extension(node, parent, maps)));
    }

    if(node.childNodes.length)
    {
      var push = maps.push,
          len = node.childNodes.length,
          x = 0;

      for(x;x<len;x++)
      {
        push.apply(maps, map(title, node.childNodes[x], kid, (node.nodeType !== 11 ? node : undefined), maps));
        len = node.childNodes.length;
      }
    }
    
    return maps;
  }

  function isUnknown(item) {
    if(typeof item === 'string') return isUnknownHTMLNode(item);
    return isUnknownNode(item);
  }

  function getUnknown(item) {
    if(typeof item === 'string') return getUnknownTagsFromHTML(item);
    return getUnknownTagsFromNode(item);
  }

  function expand(title, id)
  {
    var expanded = Object.create(__templates[title]),
        globalStyle = document.head.querySelector('style[component="' + title + '"][global]'),
        id = (id || _uuid());

        expanded.global = (globalStyle || createStyleNode(expanded.global, title));
        expanded.local = createStyleNode(expanded.local, title, id);
        expanded.html = createComponentNode(expanded.html, title, id);
        
    return expanded;
  }

  function destruct(component)
  {
    component = (component || this);
    var local = document.head.querySelector('[k-' + component.id + ']'),
        html = document.body.querySelector('[k-' + component.id + ']'),
        components,
        global;

    __registered.splice(__registered.indexOf(component), 1);

    component.expanded = null;
    component.maps = null;
    if(local) local.parentElement.removeChild(local);
    if(html) html.parentElement.removeChild(html);

    components = document.body.querySelectorAll('[component="' + component.title + '"');

    if(components.length === 0)
    {
      global = document.head.querySelector('[component="' + component.title + '"');
      if(global) global.parentElement.removeChild(global);
    }
  }

  function register(title, template, style)
  {
    __beforeRegistered(title, { html: template, style: { local: '', global: style } });
    if(__templates[title] === undefined)
    {
      __templates[title] = {
        html: replaceNonConformingHTML(template),
        local: (style && style.match(__matchLocalStyle).join('\r\n') || ''),
        global: (style && style.replace(__matchLocalStyle, '') || '')
      }

      __templates[title].unknowns = getUnknownTagsFromHTML(__templates[title].html);

      __afterRegistered(title, __templates[title]);
    }
    else
    {
      console.error("ERR: A template by the name %o already exists",name, new Error().stack);
    }
    return this;
  }

  function unregister(title)
  {
    __beforeUnregistered(title, document.querySelectorAll('[component="' + title + '"]'), __mapped[title]);
    __templates[title] = undefined;
    __mapped[title] = undefined;
    __afterUnregistered(title, document.querySelectorAll('[component="' + title + '"]'));

    return this;
  }

  function clearRegistry()
  {
    var keys = Object.keys(__templates),
        len = keys.length,
        x = 0;
    
    for(x;x<len;x++){ unregister(keys[x]); }

    return this;
  }

  function isRegistered(title)
  {
    return (__templates[title] !== undefined);
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

  function isMap(v)
  {
    return (v && v.constructor === Bindmap);
  }

  function Czosnek(title)
  {

    if(!isRegistered(title)) return console.error('No component registered by the name', title);
    this.title = title;
    this.id = __uuid();
    this.expanded = expand(title, this.id);
    this.unknowns = __templates[title].unknowns;
    __beforeMapped(this.expanded);
    this.maps = createAndMapStyles(this.expanded, this.id)
      .concat(map(title, this.expanded.html, this.id));
    __afterMapped(this.maps);

    __registered.push(this);
  }

  Czosnek.prototype.destruct = destruct;

  Object.defineProperties(Czosnek, {
    hook: setDescriptor(hook, false, true),
    map: setDescriptor(map, false, true),
    register: setDescriptor(register, false, true),
    unregister: setDescriptor(unregister, false, true),
    isRegistered: setDescriptor(isRegistered, false, true),
    clearRegistry: setDescriptor(clearRegistry, false, true),
    getUnknown: setDescriptor(getUnknown, false, true),
    isUnknown: setDescriptor(isUnknown, false, true),
    expand: setDescriptor(expand, false, true),
    destruct: setDescriptor(destruct, false, true)
  })

  /* ENDREGION */

  /* AMD AND COMMONJS COMPATABILITY */
  /* REGION */
  
  if (typeof define === "function" && define.amd){
    define('czosnek',function(){ return Czosnek; });
  }
  if(typeof module === 'object' && typeof module.exports === 'object'){
    module.exports.czosnek = Czosnek;
  }
  
  /* ENDREGION */

  return Czosnek;
}());
