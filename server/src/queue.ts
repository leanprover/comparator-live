export class Queue<T> {
  private _front: T[] = [];
  private _back: T[] = [];
  enq(item: T) {
    this._back.push(item);
  }
  deq(): T | null {
    if (this._front.length === 0) {
      while (this._back.length > 0) {
        this._front.push(this._back.pop()!);
      }
    }
    if (this._front.length === 0) return null;
    return this._front.pop()!;
  }
  get length() {
    return this._back.length + this._front.length;
  }

  [Symbol.iterator]() {
    let index = this._front.length;

    return {
      next: () => {
        const value = index > 0 ? this._front[index - 1] : this._back[-index];
        index--;
        return { value, done: -index > this._back.length };
      },
    };
  }
}
