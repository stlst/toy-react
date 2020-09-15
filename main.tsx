import { Component, render } from "./toyReact";

class MyComponent extends Component {
  [x: string]: any;
  render() {
    return (
      <div>
        <h1>my component</h1>
        {this.children}
      </div>
    );
  }
}

render(
  <MyComponent id="a" class="c">
    <div>abc</div>
    <div>i</div>
    <div></div>
    <div></div>
  </MyComponent>,
  document.body
);
