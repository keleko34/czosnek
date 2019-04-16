mocha.setup('bdd');

var templates = {
  standard: '<div><div class="{{testobj.testarr.0 | [+val], [-val], [~val]}}">{{test | toUpperCase}}</div></div>',
  standardStyle: '.yay { background: gray } .yay {{local}} { color: yellow } {{>local}} { width: 100px }',
  insert: '<div><div class="{{>testobj.testarr.0 | [+val], [-val], [~val]}}">{{>test | toUpperCase}}</div></div>',
  loop: '<div><div>{{for items loop listitem | sort}}</div></div>',
  pointer: '<div><test class="{{testobj.testarr.0 | [+val]}} test-class"><div>{{test | toUpperCase}} something</div></test></div>',
  node: '<div><{{test | helper}} class="{{cool}}"><div>{{help}}</div></{{test | helper}}></div>',
  event: '<div onclick="{{click}}"></div>',
  stylesheetStyle: '{{local}} { {{setColor | randomize}}:blue; font-size:{{size | containerHeight}}px; }',
  styleattribute: '<div style="color:{{color}};{{extra | checkTheme}}:blue;{{fullprop}};"></div>',
  singlestyleattribute: '<div style="{{styles | filter}}"></div>',
  attribute: '<div {{attr1}}="something" attr="{{test | check}} data" {{attr2}}="test" ></div>',
  stylesheetclassStyle: '.something {{{style}}} \r\n .something{{local}} { {{style | parseLocal}} }',
  stylesheetpropertyStyle: '.something { {{prop}}; } \r\n .something{{local}} { color: blue; {{local_prop | adjust}}; }'
}

var czos;

function create(name)
{
  czosnek.register(name, (templates[name] || '<div></div>'), (templates[name + 'Style'] || ''));
  return new czosnek(name);
}

function destroy(czos)
{
  czos.destruct();
  czosnek.unregister(czos.title);
}

