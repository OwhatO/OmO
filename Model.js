import 'https://oxo.fenzland.com/OsO/0.1/polyfill.js';

const ID= Symbol( 'ID', );
const NAME= Symbol( 'NAME', );
const CHILDREN= Symbol( 'CHILDREN', );
const VALUE= Symbol( 'VALUE', );
const OBSERVERS= Symbol( 'OBSERVERS', );
const INIT_OBSERVER= Symbol( 'INIT_OBSERVER', );
const DEPENDENCIES= Symbol( 'DEPENDENCIES', );
const SET_VALUE= Symbol( 'SET_VALUE', );
const ORIGIN= Symbol( 'ORIGIN', );
const OBJECT_VALUE= Symbol( 'OBJECT_VALUE', );
const LENGTH= Symbol( 'LENGTH', );
const EMIT= Symbol( 'EMIT', );

const rippling= new WeakMap();

let id= 0;

function makeProxy( target, )
{
	target[ID]= ++id;
	
	return new Proxy( target, {
		
		get( target, key, receiver, )
		{
			const getter= target.__lookupGetter__( key, );
			
			if( getter )
			{
				return getter.call( target, );
			}
			else
			if( target[key] )
				return target[key];
			else
				return target[CHILDREN][key];
		},
		
		set( target, key, value, receiver, )
		{
			if( typeof key === 'symbol' )
			{
				target[key]= value;
				return true;
			}
			
			if( target[CHILDREN][key] )
			{
				if( value instanceof Model )
				{
					[ target[CHILDREN][key], value, ]= [ value.express( x=> x, ), target[CHILDREN][key], ];
					
					target[CHILDREN][key][CHILDREN]= value[CHILDREN];
					target[CHILDREN][key][OBSERVERS]= value[OBSERVERS];
					
					target[CHILDREN][key].setValue( target[CHILDREN][key].valueOf(), );
				}
				else
					target[CHILDREN][key].setValue( value, );
			}
			else
				target[CHILDREN][key]= new Model( value, `${target[NAME]}.${key}`, );
			return true;
		},
		
		has( target, key, )
		{
			return key in target[CHILDREN];
		},
		
		deleteProperty( target, key, )
		{
			return delete target[CHILDREN][key];
		},
		
		ownKeys( target, )
		{
			return Object.keys( target[CHILDREN], );
		},
		
		getOwnPropertyDescriptor( target, key, )
		{
			return Object.getOwnPropertyDescriptor( target[CHILDREN], key, );
		},
		
		getOwnPropertyDescriptors( target, )
		{
			return Object.getOwnPropertyDescriptors( target[CHILDREN], );
		},
	}, );
}

export default class Model
{
	constructor( value, name='', )
	{
		if( value instanceof Model )
		{
			value[NAME]= name;
			
			return value;
		}
		
		let target;
		
		if( Array.isArray( value, ) )
		{
			Object.setPrototypeOf( target= [], ArrayModel.prototype, );
		}
		else
			target= this
		
		target[CHILDREN]= {};
		target[OBSERVERS]= [];
		target[DEPENDENCIES]= [];
		target[NAME]= name;
		target[ORIGIN]= target;
		
		if( Array.isArray( value, ) )
		{
			target[CHILDREN]= value.map( x=> new Model( x, `${name}[]`, ), );
		}
		else
		if( value && value.constructor === Object )
		{
			for( let key in value )
			{
				target[CHILDREN][key]= new Model( value[key], `${name}.${key}`, );
			}
			
			target[VALUE]= OBJECT_VALUE;
		}
		else
		{
			target[VALUE]= value;
		}
		
		return makeProxy( target, );
	}
	
	setValue( value, )
	{
		if( value instanceof Promise )
		{
			if( value.temp !== undefined )
				this.setValue( value.temp, );
			
			value.then(
				x=> this.setValue( x, ),
				e=> this.setValue( value.rejected, ),
			);
		}
		else
		if( value instanceof Function )
		{
			this.setValue( value(), );
		}
		else
		if( value instanceof Model )
		{
			const originValue= this.valueOf();
			
			this[VALUE]= value[VALUE];
			Object.assign( this, value[CHILDREN], );
			
			this[EMIT]( this.valueOf(), originValue, );
		}
		else
		if( value && value.constructor === Object )
		{
			const originValue= this.valueOf();
			
			if( originValue instanceof Object && value!==null )
				for( let i in originValue )
					if(!( i in value ))
						value[i]= undefined;
			
			Object.assign( this, value, );
			
			this[VALUE]= OBJECT_VALUE;
			
			this[EMIT]( value, originValue, );
		}
		else
		{
			this[SET_VALUE]( value, );
		}
	}
	
