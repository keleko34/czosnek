function standardBinds(describe, it, expect)
{
  var templateStandard = `<div>
    <div class="{{testobj.testarr.0 | [+val], [-val], [~val]}}">{{test | toUpperCase}}</div>
  </div>`,
      templateInsert = `<div>
    <div class="{{>testobj.testarr.0 | [+val], [-val], [~val]}}">{{>test | toUpperCase}}</div>
  </div>`,
      templateFor = `<div>
    <div>{{for items loop listitem | sort}}</div>
  </div>`,
      templatePointer = `<div>
    <test class="{{testobj.testarr.0 | [+val]}} test-class">
        <div>{{test | toUpperCase}} something</div>
    </test>
  </div>`,
      templateNode = `<div>
    <{{test | helper}} class={{cool}}>
        <div></div>
    </{{test | helper}}>
  </div>`
  
  var methods = [
    checkMaps,
    checkFilters,
    checkMapObject
  ];
  
  function getType(obj, type)
  {
    return type.split('.').reduce(function(o, k){
      return o[k];
    }, obj);
  }
  
  function runCategory(component, template, type, length, filters, objects)
  {
    describe(component, function(){
      for(var x =0,len=methods.length;x<len;x++)
      {
        /* SETUP */
        if(!czosnek.isRegistered(component)) czosnek.register(component, template);
        var testDiv = document.querySelector('.test-div'),
            testComponent = document.createElement(component);
        testDiv.stop().innerHTML = "";
        testDiv.stop().appendChild(testComponent);
        methods[x](testComponent, type, length, filters, objects);
      }
    });
  }
  
  function checkMaps(component, type, len)
  {
    it("Should create the proper amount of maps", function(done){
      var test = new czosnek(component),
          maps = getType(test.maps, type);
      
      expect(maps.length).to.equal(len);
      
      done();
    });
  }
  
  function checkFilters(component, type, len, filters)
  {
    it("Should contain the proper filters for the maps", function(done){
      var test = new czosnek(component),
          maps = getType(test.maps, type);
      
      for(var x=0,len=maps.length;x<len;x++)
      {
        var f = Object.keys(maps[x].filters).filter(function(v){return maps[x].filters[v].length;});
        expect(JSON.stringify(f)).to.equal(JSON.stringify(Object.keys(filters[x])));
        for(var i=0,lenn=f.length;i<lenn;i++)
        {
          expect(maps[x].filters[f[i]].length).to.equal(filters[x][f[i]].length);
        }
      }
      done();
    });
  }
  
  function checkMapObject(component, type, len, filters, objects)
  {
    it("Should contain the proper items in the map objects", function(done){
      var test = new czosnek(component),
          maps = getType(test.maps, type);
      
      for(var x=0,len=objects.length;x<len;x++)
      {
        var filter = maps[x],
            keys = Object.keys(objects[x]);
        
        if(objects[x].localComponent) objects[x].localComponent = test.expanded.querySelector('test');
        
        for(var i=0,lenn=keys.length;i<lenn;i++)
        {
          expect(filter[keys[i]]).to.equal(objects[x][keys[i]]);
        }
      }
      done();
    });
  }
  
  describe("Mapping:",function(){
    runCategory('standard', templateStandard, 'standards', 2,
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
    runCategory('insert', templateInsert, 'inserts', 2,
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
    runCategory('for', templateFor, 'loops', 1,
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
    runCategory('pointer', templatePointer, 'pointers.standards', 2,
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
        isRadio: false,
        localComponent: true
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
        isRadio: false,
        localComponent: true
      }
    ]);
    runCategory('node', templateNode, 'nodes', 1,
    [
      { filters: [1] }
    ],
    [
      {
        isDirty: false,
        listener: 'html',
        property: 'innerHTML',
        localAttr: 'node',
        keyLength: 1,
        key: 'test',
        isEvent: false,
        isInput: false,
        isRadio: false
      }
    ]);
  });
}