//  使用symbol定义private field
const RENDER_TO_DOM = Symbol("render to dom");

class ElementWrapper {
  public root: HTMLElement;
  constructor(type) {
    this.root = document.createElement(type);
  }
  setAttribute(name: string, value) {
    if (name.match(/^on([\s\S]+)/)) {
      // \s\S表示所有非空字符
      this.root.addEventListener(
        RegExp.$1.replace(/^[\s\S]/, (c) => c.toLowerCase()),
        value
      ); // 兼容驼峰命名
    } else if (name === "className") {
      this.root.setAttribute("class", value);
    } else {
      this.root.setAttribute(name, value);
    }
  }
  appendChild(component) {
    let range = document.createRange();
    range.setStart(this.root, this.root.childNodes.length);
    range.setEnd(this.root, this.root.childNodes.length);
    component[RENDER_TO_DOM](range);
  }

  [RENDER_TO_DOM](range: Range) {
    range.deleteContents();
    range.insertNode(this.root);
  }
}

class TextWrapper {
  public root: Text;
  constructor(content: string) {
    this.root = document.createTextNode(content);
  }
  [RENDER_TO_DOM](range: Range) {
    range.deleteContents();
    range.insertNode(this.root);
  }
}

export class Component {
  render(): any {
    throw new Error("Method not implemented.");
  }
  public props;
  public children;
  private _root;
  private _range: Range;
  public state;

  constructor() {
    this.props = Object.create(null);
    this.children = [];
    this._root = null;
    this._range = (null as unknown) as Range;
  }
  setAttribute(name, value) {
    this.props[name] = value;
  }
  appendChild(component) {
    this.children.push(component);
  }
  // 这里的render to dom 是symble
  [RENDER_TO_DOM](range: Range) {
    // 传一个位置过来,把内容插入到range里
    this._range = range;
    this.render()[RENDER_TO_DOM](range);
  }

  rerender() {
    // 在RENDER_TO_DOM里面会改this._range的值，所以需要先把老的range保存起来
    const oldRange = this._range;
    // 需要保证该range不为空，否则下一个会被它吞进去
    // 因此应该先插入然后再删除

    let range = document.createRange();
    // range 的起点和终点是一样的
    range.setStart(oldRange.startContainer, oldRange.startOffset);
    range.setEnd(oldRange.startContainer, oldRange.startOffset);
    this[RENDER_TO_DOM](range); // 完成插入

    // 重设oldRange的起点，把oldRange的start挪到插入的内容之后
    oldRange.setStart(range.endContainer, range.endOffset);
    oldRange.deleteContents(); // 再把它内容删除
  }

  setState(newState) {
    // typeof null 也是个object,所以判断的时候需要注意
    if (this.state === null || typeof this.state !== "object") {
      this.state = newState;
      this.rerender();
      return;
    }
    const merge = (oldState, newState) => {
      for (let p in newState) {
        if (oldState[p] === null || typeof oldState[p] !== "object") {
          oldState[p] = newState[p]; // 如果OldState的p属性为空，则直接把newState[p]抄写过去
        } else {
          merge(oldState[p], newState[p]); // 递归调用merge
        }
      }
    };
    merge(this.state, newState);
    this.rerender();
  }
}

export const createElement = (type, attributes, ...children) => {
  let e: ElementWrapper | HTMLElement;
  if (typeof type === "string") {
    e = new ElementWrapper(type);
  } else {
    e = new type(); // 这里的type其实就是Component
    console.log("type", type, e);
  }
  for (let p in attributes) {
    e.setAttribute(p, attributes[p]);
  }
  let insertChildren = (children) => {
    for (let child of children) {
      if (typeof child === "string") {
        child = new TextWrapper(child);
      }
      if (child === null) {
        continue;
      }
      if (typeof child === "object" && child instanceof Array) {
        insertChildren(child);
      } else {
        e.appendChild(child);
      }
    }
  };
  insertChildren(children);
  return e;
};

(window as any).createElement = createElement;

export const render = (component: Component, parentElement: HTMLElement) => {
  let range = document.createRange();
  range.setStart(parentElement, 0);
  // 这里不能用children, 而使用childNodes， 因为这里可能会有文本节点和注释节点
  range.setEnd(parentElement, parentElement.childNodes.length);
  range.deleteContents();
  component[RENDER_TO_DOM](range);
};