	[SET_VALUE]( value, )
	{
		if( value === this[ORIGIN][VALUE] ) return;
		
		const originValue= this[ORIGIN][VALUE];
		
		this[ORIGIN][VALUE]= value;
		
		this[EMIT]( value, originValue, );
	}
	
	[EMIT]( value, originValue, )
	{
		this[ORIGIN][OBSERVERS].forEach( listener=> listener( value, originValue, ), );
		this[ORIGIN][DEPENDENCIES].forEach( dependency=> rippling.has( dependency.model, ) || rippling.set( dependency.model, dependency.callback, ), );
		this[ORIGIN][DEPENDENCIES].forEach( dependency=> {
			if( rippling.has( dependency.model, ) )
			{
				dependency.model.setValue( dependency.callback(), );
				rippling.delete( dependency.model, );
			}
		}, );
	}
	
	valueOf()
	{
		if( this[ORIGIN][VALUE] === OBJECT_VALUE )
			return Object.map( this[ORIGIN][CHILDREN], ( k, v )=> v.valueOf(), );
		else
			return this[ORIGIN][VALUE];
	}
	
	get isObject()
	{
		return this[ORIGIN][VALUE] === OBJECT_VALUE;
	}
	
	get id()
	{
		return this[ID];
	}
	
	get name()
	{
		return this[NAME];
	}
	
	toString()
	{
		return `${this.valueOf()}`;
	}
	
	[Symbol.toPrimitive]( hint, )
	{
		switch( hint )
		{
			case "number":
				return +this[ORIGIN][VALUE];
			case "string":
				return this.toString();
			case "default":
			default:
				return this[ORIGIN][VALUE];
		}
	}
	
	get [Symbol.toStringTag]()
	{
		return 'Model';
	}
	
	observedBy( observer, needInit=true, )
	{
		this[ORIGIN][OBSERVERS].push( observer, );
		
		if( needInit )
			this[INIT_OBSERVER]( observer, );
	}
	
	[INIT_OBSERVER]( observer, )
	{
		observer( this.valueOf(), undefined, );
	}
	
	express( callback, )
	{
		return Model.express( callback, this, );
	}
	
	static express( callback, ...models )
	{
		const expression= new Model(
			callback( ...models.map( x=> x instanceof Model ? x.valueOf() : x, ), ),
			`expressionOf( ${models.map( x=> x instanceof Model ? x[NAME] : x, ).join( ', ', )}, )`,
		);
		
		models.forEach(
			model=> (
				model instanceof Model &&
				model[DEPENDENCIES].push( {
					model: expression,
					callback: ()=> callback( ...models.map( x=> x instanceof Model? x.valueOf() : x, ), ),
				}, )
			),
		);
		
		return expression;
	}
	
	$( callback, )
	{
		return Model.express( callback, this, );
	}
	
	static $( ...args )
	{
		return Model.express( ...args, );
	}
}

export class ArrayModel extends Model
{
	constructor( value, )
	{
		super( [], );
		
		this.setValue( value, );
	}
	
	map( ...args )
	{
		return this[ORIGIN][CHILDREN].map( ...args, );
	}
	
	forEach( ...args )
	{
		return this[ORIGIN][CHILDREN].forEach( ...args, );
	}
	
	reduce( ...args )
	{
		return this[ORIGIN][CHILDREN].reduce( ...args, );
	}
	
	entries()
	{
		return this[ORIGIN][CHILDREN].entries();
	}
	
	*[Symbol.iterator]()
	{
		for( let x of this[ORIGIN][CHILDREN] )
			yield x;
	}
	
	push( ...children )
	{
		this.splice( this[ORIGIN][CHILDREN].length, 0, ...children, );
		
		return this.length;
	}
	
	unshift( ...children )
	{
		this.splice( 0, 0, ...children, );
		
		return this.length;
	}
	
	join( delimiter, )
	{
		const joined= new Model( this.valueOf().join( delimiter, ), );
		
		this.observedBy( ()=> joined.setValue( this.valueOf().join( delimiter, ), ), );
		
		return joined;
	}
	
	pop()
	{
		const poped= this[ORIGIN][CHILDREN].pop();
		
		this.length.setValue( this[ORIGIN][CHILDREN].length - 1, );
		
		this[EMIT]( this[ORIGIN][CHILDREN].length, null, poped, );
		
		return poped;
	}
	
	shift()
	{
		const shifted= this[ORIGIN][CHILDREN].shift();
		
		this.length.setValue( this[ORIGIN][CHILDREN].length, );
		
		this[EMIT]( 0, null, shifted, );
		
		return shifted;
	}
	
