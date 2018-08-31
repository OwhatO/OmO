OmO
================================

This is a solution of observation.

We come up with a new data type named "Model". 
A model holds a Number, String, Array, dictionary or anything else inside, 
but cannot change the type of the data inside. 
Models can be observed. When a model changes, the registered observers will be called. 
The items of an array model or dictionary model are models.
An expression within models returns a model. When any model within changes, the expression model follows. 

With the expression feature, we can easily build a complex reactive chain, tree or even a huge network. 
It can help you to build a reactive app comfortably. 

But since EcmaScript not support any operator overriding, pointer or meta programming, even cannot let a object falsely,
our Model cannot be implemented completely. Fortunately, with ES6 Proxy, all primary features become ture. 
We only lose some sugars. 

## Usage

### simple Model

```js
import Model from 'https://oxo.fenzland.com/OmO/0.1/Model.js';

const foo= new Model( 1, );

let bar;

foo.observedBy( foo=> bar= foo, );

console.log( bar, ); // 1

foo.setValue( 2 );

console.log( bar, ); // 2
```


### Work with setter of dictionary Model

```js
import Model from 'https://oxo.fenzland.com/OmO/0.1/Model.js';

const data= new Model( { foo:1 }, );

let bar;

data.foo.observedBy( foo=> bar= foo, );

console.log( bar, ); // 1

data.foo= 2;

console.log( bar, ); // 2

++data.foo;

console.log( bar, ); // 3
```


### with DOM

```js
import Model from 'https://oxo.fenzland.com/OmO/0.1/Model.js';

const data= new Model( { counter:0, }, );

const counterDom= document.querySelector( 'div.counter', );
const buttonDom= document.querySelector( 'button.counter', );

data.counter.observedBy( counter=> counterDom.innerHTML= counter, );

buttonDom.addEventListener( 'click', e=> ++data.counter, )

```


### Expressions

```js
import Model, { $, } from 'https://oxo.fenzland.com/OmO/0.1/Model.js';

const foo= new Model( 1, );
const bar= new Model( 2, );

const baz= foo.$( foo=> !!foo, );
const qux= $( ( foo, bar )=> bar - foo, foo, bar, );

let quz, cor;

baz.observedBy( baz=> quz= baz, );
qux.observedBy( qux=> cor= qux, );

console.log( quz ); // true
console.log( cor ); // 1

foo.setValue( 0, );

console.log( quz ); // false
console.log( cor ); // 2

bar.setValue( 3, );

console.log( quz ); // false
console.log( cor ); // 3

```


### Array Model

```js
import Model, { ArrayModel, } from 'https://oxo.fenzland.com/OmO/0.1/Model.js';

const foo= new Model( [], );

let count;

console.log( foo instanceof ArrayModel, ); // true
console.log( Array.isArray( foo, ), );     // true

foo.observedBy( ( index, addition, removed, )=> console.log( index, addition, removed, ), );
foo.length.observedBy( length=> count= length, );

console.log( count, );  // 0

foo.push( 1, );         // 0, Model {1}, null
console.log( count, );  // 1

foo.push( 2, ); // 1, Model {2}, null
console.log( count, );  // 2

foo.pop();      // 1, null, Model {2}
console.log( count, );  // 1

```
