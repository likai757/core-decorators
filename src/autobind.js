import { decorate } from './private/utils';

function bind(fn, context) {
  if (fn.bind) {
    return fn.bind(context);
  } else {
    return function __autobind__() {
      return fn.apply(context, arguments);
    };
  }
}

let mapStore;

function getBoundSuper(obj, fn) {
  if (typeof WeakMap === 'undefined') {
    throw new Error(
      `Using @autobind on ${fn.name}() requires WeakMap support due to its use of super.${fn.name}()
      See https://github.com/jayphelps/core-decorators.js/issues/20`
    );
  }

  if (!mapStore) {
     mapStore = new WeakMap();
  }

  if (mapStore.has(obj) === false) {
    mapStore.set(obj, new WeakMap());
  }

  const superStore = mapStore.get(obj);

  if (superStore.has(fn) === false) {
    superStore.set(fn, bind(fn, obj));
  }

  return superStore.get(fn);
}

function handleDescriptor(target, key, { value: fn }) {
  if (typeof fn !== 'function') {
    throw new SyntaxError(`@autobind can only be used on functions, not: ${fn}`);
  }

  const { constructor } = target;

  return {
    configurable: true,
    enumerable: false,

    get() {
      // This happens if someone accesses the
      // property directly on the prototype
      if (this === target) {
        return fn;
      }

      // This is a confusing case where you have an autobound method calling
      // super.sameMethod() which is also autobound and so on.
      if (this.constructor !== constructor && this.constructor.prototype.hasOwnProperty(key)) {
        return getBoundSuper(this, fn);
      }

      const boundFn = bind(fn, this);

      Object.defineProperty(this, key, {
        configurable: true,
        writable: true,
        // NOT enumerable when it's a bound method
        enumerable: false,
        value: boundFn
      });

      return boundFn;
    },
    set(newValue) {
      Object.defineProperty(this, key, {
        configurable: true,
        writable: true,
        // IS enumerable when reassigned by the outside word
        enumerable: true,
        value: newValue
      });
    }
  };
}

export default function autobind(...args) {
  return decorate(handleDescriptor, args);
}