	splice( start, count, ...inserted )
	{
		let removed= []
		
		inserted= inserted.map( x=> new Model( x, `${this[NAME]}[]`, ), );
		
		if( count > 0 )
		{
			removed= this[ORIGIN][CHILDREN].splice( start, count, );
			
			removed.forEach( x=> this[EMIT]( start, null, x, ), );
		}
		
		this[ORIGIN][CHILDREN].splice( start, 0, ...inserted, );
		
		inserted.map( ( x, i, )=> this[EMIT]( start- -i, x, ), );
		
		this.length.setValue( this[ORIGIN][CHILDREN].length, );
		
		return removed;
	}
	
	find( finder, )
	{
		const m= new Model( this[CHILDREN].find( finder, ), `findFrom( ${this[NAME]}, )`, );
		
		this.observedBy( ( index, model, )=> {
			if( model && finder( model, ) )
				m.setValue( model, );
		}, );
		
		return m;
	}
	
	findIndex( finder, )
	{
		const m= new Model( this[CHILDREN].findIndex( finder, ), `findIndexFrom( ${this[NAME]}, )`, );
		
		this.observedBy( ( index, model, )=> {
			if( model && finder( model, ) )
				m.setValue( index, );
		}, );
		
		return m;
	}
	
	includes( value, )
	{
		if( value instanceof Model )
			return this.findIndex( x=> x===value, ).$( x=> x>=0, );
		else
			return this.findIndex( x=> x.valueOf()===value, ).$( x=> x>=0, );
	}
	
	currentlyIncludes( value, )
	{
		if( value instanceof Model )
			return this[CHILDREN].includes( value, );
		else
			return this[CHILDREN].findIndex( x=> x.valueOf()===value, );
	}
	
	reverse()
	{
		for( let l= this[ORIGIN][CHILDREN].length, i= 0; i < l; ++i )
			this.splice( i, 0, this.pop(), );
		
		return this;
	}
	
	sort( comparer, )
	{
		this[SET_VALUE]( this[ORIGIN][CHILDREN].concat().sort( comparer, ), );
	}
	
	remove( ...children )
	{
		children.forEach( x=> {
			const index= this[ORIGIN][CHILDREN].indexOf( x, );
			
			if( index >= 0 )
				this.splice( index, 1, );
		} );
	}
	
	get length()
	{
		return this[LENGTH]||(this[LENGTH]= new Model( this[ORIGIN][CHILDREN].length, `${this[NAME]}.length`, ));
	}
	
	valueOf()
	{
		return this[ORIGIN][CHILDREN].map( x=> x.valueOf(), );
	}
	
	[SET_VALUE]( value, )
	{
		if(!( Array.isArray( value, ) ))
			throw 'The value of ArrayModel must be as array.';
		
		let orgI= 0, newI= 0, pairedI= 0;
		while( orgI < this[ORIGIN][CHILDREN].length )
			if( newI >= value.length )
				// new value run out, cut tail of original items.
				this[ORIGIN][CHILDREN].splice( orgI, ).forEach( x=> this[EMIT]( orgI, null, x, ), );
			else
			if( this[ORIGIN][CHILDREN][orgI] === value[newI] )
				// paired, go next;
				++orgI, ++newI;
			else
			if( 0 <= (pairedI= value.indexOf( this[ORIGIN][CHILDREN][orgI].valueOf(), newI, )) )
			{
				// find next pair, insert middle new items;
				const items= value.slice( newI, pairedI, ).map( x=> new Model( x, `${this[NAME]}`, ), );
				
				this[ORIGIN][CHILDREN].splice( orgI, 0, ...items, );
				items.forEach( ( x, ii, )=> this[EMIT]( orgI- -ii, x, ), );
				
				orgI-= newI - 1 - pairedI;
				newI= pairedI - - 1;
			}
			else
			{
				// no pair any more, remove current original item;
				const [ removed, ]= this[ORIGIN][CHILDREN].splice( orgI, 1, );
				this[EMIT]( orgI, null, removed, );
			}
		
		if( newI < value.length )
		{
			// insert remain new items.
			const items= value.slice( newI, ).map( x=> new Model( x, `${this[NAME]}`, ), );
			
			this[ORIGIN][CHILDREN].push( ...items, );
			items.forEach( ( x, ii )=> this[EMIT]( orgI- -ii, x, ), );
		}
		
		this.length.setValue( this[ORIGIN][CHILDREN].length, );
	}
	
	[EMIT]( index, model, removed=null, )
	{
		this[ORIGIN][OBSERVERS].forEach( listener=> listener( index, model, removed, ), );
		
		return model;
	}
	
	[INIT_OBSERVER]( observer, )
	{
		this[ORIGIN][CHILDREN].forEach( ( model, index, )=> observer( index, model, null, ), );
	}
}

export const $= Model.$
