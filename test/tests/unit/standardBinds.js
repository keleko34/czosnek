function standardBinds(describe, it, expect)
{
  var templateStandard = '<div><div class="{{testobj.testarr.0 | [+val], [-val], [~val]}}">{{test | toUpperCase}}</div></div>',
      templateStandardStyle = '.yay { background: gray } .yay {{local}} { color: yellow } {{>local}} { width: 100px }',
      templateInsert = '<div><div class="{{>testobj.testarr.0 | [+val], [-val], [~val]}}">{{>test | toUpperCase}}</div></div>',
      templateInsertStyle = '.something {{local}} { yay: 500px }',
      templateFor = '<div><div>{{for items loop listitem | sort}}</div></div>',
      templateForStyle = '{{local}} { background: blue }',
      templatePointer = '<div><test class="{{testobj.testarr.0 | [+val]}} test-class"><div>{{test | toUpperCase}} something</div></test></div>',
      templatePointerStyle = '{{local}} { yay: 500px }',
      templateNode = '<div><{{test | helper}} class="{{cool}}"><div>{{help}}</div></{{test | helper}}></div>',
      templateNodeStyle = '{{local}} { yay: 500px }',
      templateEvent = '<div onclick="{{click}}"></div>',
      templateEventStyle = '{{local}} { color:blue; }',
      templateStyle = '<div></div>',
      templateStyleStyle = '{{local}} { {{setColor}}:blue; }',
      templateStyleAttr = '<div style="color:{{color}};{{extra}}:blue;"></div>',
      templateStyleAttrStyle = '{{local}} { color:blue; }',
      templateSingleStyle = '<div style="{{styles}}"></div>',
      templateSingleStyleStyle = '{{local}} { color:blue; }',
      templateAttr = '<div {{attr1}}="something" attr="{{test}} data" {{attr2}}="test" ></div>',
      templateAttrStyle = '{{local}} { color:blue; }';
  
  var methods = [
    checkMaps,
    checkFilters,
    checkMapObject,
    checkStyles
  ];
  
  function runCategory(component, template, templateStyle, length, filters, objects)
  {
    describe(component, function(){
      for(var x =0,len=methods.length;x<len;x++)
      {
        /* SETUP */
        czosnek.unregister(component);
        if(!czosnek.isRegistered(component)) czosnek.register(component, template, templateStyle);
        methods[x](component, length, filters, objects);
      }
    });
  }
  
  function checkMaps(component, len)
  {
    it("Should create the proper amount of maps", function(done){
      var test = new czosnek(component),
          maps = test.maps;
      
      expect(maps.length).to.equal(len);
      
      while(maps[0])
      {
         czosnek.destruct(maps[0]);
      }
      done();
    });
  }
  
  function checkFilters(component, len, filters)
  {
    it("Should contain the proper filters for the maps", function(done){
      var test = new czosnek(component),
          maps = test.maps;
      
      for(var x=0,len=maps.length;x<len;x++)
      {
        var f = Object.keys(maps[x].filters).filter(function(v){return maps[x].filters[v].length;});
        expect(JSON.stringify(f)).to.equal(JSON.stringify(Object.keys(filters[x])));
        for(var i=0,lenn=f.length;i<lenn;i++)
        {
          expect(maps[x].filters[f[i]].length).to.equal(filters[x][f[i]].length);
        }
      }
      
      while(maps[0])
      {
         czosnek.destruct(maps[0]);
      }
      done();
    });
  }
  
  function checkMapObject(component, len, filters, objects)
  {
    it("Should contain the proper items in the map objects", function(done){
      var test = new czosnek(component),
          maps = test.maps,
          len = objects.length,
          x = 0;
      
      for(x;x<len;x++)
      {
        var filter = maps[x],
            keys = Object.keys(objects[x]),
            key;
        
        for(var i=0,lenn=keys.length;i<lenn;i++)
        {
          key = objects[x][keys[i]];
          if(typeof key === 'object')
          {
            key.forEach(function(v,z){
              expect(filter[keys[i]][z]).to.equal(v);
            })
          }
          else
          {
            expect(filter[keys[i]]).to.equal(key);
          }
        }
      }
      
      while(maps[0])
      {
         czosnek.destruct(maps[0]);
      }
      done();
    });
  }
  
  function checkStyles(component)
  {
    it("Should swap the local css styles with the proper component id", function(done){
      var test = new czosnek(component),
          id = test.id,
          maps = test.maps;
      
      var styleNode = document.head.querySelector('[component-id="'+id+'"]');
      expect(styleNode.textContent.indexOf('[component-id="'+id+'"]')).to.not.equal(-1);
      
      while(maps[0])
      {
         czosnek.destruct(maps[0]);
      }
      done();
    });
  }
  
  describe("Mapping:",function(){
    runCategory('standard', templateStandard, templateStandardStyle, 2,
    [
      {
        model: [1],
        local: [1],
        session: [1]
      },
      {
        filters: [1]
      }
    ],
    [
      {
        isDirty: false,
        listener: 'class',
        property: 'class',
        localAttr: 'value',
        keyLength: 3,
        localKey: '0',
        isEvent: false,
        isInput: false,
        isRadio: false
      },
      {
        isDirty: false,
        listener: 'html',
        property: 'innerHTML',
        localAttr: 'textContent',
        keyLength: 1,
        localKey: 'test',
        isEvent: false,
        isInput: false,
        isRadio: false
      }
    ]);
    runCategory('insert', templateInsert, templateInsertStyle, 2,
    [
      {
        model: [1],
        local: [1],
        session: [1]
      },
      {
        filters: [1]
      }
    ],
    [
      {
        isDirty: false,
        property: 'class',
        localAttr: 'value',
        keyLength: 3,
        localKey: '0',
        isEvent: false,
        isInput: false,
        isRadio: false
      },
      {
        isDirty: false,
        property: 'innerHTML',
        localAttr: 'textContent',
        keyLength: 1,
        localKey: 'test',
        isEvent: false,
        isInput: false,
        isRadio: false
      }
    ]);
    runCategory('for', templateFor, templateForStyle, 1,
    [
      { filters: [1] }
    ],
    [
      {
        isDirty: false,
        listener: 'html',
        property: 'innerHTML',
        localAttr: 'textContent',
        keyLength: 1,
        key: 'items',
        forComponent: 'listitem',
        isEvent: false,
        isInput: false,
        isRadio: false
      }
    ]);
    runCategory('pointer', templatePointer, templatePointerStyle, 2,
    [
      { local: [1] },
      { filters: [1] }
    ],
    [
      {
        isDirty: true,
        listener: 'class',
        property: 'class',
        localAttr: 'value',
        keyLength: 3,
        localKey: '0',
        isEvent: false,
        isInput: false,
        isRadio: false
      },
      {
        isDirty: true,
        listener: 'html',
        property: 'innerHTML',
        localAttr: 'textContent',
        keyLength: 1,
        localKey: 'test',
        isEvent: false,
        isInput: false,
        isRadio: false
      }
    ]);
    runCategory('node', templateNode, templateNodeStyle, 2,
    [
      { filters: [1] },
      { }
    ],
    [
      {
        isDirty: false,
        type: 'node',
        keyLength: 1,
        key: 'test',
        isEvent: false,
        isInput: false,
        isRadio: false
      }
    ]);
    runCategory('event', templateEvent, templateEventStyle, 1,
    [
      { },
      { }
    ],
    [
      {
        isDirty: false,
        listener: 'onclick',
        property: 'onclick',
        localAttr: 'onclick',
        type: 'event',
        key: 'click',
        isEvent: true
      }
    ]);
    runCategory('style', templateStyle, templateStyleStyle, 1,
    [{}],
    [
      {
        isDirty: true,
        listener: 'html',
        localAttr: 'textContent',
        key: 'setColor',
        values: [ 'blue' ]
      }
    ]);
    runCategory('styleAttr', templateStyleAttr, templateStyleAttrStyle, 2,
    [
      {}, {}
    ],
    [
      {
        isDirty: false,
        listener: 'color',
        property: 'color',
        localAttr: 'color',
        type: 'style'
      },
      {
        isDirty: false,
        type: 'style'
      }
    ]);
    runCategory('singleStyle', templateSingleStyle, templateSingleStyleStyle, 1,
    [
      {}, {}
    ],
    [
      {
        isDirty: false,
        listener: 'style',
        property: 'style',
        localAttr: 'style',
        type: 'style'
      }
    ]);
    runCategory('attr', templateAttr, templateAttrStyle, 3,
    [
      {}, {}, {}
    ],
    [
      {
        
      },
      {
        
      },
      {
        
      }
    ]);
  });
}