const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
module.exports = {
  entry: {
    main: "./main.tsx",
  },
  mode: "development",
  optimization: {
    minimize: false,
  },
  devServer: {
    contentBase: path.join(__dirname, "dist"),
    liveReload: true,
    compress: true,
    port: 8888,
    open: true,
  },
  resolve: {
    extensions: [".wasm", ".ts", ".tsx", ".mjs", ".cjs", ".js", ".json"],
    // modules: [
    //     path.resolve(__dirname, "src"),
    //     path.resolve(__dirname, "node_modules")
    // ],
    modules: [
      // 优化模块查找路径
      path.resolve("src"),
      path.resolve("node_modules"),
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: path.resolve(__dirname, "index.html"),
      chunks: ["main"],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(js|ts|jsx|tsx)$/,
        exclude: ["/node_modules/"],
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
            // 修改transform之后的名字
            plugins: [
              [
                "@babel/plugin-transform-react-jsx",
                {
                  pragma: "createElement",
                },
              ],
            ],
          },
        },
      },
      {
        test: /\.(ts|tsx)$/,
        use: "ts-loader",
      },
    ],
  },
};