(function(describe,it,expect,spy){
  /* mocha tests */
  describe('Standard', function(){
    
    before(function(done) {
      czos = create('standard');
      done();
    });
    
    after(function(done){
      destroy(czos);
      done();
    });
    
    it('Should contain the correct mappings', function(done){
      expect(czos.maps.length).to.equal(2);
      expect(czos.maps[0].key).to.equal('testobj.testarr.0');
      expect(czos.maps[1].key).to.equal('test');
      done();
    })
    
    it('Should contain the correct filters', function(done){
      var filtersFirst = czos.maps[0].filters,
          filtersSecond = czos.maps[1].filters;
      
      expect(filtersFirst.local.length).to.equal(1);
      expect(filtersFirst.local[0]).to.equal('val');
      expect(filtersFirst.session.length).to.equal(1);
      expect(filtersFirst.session[0]).to.equal('val');
      expect(filtersFirst.model.length).to.equal(1);
      expect(filtersFirst.model[0]).to.equal('val');
      
      expect(filtersSecond.filters.length).to.equal(1);
      expect(filtersSecond.filters[0]).to.equal('toUpperCase');
      done();
    })
    
    it('Should contain the proper map properties', function(done){
      var mapFirst = czos.maps[0],
          mapSecond = czos.maps[1];
      
      expect(mapFirst.type).to.equal('standard');
      expect(mapFirst.mapText.length).to.equal(1);
      expect(mapFirst.isAttr).to.equal(true);
      expect(mapFirst.isDirty).to.equal(false);
      expect(mapFirst.listener).to.equal('class');
      expect(mapFirst.localAttr).to.equal('value');
      expect(mapFirst.localKey).to.equal('0');
      expect(mapFirst.property).to.equal('class');
      expect(mapFirst.values.length).to.equal(0);
      
      expect(mapSecond.type).to.equal('standard');
      expect(mapSecond.mapText.length).to.equal(1);
      expect(mapSecond.isDirty).to.equal(false);
      expect(mapSecond.listener).to.equal('html');
      expect(mapSecond.localAttr).to.equal('textContent');
      expect(mapSecond.localKey).to.equal('test');
      expect(mapSecond.property).to.equal('textContent');
      expect(mapSecond.values.length).to.equal(0);
      done();
    })
    
    it('Should of replaced the local maps in the styles', function(done){
      expect(czos.style[1].innerHTML.indexOf('[component-id="'+czos.id+'"]')).to.not.equal(-1);
      expect(czos.style[1].innerHTML.indexOf('{{local}}')).to.equal(-1);
      expect(czos.style[1].innerHTML.indexOf('{{>local}}')).to.equal(-1);
      done();
    })
  });
  
  describe('Insert', function(){
    
    before(function(done) {
      czos = create('insert');
      done();
    });
    
    after(function(done){
      destroy(czos);
      done();
    });
    
    it('Should contain the correct mappings', function(done){
      expect(czos.maps.length).to.equal(2);
      expect(czos.maps[0].key).to.equal('testobj.testarr.0');
      expect(czos.maps[1].key).to.equal('test');
      done();
    })
    
    it('Should contain the correct filters', function(done){
      var filtersFirst = czos.maps[0].filters,
          filtersSecond = czos.maps[1].filters;
      
      expect(filtersFirst.local.length).to.equal(1);
      expect(filtersFirst.local[0]).to.equal('val');
      expect(filtersFirst.session.length).to.equal(1);
      expect(filtersFirst.session[0]).to.equal('val');
      expect(filtersFirst.model.length).to.equal(1);
      expect(filtersFirst.model[0]).to.equal('val');
      
      expect(filtersSecond.filters.length).to.equal(1);
      expect(filtersSecond.filters[0]).to.equal('toUpperCase');
      done();
    })
    
    it('Should contain the proper map properties', function(done){
      var mapFirst = czos.maps[0],
          mapSecond = czos.maps[1];
      
      expect(mapFirst.type).to.equal('standard');
      expect(mapFirst.isInsert).to.equal(true);
      expect(mapFirst.mapText.length).to.equal(1);
      expect(mapFirst.isAttr).to.equal(true);
      expect(mapFirst.isDirty).to.equal(false);
      expect(mapFirst.listener).to.equal(undefined);
      expect(mapFirst.localAttr).to.equal('value');
      expect(mapFirst.localKey).to.equal('0');
      expect(mapFirst.property).to.equal('class');
      expect(mapFirst.values.length).to.equal(0);
      
      expect(mapSecond.type).to.equal('standard');
      expect(mapSecond.isInsert).to.equal(true);
      expect(mapSecond.mapText.length).to.equal(1);
      expect(mapSecond.isDirty).to.equal(false);
      expect(mapSecond.listener).to.equal(undefined);
      expect(mapSecond.localAttr).to.equal('textContent');
      expect(mapSecond.localKey).to.equal('test');
      expect(mapSecond.property).to.equal('textContent');
      expect(mapSecond.values.length).to.equal(0);
      done();
    })
  });
  
  describe('Loop', function(){
    before(function(done) {
      czos = create('loop');
      done();
    });
    
    after(function(done){
      destroy(czos);
      done();
    });
    
    it('Should contain the correct mappings', function(done){
      expect(czos.maps.length).to.equal(1);
      expect(czos.maps[0].key).to.equal('items');
      done();
    })
    
    it('Should contain the correct filters', function(done){
      var filters = czos.maps[0].filters;
      expect(filters.filters.length).to.equal(1);
      expect(filters.filters[0]).to.equal('sort');
      done();
    })
    
    it('Should contain the proper map properties', function(done){
      var map = czos.maps[0];
      expect(map.type).to.equal('loop');
      expect(map.component).to.equal('listitem');
      expect(map.isLoop).to.equal(true);
      expect(map.mapText.length).to.equal(1);
      expect(map.isDirty).to.equal(false);
      expect(map.listener).to.equal('html');
      expect(map.localAttr).to.equal('innerHTML');
      expect(map.localKey).to.equal('items');
      expect(map.property).to.equal('innerHTML');
      expect(map.values.length).to.equal(0);
      done();
    })
  })
  
  describe('Pointer', function(){
    
    before(function(done) {
      czos = create('pointer');
      done();
    });
    
    after(function(done){
      destroy(czos);
      done();
    });
    
    it('Should contain the correct mappings', function(done){
      expect(czos.maps.length).to.equal(2);
      expect(czos.maps[0].key).to.equal('testobj.testarr.0');
      expect(czos.maps[1].key).to.equal('test');
      done();
    })
    
    it('Should contain the correct filters', function(done){
      var filtersFirst = czos.maps[0].filters,
          filtersSecond = czos.maps[1].filters;
      
      expect(filtersFirst.local.length).to.equal(1);
      expect(filtersFirst.local[0]).to.equal('val');
      
      expect(filtersSecond.filters.length).to.equal(1);
      expect(filtersSecond.filters[0]).to.equal('toUpperCase');
      done();
    })
    
    it('Should contain the proper map properties', function(done){
      var mapFirst = czos.maps[0],
          mapSecond = czos.maps[1];

      expect(mapFirst.type).to.equal('pointer');
      expect(mapFirst.mapText.length).to.equal(2);
      expect(mapFirst.isAttr).to.equal(true);
      expect(mapFirst.isDirty).to.equal(true);
      expect(mapFirst.listener).to.equal('class');
      expect(mapFirst.localAttr).to.equal('value');
      expect(mapFirst.localKey).to.equal('0');
      expect(mapFirst.property).to.equal('class');
      expect(mapFirst.values.length).to.equal(0);
      expect(mapFirst.isPointer).to.equal(true);
      
      expect(mapSecond.type).to.equal('standard');
      expect(mapSecond.mapText.length).to.equal(2);
      expect(mapSecond.isDirty).to.equal(true);
      expect(mapSecond.listener).to.equal('html');
      expect(mapSecond.localAttr).to.equal('textContent');
      expect(mapSecond.localKey).to.equal('test');
      expect(mapSecond.property).to.equal('textContent');
      expect(mapSecond.values.length).to.equal(0);
      expect(mapSecond.isPointer).to.equal(undefined);
      done();
    })
  })
  
  describe('Node', function(){
    before(function(done) {
      czos = create('node');
      done();
    });
    
    after(function(done){
      destroy(czos);
      done();
    });
    
    it('Should contain the correct mappings', function(done){
      expect(czos.maps.length).to.equal(2);
      expect(czos.maps[0].key).to.equal('test');
      expect(czos.maps[1].key).to.equal('help');
      expect(czos.maps[0].values.length).to.equal(1);
      expect(czos.maps[0].values[0].key).to.equal('cool')
      done();
    })
    
    it('Should contain the correct filters', function(done){
      var filters = czos.maps[0].filters;
      
      expect(filters.filters.length).to.equal(1);
      expect(filters.filters[0]).to.equal('helper');
      done();
    })
    
    it('Should contain the proper map properties', function(done){
      var mapFirst = czos.maps[0],
          mapSecond = czos.maps[1],
          mapThird = czos.maps[0].values[0];

      expect(mapFirst.type).to.equal('node');
      expect(mapFirst.mapText.length).to.equal(1);
      expect(mapFirst.isDirty).to.equal(false);
      expect(mapFirst.listener).to.equal('nodeName');
      expect(mapFirst.localAttr).to.equal('nodeName');
      expect(mapFirst.localKey).to.equal('test');
      expect(mapFirst.property).to.equal('nodeName');
      expect(mapFirst.values.length).to.equal(1);
      
      expect(mapSecond.type).to.equal('standard');
      expect(mapSecond.mapText.length).to.equal(1);
      expect(mapSecond.isDirty).to.equal(false);
      expect(mapSecond.listener).to.equal('html');
      expect(mapSecond.localAttr).to.equal('textContent');
      expect(mapSecond.localKey).to.equal('help');
      expect(mapSecond.property).to.equal('textContent');
      expect(mapSecond.values.length).to.equal(0);
      
      expect(mapThird.type).to.equal('pointer');
      expect(mapThird.mapText.length).to.equal(1);
      expect(mapThird.maps.length).to.equal(1);
      expect(mapThird.isAttr).to.equal(true);
      expect(mapThird.isDirty).to.equal(false);
      expect(mapThird.listener).to.equal('class');
      expect(mapThird.localAttr).to.equal('value');
      expect(mapThird.localKey).to.equal('cool');
      expect(mapThird.property).to.equal('class');
      expect(mapThird.values.length).to.equal(0);
      done();
    })
  })
  
  describe("Event", function(){
    before(function(done) {
      czos = create('event');
      done();
    });
    
    after(function(done){
      destroy(czos);
      done();
    });
    
    it('Should contain the correct mappings', function(done){
      expect(czos.maps.length).to.equal(1);
      expect(czos.maps[0].key).to.equal('click');
      done();
    })
    
    it('Should contain the proper map properties', function(done){
      var map = czos.maps[0];
      
      expect(map.type).to.equal('event');
      expect(map.mapText.length).to.equal(1);
      expect(map.isEvent).to.equal(true);
      expect(map.isDirty).to.equal(false);
      expect(map.listener).to.equal('onclick');
      expect(map.localAttr).to.equal('onclick');
      expect(map.localKey).to.equal('click');
      expect(map.property).to.equal('onclick');
      expect(map.values.length).to.equal(0);
      done();
    })
    
    it('Should have removed the attribute', function(done){
      expect(czos.component.getAttribute('onclick')).to.equal(null);
      done();
    })
  })
  
  describe('Stylesheet', function(){
    before(function(done) {
      czos = create('stylesheet');
      done();
    });
    
    after(function(done){
      destroy(czos);
      done();
    });
    
    it('Should contain the correct mappings', function(done){
      expect(czos.maps.length).to.equal(2);
      expect(czos.maps[0].key).to.equal('setColor');
      expect(czos.maps[1].key).to.equal('size');
      done();
    })
    
    it('Should contain the correct filters', function(done){
      var filtersFirst = czos.maps[0].filters,
          filtersSecond = czos.maps[1].filters;
      
      expect(filtersFirst.filters.length).to.equal(1);
      expect(filtersFirst.filters[0]).to.equal('randomize');
      
      expect(filtersSecond.filters.length).to.equal(1);
      expect(filtersSecond.filters[0]).to.equal('containerHeight');
      done();
    })
    
    it('Should contain the proper map properties', function(done){
      var mapFirst = czos.maps[0],
          mapSecond = czos.maps[1];
      
      expect(mapFirst.type).to.equal('stylesheet');
      expect(mapFirst.mapText.length).to.equal(6);
      expect(mapFirst.isDirty).to.equal(true);
      expect(mapFirst.listener).to.equal('html');
      expect(mapFirst.localAttr).to.equal('innerHTML');
      expect(mapFirst.localKey).to.equal('setColor');
      expect(mapFirst.property).to.equal('innerHTML');
      expect(mapFirst.values.length).to.equal(1);
      expect(mapFirst.values[0]).to.equal('blue');
      
      expect(mapSecond.type).to.equal('stylesheet');
      expect(mapSecond.mapText.length).to.equal(6);
      expect(mapSecond.isDirty).to.equal(true);
      expect(mapSecond.listener).to.equal('html');
      expect(mapSecond.localAttr).to.equal('innerHTML');
      expect(mapSecond.localKey).to.equal('size');
      expect(mapSecond.property).to.equal('innerHTML');
      expect(mapSecond.values.length).to.equal(0);
      done();
    })
  })
  
  describe('StylesheetClass', function(){
    before(function(done) {
      czos = create('stylesheetclass');
      done();
    });
    
    after(function(done){
      destroy(czos);
      done();
    });
    
    it('Should contain the correct mappings', function(done){
      expect(czos.maps.length).to.equal(2);
      expect(czos.maps[0].key).to.equal('style');
      expect(czos.maps[1].key).to.equal('style');
      done();
    })
    
    it('Should contain the correct filters', function(done){
      var filters = czos.maps[1].filters;
      
      expect(filters.filters.length).to.equal(1);
      expect(filters.filters[0]).to.equal('parseLocal');
      done();
    })
    
    it('Should contain the proper map properties', function(done){
      var mapFirst = czos.maps[0],
          mapSecond = czos.maps[1];
      
      expect(mapFirst.type).to.equal('stylesheet');
      expect(mapFirst.mapText.length).to.equal(3);
      expect(mapFirst.isDirty).to.equal(true);
      expect(mapFirst.listener).to.equal('html');
      expect(mapFirst.localAttr).to.equal('innerHTML');
      expect(mapFirst.localKey).to.equal('style');
      expect(mapFirst.property).to.equal('innerHTML');
      expect(mapFirst.values.length).to.equal(0);
      expect(mapFirst.isFullStyle).to.equal(true);
      
      expect(mapSecond.type).to.equal('stylesheet');
      expect(mapSecond.mapText.length).to.equal(5);
      expect(mapSecond.isDirty).to.equal(true);
      expect(mapSecond.listener).to.equal('html');
      expect(mapSecond.localAttr).to.equal('innerHTML');
      expect(mapSecond.localKey).to.equal('style');
      expect(mapSecond.property).to.equal('innerHTML');
      expect(mapSecond.values.length).to.equal(0);
      expect(mapFirst.isFullStyle).to.equal(true);
      done();
    })
  })
  
  describe('StylesheetProperty', function(){
    before(function(done) {
      czos = create('stylesheetproperty');
      done();
    });
    
    after(function(done){
      destroy(czos);
      done();
    });
    
    it('Should contain the correct mappings', function(done){
      expect(czos.maps.length).to.equal(2);
      expect(czos.maps[0].key).to.equal('prop');
      expect(czos.maps[1].key).to.equal('local_prop');
      done();
    })
    
    it('Should contain the correct filters', function(done){
      var filters = czos.maps[1].filters;
      
      expect(filters.filters.length).to.equal(1);
      expect(filters.filters[0]).to.equal('adjust');
      done();
    })
    
    it('Should contain the proper map properties', function(done){
      var mapFirst = czos.maps[0],
          mapSecond = czos.maps[1];
      
      expect(mapFirst.type).to.equal('stylesheet');
      expect(mapFirst.mapText.length).to.equal(3);
      expect(mapFirst.isDirty).to.equal(true);
      expect(mapFirst.listener).to.equal('html');
      expect(mapFirst.localAttr).to.equal('innerHTML');
      expect(mapFirst.localKey).to.equal('prop');
      expect(mapFirst.property).to.equal('innerHTML');
      expect(mapFirst.values.length).to.equal(0);
      expect(mapFirst.isFullProp).to.equal(true);
      
      expect(mapSecond.type).to.equal('stylesheet');
      expect(mapSecond.mapText.length).to.equal(5);
      expect(mapSecond.isDirty).to.equal(true);
      expect(mapSecond.listener).to.equal('html');
      expect(mapSecond.localAttr).to.equal('innerHTML');
      expect(mapSecond.localKey).to.equal('local_prop');
      expect(mapSecond.property).to.equal('innerHTML');
      expect(mapSecond.values.length).to.equal(0);
      expect(mapFirst.isFullProp).to.equal(true);
      done();
    })
  })
  
  describe('StyleAttribute', function(){
    before(function(done) {
      czos = create('styleattribute');
      done();
    });
    
    after(function(done){
      destroy(czos);
      done();
    });
    
    it('Should contain the correct mappings', function(done){
      expect(czos.maps.length).to.equal(3);
      expect(czos.maps[0].key).to.equal('color');
      expect(czos.maps[1].key).to.equal('extra');
      done();
    })
    
    it('Should contain the correct filters', function(done){
      var filters = czos.maps[1].filters;
      
      expect(filters.filters.length).to.equal(1);
      expect(filters.filters[0]).to.equal('checkTheme');
      done();
    })
    
    it('Should contain the proper map properties', function(done){
      var mapFirst = czos.maps[0],
          mapSecond = czos.maps[1];
      
      expect(mapFirst.type).to.equal('style');
      expect(mapFirst.mapText.length).to.equal(1);
      expect(mapFirst.isDirty).to.equal(false);
      expect(mapFirst.listener).to.equal('color');
      expect(mapFirst.localAttr).to.equal('color');
      expect(mapFirst.localKey).to.equal('color');
      expect(mapFirst.property).to.equal('color');
      expect(mapFirst.values.length).to.equal(0);
      expect(mapFirst.isInlineStyle).to.equal(true);
      
      expect(mapSecond.type).to.equal('style');
      expect(mapSecond.mapText.length).to.equal(1);
      expect(mapSecond.isDirty).to.equal(false);
      expect(mapSecond.listener).to.equal(undefined);
      expect(mapSecond.localAttr).to.equal(undefined);
      expect(mapSecond.localKey).to.equal('extra');
      expect(mapSecond.property).to.equal('style');
      expect(mapSecond.values.length).to.equal(1);
      expect(mapSecond.values[0]).to.equal('blue');
      expect(mapSecond.isInlineStyle).to.equal(true);
      done();
    })
  })
  
  describe('SingleStyleAttribute', function(){
    before(function(done) {
      czos = create('singlestyleattribute');
      done();
    });
    
    after(function(done){
      destroy(czos);
      done();
    });
    
    it('Should contain the correct mappings', function(done){
      expect(czos.maps.length).to.equal(1);
      expect(czos.maps[0].key).to.equal('styles');
      done();
    })
    
    it('Should contain the correct filters', function(done){
      var filters = czos.maps[0].filters;
      
      expect(filters.filters.length).to.equal(1);
      expect(filters.filters[0]).to.equal('filter');
      done();
    })
    
    it('Should contain the proper map properties', function(done){
      var map = czos.maps[0];

      expect(map.type).to.equal('style');
      expect(map.mapText.length).to.equal(1);
      expect(map.isDirty).to.equal(false);
      expect(map.listener).to.equal('style');
      expect(map.localAttr).to.equal(undefined);
      expect(map.localKey).to.equal('styles');
      expect(map.property).to.equal('style');
      expect(map.values.length).to.equal(0);
      expect(map.isInlineStyle).to.equal(true);
      expect(map.isFullStyle).to.equal(true);
      done();
    })
  })
  
  describe('Attribute', function(){
    before(function(done) {
      czos = create('attribute');
      done();
    });
    
    after(function(done){
      destroy(czos);
      done();
    });
    
    it('Should contain the correct mappings', function(done){
      expect(czos.maps.length).to.equal(3);
      /* due to different browser order */
      expect(['test', 'attr1'].indexOf(czos.maps[0].key)).to.not.equal(-1);
      expect(['attr1', 'attr2'].indexOf(czos.maps[1].key)).to.not.equal(-1);
      expect(['attr2', 'test'].indexOf(czos.maps[2].key)).to.not.equal(-1);
      done();
    })
    
    it('Should contain the correct filters', function(done){
      /* due to different browser order */
      var filtersA = czos.maps[0].filters,
          filtersB = czos.maps[2].filters,
          together = filtersA.filters.concat(filtersB.filters);
      
      expect(together.length).to.equal(1);
      expect(together[0]).to.equal('check');
      done();
    })
    
    it('Should contain the proper map properties', function(done){
      var methods = {};
      methods.attr1 = function(map)
      {
        expect(map.type).to.equal('attr');
        expect(map.mapText.length).to.equal(1);
        expect(map.isDirty).to.equal(false);
        expect(map.listener).to.equal('setAttribute');
        expect(map.localAttr).to.equal(undefined);
        expect(map.localKey).to.equal('attr1');
        expect(map.property).to.equal(undefined);
        expect(map.values.length).to.equal(1);
        expect(map.values[0]).to.equal('something');
      }
      
      methods.attr2 = function(map)
      {
        expect(map.type).to.equal('attr');
        expect(map.mapText.length).to.equal(1);
        expect(map.isDirty).to.equal(false);
        expect(map.listener).to.equal('setAttribute');
        expect(map.localAttr).to.equal(undefined);
        expect(map.localKey).to.equal('attr2');
        expect(map.property).to.equal(undefined);
        expect(map.values.length).to.equal(1);
        expect(map.values[0]).to.equal('test');
      }
      
      methods.test = function(map)
      {
        expect(map.type).to.equal('standard');
        expect(map.mapText.length).to.equal(2);
        expect(map.isDirty).to.equal(true);
        expect(map.listener).to.equal('attr');
        expect(map.localAttr).to.equal('value');
        expect(map.localKey).to.equal('test');
        expect(map.property).to.equal('attr');
        expect(map.values.length).to.equal(0);
      }
      methods[czos.maps[0].key](czos.maps[0]);
      methods[czos.maps[1].key](czos.maps[1]);
      methods[czos.maps[2].key](czos.maps[2]);
      done();
    })
  })
  
  mocha.run();
}(describe,it,chai.expect,sinon.spy));