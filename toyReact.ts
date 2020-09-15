class ElementWrapper {
  public root: HTMLElement;
  constructor(type) {
    this.root = document.createElement(type);
  }
  setAttribute(name, value) {
    this.root.setAttribute(name, value);
  }
  appendChild(component) {
    this.root.appendChild(component.root);
  }
}

class TextWrapper {
  public root: Text;
  constructor(content: string) {
    this.root = document.createTextNode(content);
  }
}

export class Component {
  render(): any {
    throw new Error("Method not implemented.");
  }
  public props;
  public children;
  private _root;
  //   public render;

  constructor() {
    this.props = Object.create(null);
    this.children = [];
    this._root = null;
  }
  setAttribute(name, value) {
    this.props[name] = value;
  }
  appendChild(component) {
    this.children.push(component);
  }
  get root() {
    if (!this._root) {
      this._root = this.render().root;
    }
    return this._root;
  }
}

export const createElement = (type, attributes, ...children) => {
  let e: ElementWrapper | HTMLElement;
  if (typeof type === "string") {
    e = new ElementWrapper(type);
  } else {
    e = new type(); // ???
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
  parentElement.appendChild(component.root);
};
