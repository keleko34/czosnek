# Czosnek
> An html and css template mapping library

[![NPM version][npm-image]][npm-url] [![Gitter][gitter-image]][gitter-url]

Table of contents
=================

   * [What is it?](#what-is-it)
   * [Installation](#installation)
   * How to use it:
      * [Getting started](#getting-started)
      * [Templates](#templates)
      * [Fetching Components](#fetching-components)
      * [Mapping](#mapping)
      * [Filters](#filters)
      * [Maps](#maps)
   * [Examples](#examples)
   * [How to contribute](#how-to-contribute)
   * [License](#license)
   
What is it?
==========  
This library allows you to save component html templates and create mappings sets of the bindings in those templates. This does not manipulate data in any manner but simply parses the template elements and returns an object containing all necessary info to manipulate the binds

Getting started
============
The script can be loaded both in the head and in the body. 
All functionality is automatically loaded as soon as the file is loaded.
```
 <script src="/(node_modules|bower_modules)/czosnek/czosnek.min.js"></script>
```

To start using it you must register component templates you will want to use
```
 czosnek.register("component_name", '<div>{{map}}</div>');
```

To create the component and its maps object

HTML
```
<div>
  <component_name></component_name>
</div>
```

JS
```
  var componentNode = document.querySelector('component_name');
  var componentMaps = new czosnek(componentNode);
```

Templates
============
Templates allow us to register component names to larger sets of html

```
  czosnek.register("component_name", '<div>{{map}}</div>');
```

Thus when we use the czosnek constructor an expanded version of this html will be created when a node with the tagname of a registered template is used.

You can also choose to unregister a template later if you need to

```
czsonek.unregister("component_name");

Fetching Components
============
You can use some useful methods to help in the fetching of components in your html or dom

#### getUnknown (node | html string)
- node: (This allows us to fetch all component nodes inside a passed element)
- html string: (This allows us to fetch all components in an html string, useful for loading component files by name)

#### isUnknown (tag name)
This helps us determine if the tag name in question is a real dom node or not

Mappings
============
Mappings are designated by the typical `{{}}` double curly braces and can be placed anywhere from text, attributes and even element names.

There are a few formats for how these binds can be presented:

#### Standard
`{{name}}`
This is your standard map

#### Insert
`{{>name}}`
This is considered a insert map, something to use for placing data but not binding to

#### For
`{{for name loop component_name}}`
This helps to show where an data list mapping can be constructed

#### Node
`<{{name}}></{{name}}>`
This allows mapping to special nodes meant for dynamic hot swapping

Filters
============
Filters are extra names attached by a `|` character to allow extra functionality

There are a few formats for how filters are presented

#### Standard
`{{name | filter_name, filter_name_two}}`
standard filter names, multiple can be parse when seperated by `,`

#### VFilters
`{{name | (filter_name)}}`
allows for a secondary type of filter names

#### Storage
`{{name | [+filter_name], [-filter_name], [~filter_name]}}`
Allow for maping to storage names. `+` for local storage, `-` for session storage, `~` for model storage

Maps
============
The maps object will give you all required information about your component

#### name
Name of the component

#### template
Template of the component

#### node
Node passed

#### params
Any attributes attached to the node

#### pointers
Any maps from a parent element

#### innerHTML
Any nodes located inside the component

#### expanded
The expanded component template as elements

#### maps
The associate binding maps

Examples
========
#### Creating a simple template replacer

HTML
```
<!-- INSIDE BODY -->
<div>
  <custom-input />
  <div>
    <custom-component />
  </div>
</div>
```

JS
```
czosnek.register('custom-input', '<input type="text" placeholder="custom" />');
czosnek.register('custom-component', '<div><h1>Hello</h1><span class="large-yellow">World</span></div>');

czosnek.getUnknown(document.body)
.forEach(function(component){
  var maps = new czosnek(component);
  component.parentElement.replaceChild(maps.expanded, component);
});
```

How to contribute
=================
If You would like to contribute here are the steps

1. Clone Repo: [Czosnek Github Repo](https://github.com/keleko34/czosnek)
2. Install any necessary dev dependencies
3. build the project `npm run build`
4. test your changes don't break anything `npm test`
5. Make a pull request on github for your changes :)

License
=======
You can view the license here: [License](https://github.com/keleko34/czosnek/blob/master/LICENSE)

[npm-url]: https://www.npmjs.com/package/czosnek
[npm-image]: https://img.shields.io/npm/v/czosnek.svg
[gitter-url]: https://gitter.im/czosnekjs/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
[gitter-image]: https://badges.gitter.im/czosnekjs/Lobby.svg