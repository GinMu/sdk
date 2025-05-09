import { panic } from './error';

/**
 * Asserts that a condition is true; otherwise, throws an error using the panic function.
 * @param {boolean} cond - The condition to check.
 * @param {function | string | Error} error - The error message, function returning an error, or an Error object to throw.
 */
export const assert = (cond, error) => {
  if (!cond) {
    panic(error);
  }
};

/**
 * Error thrown when the provided function was executed more than once or wasn't executed at all.
 */
export class MustBeCalledOnce extends Error {
  constructor(fn) {
    super(`Function must be executed exactly once: \`${fn}\``);
  }

  static ensure(fn, call) {
    let executed = false;

    const name = `mustBeExecutedOnce(${fn.name})`;
    const obj = {
      [name](...args) {
        let res;
        let err;

        assert(!executed, () => new this(fn));
        try {
          res = fn.apply(this, args);
        } catch (e) {
          err = e;
        } finally {
          executed = true;
        }

        if (err != null) {
          throw err;
        }
        return res;
      },
    };

    const res = call(obj[name]);
    assert(executed, () => new this(fn));

    return res;
  }
}
