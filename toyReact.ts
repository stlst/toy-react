//  使用symbol定义private field
const RENDER_TO_DOM = Symbol("render to dom");

export class Component {
  render(): any {
    throw new Error("Method not implemented.");
  }
  public props;
  public children;
  private _root;
  public _range: Range;
  public state;
  private _vdom;
  public vChildren;

  constructor(props) {
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

  get vdom() {
    return this.render().vdom; //递归调用
  }

  // 这里的render to dom 是symble
  [RENDER_TO_DOM](range: Range) {
    // 传一个位置过来,把内容插入到range里
    this._range = range;
    this._vdom = this.vdom;
    this._vdom[RENDER_TO_DOM](range);
  }

  update() {
    // 进行vdom对比

    // 1. 根节点对比
    const isSameNode = (oldNode, newNode) => {
      if (oldNode.type !== newNode.type) {
        return false;
      }
      for (let name in newNode.props) {
        if (newNode.props[name] !== oldNode.props[name]) {
          // 属性值不一致，则认为他们不同
          return false;
        }
      }
      if (
        Object.keys(oldNode.props).length > Object.keys(newNode.props).length
      ) {
        // 属性的数量不同
        return false;
      }
      if (newNode.type === "#text") {
        if (newNode.content !== oldNode.content) {
          // 文本节点的内容不同
          return false;
        }
      }
      return true;
    };
    const update = (oldNode: Component, newNode: Component) => {
      // 对比他们的type，如果不同则完全重新重新渲染就可以
      // props，可以给props打patch
      // 如果根节点的type和props都一直的话，才会认为根节点一样，才会去看子节点是否需要更新
      // 如果type是#text时，需要对比content
      if (!isSameNode(oldNode, newNode)) {
        // 进行一个覆盖，完全的全新渲染
        newNode[RENDER_TO_DOM](oldNode._range);
        return;
      }
      // isSameNode
      newNode._range = oldNode._range;

      let newChildren = newNode.vChildren;
      let oldChildren = oldNode.vChildren;

      if (!newChildren || !newChildren.length) {
        return;
      }
      let tailRange: Range = oldChildren[oldChildren.length - 1]._range;

      for (let i = 0; i < newChildren.length; i++) {
        let newChild = newChildren[i];
        let oldChild = oldChildren[i];
        if (i < oldChildren.length) {
          update(oldChild, newChild);
        } else {
          let range = document.createRange();
          range.setStart(tailRange.endContainer, tailRange.endOffset);
          range.setEnd(tailRange.endContainer, tailRange.endOffset);
          newChild[RENDER_TO_DOM](range);
          tailRange = range;
        }
      }
    };
    let vdom = this.vdom;
    update(this._vdom, vdom);
    this._vdom = vdom; // 更新完之后替换成新vdom
  }

  setState(newState) {
    // typeof null 也是个object,所以判断的时候需要注意
    if (this.state === null || typeof this.state !== "object") {
      this.state = newState;
      this.update();
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
    this.update();
  }
}

class ElementWrapper extends Component {
  public type: string;
  constructor(type) {
    super(type);
    this.type = type;
  }

  get vdom() {
    this.vChildren = this.children.map((child) => child.vdom);
    return this;
  }

  [RENDER_TO_DOM](range: Range) {
    this._range = range;

    let root = document.createElement(this.type);
    for (let name in this.props) {
      const value = this.props[name];
      if (name.match(/^on([\s\S]+)/)) {
        // \s\S表示所有非空字符
        root.addEventListener(
          RegExp.$1.replace(/^[\s\S]/, (c) => c.toLowerCase()),
          value
        ); // 兼容驼峰命名
      } else if (name === "className") {
        root.setAttribute("class", value);
      } else {
        root.setAttribute(name, value);
      }
    }

    if (!this.vChildren) {
      // 确保vChildren不为空
      this.vChildren = this.children.map((child) => child.vdom);
    }

    for (let child of this.vChildren) {
      let childRange = document.createRange();
      childRange.setStart(root, root.childNodes.length);
      childRange.setEnd(root, root.childNodes.length);
      child[RENDER_TO_DOM](childRange);
    }

    replaceContent(range, root);
  }
}

class TextWrapper extends Component {
  public content: string;
  public type: string = "#text";
  constructor(content: string) {
    super(content);
    this.content = content;
  }
  get vdom() {
    return this;
  }
  [RENDER_TO_DOM](range: Range) {
    this._range = range;
    let root = document.createTextNode(this.content);
    replaceContent(range, root);
  }
}

export const createElement = (type, attributes, ...children) => {
  let e: ElementWrapper | HTMLElement;
  if (typeof type === "string") {
    e = new ElementWrapper(type);
  } else {
    e = new type(); // 这里的type其实就是Component
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

const replaceContent = (range: Range, node) => {
  range.insertNode(node);
  range.setStartAfter(node); // 把range 挪到range之后
  range.deleteContents(); // 把range里面的内容删掉
  // 删完之后，range不对了，所以要把range设置回来
  range.setStartBefore(node);
  range.setEndAfter(node);
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
