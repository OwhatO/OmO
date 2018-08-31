model a= 1;        // declare a model named "a" and init with a value Number( 1, )
let b= a;          // declare a variable named "b" and bind to model a
model c= a - - b;  // declare a model named "c" and init with a expression
let d= a - b;      // declare a variable named "d" and bind to a expression model
const f= a * b;    // Error: cannot bind model to a constant

console.log( a, ); // Model { <name>:"a", <value>:1, }
console.log( b, ); // 1
console.log( c, ); // Model { <name>:"c", <expression>:"a - - 1", <value>:2, }
console.log( d, ); // 0

a= 2; // set value of model a to 2

console.log( a, ); // Model { <name>:"a", <value>:2, }
console.log( b, ); // 2
console.log( c, ); // Model { <name>:"c", <expression>:"a - - 1", <value>:3, }
console.log( d, ); // 1

b= 3; // unbind b from model a and set to 3

console.log( a, ); // Model { <name>:"a", <value>:2, }
console.log( b, ); // 3
console.log( c, ); // Model { <name>:"c", <expression>:"a - - 1", <value>:3, }
console.log( d, ); // 1

a= 4; // set value of model a to 4

console.log( a, ); // Model { <name>:"a", <value>:4, }
console.log( b, ); // 3
console.log( c, ); // Model { <name>:"c", <expression>:"a - - 1", <value>:5, }
console.log( d, ); // 3

c= 8; // Error: cannot set value to a expression model
